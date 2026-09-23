import { Logger } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { DomainError } from '@br-data-hub/shared';
import { ViaCepProvider, ViaCepResponse } from './viacep.cep';

const SE_RESPONSE: ViaCepResponse = {
  cep: '01001-000',
  logradouro: 'Praça da Sé',
  complemento: 'lado ímpar',
  unidade: '',
  bairro: 'Sé',
  localidade: 'São Paulo',
  uf: 'SP',
  estado: 'São Paulo',
  regiao: 'Sudeste',
  ibge: '3550308',
  gia: '1004',
  ddd: '11',
  siafi: '7107',
};

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

const ORIGINAL_BASE_URL = process.env.VIACEP_BASE_URL;

async function createProvider(baseUrl?: string): Promise<ViaCepProvider> {
  if (baseUrl === undefined) {
    delete process.env.VIACEP_BASE_URL;
  } else {
    process.env.VIACEP_BASE_URL = baseUrl;
  }

  const moduleRef: TestingModule = await Test.createTestingModule({
    providers: [ViaCepProvider],
  }).compile();

  return moduleRef.get(ViaCepProvider);
}

async function captureError(promise: Promise<unknown>): Promise<DomainError> {
  return promise.then(
    () => {
      throw new Error('era esperado um erro');
    },
    (error: unknown) => error as DomainError,
  );
}

