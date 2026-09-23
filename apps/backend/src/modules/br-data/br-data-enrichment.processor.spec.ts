import { BrData } from '@br-data-hub/br-data';
import type { BrDataEnrichmentRequest } from '@br-data-hub/br-data';
import type { CepData } from '@br-data-hub/cep';
import { DomainError } from '@br-data-hub/shared';
import { UnrecoverableError } from 'bullmq';
import type { PrismaCepRepository } from '../cep/cep.prisma';
import type { ViaCepProvider } from '../cep/viacep.cep';
import type { BrasilApiCnpjProvider } from '../cnpj/brasilapi.cnpj';
import type { PrismaCnpjRepository } from '../cnpj/cnpj.prisma';
import {
  BrDataEnrichmentJob,
  BrDataEnrichmentProcessor,
  BrDataRateLimitedError,
} from './br-data-enrichment.processor';
import type { PrismaBrDataRepository } from './br-data.prisma';

const USER_ID = '550e8400-e29b-41d4-a716-446655440000';
const BR_DATA_ID = '7c9e6679-7425-40de-944b-e07fc1f90ae7';

const SE_CEP: CepData = {
  cep: '01001-000',
  street: 'Praça da Sé',
  complement: 'lado ímpar',
  unit: undefined,
  neighborhood: 'Sé',
  city: 'São Paulo',
  stateCode: 'SP',
  stateName: 'São Paulo',
  region: 'Sudeste',
  ibgeCode: '3550308',
  giaCode: '1004',
  areaCode: '11',
  siafiCode: '7107',
};

function job(
  request: Partial<BrDataEnrichmentRequest> = {},
  attemptsMade = 0,
  attempts = 3,
): BrDataEnrichmentJob {
  return {
    data: {
      brDataId: BR_DATA_ID,
      userId: USER_ID,
      source: 'cep',
      document: '01001-000',
      ...request,
    },
    attemptsMade,
    opts: { attempts },
  };
}

function setup() {
  const cepProvider = { findByCep: jest.fn().mockResolvedValue(SE_CEP) };
  const cepRepository = {
    findByCep: jest.fn().mockResolvedValue(null),
    create: jest.fn(),
    update: jest.fn(),
  };
  const cnpjProvider = { findByCnpj: jest.fn().mockResolvedValue(null) };
  const cnpjRepository = { findByCnpj: jest.fn(), create: jest.fn() };
  const brDataRepository = {
    findById: jest.fn().mockResolvedValue(
      new BrData({
        id: BR_DATA_ID,
        userId: USER_ID,
        cep: '01001-000',
        cepStatus: 'pending',
        cnpj: '19131243000197',
        cnpjStatus: 'pending',
      }),
    ),
    updateEnrichment: jest.fn(),
  };

  const processor = new BrDataEnrichmentProcessor(
    cepProvider as unknown as ViaCepProvider,
    cepRepository as unknown as PrismaCepRepository,
    cnpjProvider as unknown as BrasilApiCnpjProvider,
    cnpjRepository as unknown as PrismaCnpjRepository,
    brDataRepository as unknown as PrismaBrDataRepository,
  );

  return {
    processor,
    cepProvider,
    cepRepository,
    cnpjProvider,
    brDataRepository,
  };
}

describe('BrDataEnrichmentProcessor', () => {
  it('consulta a ViaCEP, persiste o cep e marca a fonte como concluida', async () => {
    const { processor, cepProvider, cepRepository, brDataRepository } = setup();

    await expect(processor.process(job())).resolves.toEqual({
      status: 'completed',
    });

    expect(cepProvider.findByCep).toHaveBeenCalledWith('01001-000');
    expect(cepRepository.create).toHaveBeenCalledTimes(1);
    expect(brDataRepository.updateEnrichment).toHaveBeenCalledWith(
      BR_DATA_ID,
      'cep',
      { status: 'completed', error: null },
    );
  });

  it('marca cnpj inexistente na BrasilAPI como not_found', async () => {
    const { processor, cnpjProvider, brDataRepository } = setup();

    await expect(
      processor.process(job({ source: 'cnpj', document: '19131243000197' })),
    ).resolves.toEqual({ status: 'not_found', error: 'cnpj.not.found' });

    expect(cnpjProvider.findByCnpj).toHaveBeenCalledWith('19131243000197');
    expect(brDataRepository.updateEnrichment).toHaveBeenCalledWith(
      BR_DATA_ID,
      'cnpj',
      { status: 'not_found', error: 'cnpj.not.found' },
    );
  });

  it('sinaliza rate-limit quando a fonte responde 429, sem gravar status', async () => {
    const { processor, cepProvider, brDataRepository } = setup();
    cepProvider.findByCep.mockRejectedValue(
      new DomainError('cep.provider.rate.limited', 429),
    );

    await expect(processor.process(job({}, 2))).rejects.toBeInstanceOf(
      BrDataRateLimitedError,
    );
    expect(brDataRepository.updateEnrichment).not.toHaveBeenCalled();
  });

  it('repassa falha transitoria para a fila tentar de novo', async () => {
    const { processor, cepProvider, brDataRepository } = setup();
    const failure = new DomainError('cep.provider.failed', 502);
    cepProvider.findByCep.mockRejectedValue(failure);

    await expect(processor.process(job({}, 1))).rejects.toBe(failure);
    expect(brDataRepository.updateEnrichment).not.toHaveBeenCalled();
  });

  it('marca como failed na ultima tentativa e encerra o job sem novo retry', async () => {
    const { processor, cepProvider, brDataRepository } = setup();
    cepProvider.findByCep.mockRejectedValue(
      new DomainError('cep.provider.failed', 502),
    );

    const error = await processor.process(job({}, 2)).catch((e: unknown) => e);

    expect(error).toBeInstanceOf(UnrecoverableError);
    expect((error as Error).message).toBe('cep.provider.failed');
    expect(brDataRepository.updateEnrichment).toHaveBeenCalledWith(
      BR_DATA_ID,
      'cep',
      { status: 'failed', error: 'cep.provider.failed' },
    );
  });

  it('marca como failed de imediato quando os dados da fonte sao invalidos', async () => {
    const { processor, cepProvider, brDataRepository } = setup();
    cepProvider.findByCep.mockResolvedValue({
      ...SE_CEP,
      stateCode: 'XX',
      ibgeCode: '1',
    });

    await expect(processor.process(job())).rejects.toBeInstanceOf(
      UnrecoverableError,
    );
    expect(brDataRepository.updateEnrichment).toHaveBeenCalledWith(
      BR_DATA_ID,
      'cep',
      { status: 'failed', error: 'cep.stateCode.uf,cep.ibgeCode.regex' },
    );
  });

  it('usa codigo generico para erro inesperado e trata job sem attempts como ultima tentativa', async () => {
    const { processor, cepRepository, brDataRepository } = setup();
    cepRepository.create.mockRejectedValue(new Error('conexao perdida'));

    const withoutAttempts = { ...job(), opts: {} };

    await expect(processor.process(withoutAttempts)).rejects.toBeInstanceOf(
      UnrecoverableError,
    );
    expect(brDataRepository.updateEnrichment).toHaveBeenCalledWith(
      BR_DATA_ID,
      'cep',
      { status: 'failed', error: 'br-data.enrichment.failed' },
    );
  });
});