describe('ViaCepProvider', () => {
  let fetchMock: jest.SpyInstance;
  let loggerErrorMock: jest.SpyInstance;

  beforeEach(() => {
    fetchMock = jest.spyOn(global, 'fetch');
    loggerErrorMock = jest
      .spyOn(Logger.prototype, 'error')
      .mockImplementation(() => undefined);
  });

  afterEach(() => {
    jest.restoreAllMocks();

    if (ORIGINAL_BASE_URL === undefined) {
      delete process.env.VIACEP_BASE_URL;
    } else {
      process.env.VIACEP_BASE_URL = ORIGINAL_BASE_URL;
    }
  });

  describe('consulta', () => {
    it('chama o endpoint json padrao com o cep so com digitos', async () => {
      fetchMock.mockResolvedValue(jsonResponse(SE_RESPONSE));
      const provider = await createProvider();

      await provider.findByCep('01001-000');

      expect(fetchMock).toHaveBeenCalledTimes(1);

      const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];

      expect(url).toBe('https://viacep.com.br/ws/01001000/json/');
      expect(init.headers).toEqual({ Accept: 'application/json' });
      expect(init.signal).toBeInstanceOf(AbortSignal);
    });

    it('aceita cep sem hifen e com espacos nas pontas', async () => {
      fetchMock.mockResolvedValue(jsonResponse(SE_RESPONSE));
      const provider = await createProvider();

      await provider.findByCep('  01001000 ');

      expect(fetchMock.mock.calls[0][0]).toBe(
        'https://viacep.com.br/ws/01001000/json/',
      );
    });

    it('usa VIACEP_BASE_URL do ambiente, sem barras finais duplicadas', async () => {
      fetchMock.mockResolvedValue(jsonResponse(SE_RESPONSE));
      const provider = await createProvider(' http://localhost:9999/ws/// ');

      await provider.findByCep('01001-000');

      expect(fetchMock.mock.calls[0][0]).toBe(
        'http://localhost:9999/ws/01001000/json/',
      );
    });

    it('usa a url padrao quando VIACEP_BASE_URL estiver vazia', async () => {
      fetchMock.mockResolvedValue(jsonResponse(SE_RESPONSE));
      const provider = await createProvider('   ');

      await provider.findByCep('01001-000');

      expect(fetchMock.mock.calls[0][0]).toBe(
        'https://viacep.com.br/ws/01001000/json/',
      );
    });
  });

  describe('mapeamento', () => {
    it('mapeia o json da ViaCEP para os campos em ingles e camelCase', async () => {
      fetchMock.mockResolvedValue(jsonResponse(SE_RESPONSE));
      const provider = await createProvider();

      await expect(provider.findByCep('01001-000')).resolves.toEqual({
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
      });
    });

    it('converte strings vazias em undefined e remove espacos nas pontas', async () => {
      fetchMock.mockResolvedValue(
        jsonResponse({
          ...SE_RESPONSE,
          cep: ' 69900-970 ',
          logradouro: '   ',
          complemento: '',
          unidade: ' Agência ',
          bairro: '',
          localidade: ' Rio Branco ',
          gia: '',
        }),
      );
      const provider = await createProvider();

      const data = await provider.findByCep('69900-970');

      expect(data).toMatchObject({
        cep: '69900-970',
        street: undefined,
        complement: undefined,
        unit: 'Agência',
        neighborhood: undefined,
        city: 'Rio Branco',
        giaCode: undefined,
      });
    });

    it('usa string vazia para campos obrigatorios ausentes (a entidade valida depois)', async () => {
      fetchMock.mockResolvedValue(jsonResponse({}));
      const provider = await createProvider();

      await expect(provider.findByCep('01001-000')).resolves.toEqual({
        cep: '',
        street: undefined,
        complement: undefined,
        unit: undefined,
        neighborhood: undefined,
        city: '',
        stateCode: '',
        stateName: '',
        region: '',
        ibgeCode: '',
        giaCode: undefined,
        areaCode: '',
        siafiCode: '',
      });
    });
  });

  describe('cep inexistente', () => {
    it.each([['true'], [true]])(
      'retorna null quando a ViaCEP responde erro=%p',
      async (erro) => {
        fetchMock.mockResolvedValue(jsonResponse({ erro }));
        const provider = await createProvider();

        await expect(provider.findByCep('99999-999')).resolves.toBeNull();
        expect(loggerErrorMock).not.toHaveBeenCalled();
      },
    );
  });

  describe('erros', () => {
    it.each([
      ['formato curto', '123'],
      ['letras', 'abcde-fgh'],
      ['hifen fora do lugar', '0100-1000'],
      ['vazio', ''],
      ['nao string', undefined as unknown as string],
    ])('lanca cep.invalid (400) sem chamar a API para %s', async (_, cep) => {
      const provider = await createProvider();

      const error = await captureError(provider.findByCep(cep));

      expect(error).toBeInstanceOf(DomainError);
      expect(error.message).toBe('cep.invalid');
      expect(error.statusCode).toBe(400);
      expect(fetchMock).not.toHaveBeenCalled();
    });

    it('lanca cep.provider.failed (502) quando a ViaCEP responde HTTP nao-2xx', async () => {
      fetchMock.mockResolvedValue(
        new Response('<html>400</html>', { status: 400 }),
      );
      const provider = await createProvider();

      const error = await captureError(provider.findByCep('01001-000'));

      expect(error).toBeInstanceOf(DomainError);
      expect(error.message).toBe('cep.provider.failed');
      expect(error.statusCode).toBe(502);
      expect(loggerErrorMock).toHaveBeenCalledWith(
        'Falha ao consultar a ViaCEP (https://viacep.com.br/ws/01001000/json/): HTTP 400',
      );
    });

    it('lanca cep.provider.rate.limited (429) quando a ViaCEP limita as requisicoes', async () => {
      const loggerWarnMock = jest
        .spyOn(Logger.prototype, 'warn')
        .mockImplementation(() => undefined);
      fetchMock.mockResolvedValue(new Response('', { status: 429 }));
      const provider = await createProvider();

      const error = await captureError(provider.findByCep('01001-000'));

      expect(error).toBeInstanceOf(DomainError);
      expect(error.message).toBe('cep.provider.rate.limited');
      expect(error.statusCode).toBe(429);
      expect(loggerErrorMock).not.toHaveBeenCalled();
      expect(loggerWarnMock).toHaveBeenCalledWith(
        'Limite de requisições da ViaCEP atingido (https://viacep.com.br/ws/01001000/json/)',
      );
    });

    it('lanca cep.provider.failed (502) em falha de rede ou timeout', async () => {
      fetchMock.mockRejectedValue(new TypeError('fetch failed'));
      const provider = await createProvider();

      const error = await captureError(provider.findByCep('01001-000'));

      expect(error.message).toBe('cep.provider.failed');
      expect(error.statusCode).toBe(502);
      expect(loggerErrorMock).toHaveBeenCalledWith(
        expect.stringContaining('fetch failed'),
      );
    });

    it('lanca cep.provider.failed (502) quando o corpo nao e json valido', async () => {
      fetchMock.mockResolvedValue(new Response('nao-e-json', { status: 200 }));
      const provider = await createProvider();

      const error = await captureError(provider.findByCep('01001-000'));

      expect(error.message).toBe('cep.provider.failed');
      expect(error.statusCode).toBe(502);
    });

    it('registra no log erros que nao sao instancias de Error', async () => {
      fetchMock.mockRejectedValue('conexao recusada');
      const provider = await createProvider();

      const error = await captureError(provider.findByCep('01001-000'));

      expect(error.statusCode).toBe(502);
      expect(loggerErrorMock).toHaveBeenCalledWith(
        'Falha ao consultar a ViaCEP (https://viacep.com.br/ws/01001000/json/): conexao recusada',
      );
    });
  });
});
