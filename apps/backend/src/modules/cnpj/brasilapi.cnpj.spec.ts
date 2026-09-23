import { Logger } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { DomainError } from '@br-data-hub/shared';
import { BrasilApiCnpjProvider, BrasilApiCnpjResponse } from './brasilapi.cnpj';

// Recorte real de GET /api/cnpj/v1/19131243000197, com campos opcionais preenchidos.
const OKBR_RESPONSE: BrasilApiCnpjResponse = {
  uf: 'SP',
  cep: '01311902',
  qsa: [
    {
      pais: null,
      nome_socio: 'HAYDEE SVAB',
      codigo_pais: null,
      faixa_etaria: 'Entre 41 a 50 anos',
      cnpj_cpf_do_socio: '***112108**',
      qualificacao_socio: 'Presidente',
      codigo_faixa_etaria: 5,
      data_entrada_sociedade: '2024-02-27',
      identificador_de_socio: 2,
      cpf_representante_legal: '***000000**',
      nome_representante_legal: '',
      codigo_qualificacao_socio: 16,
      qualificacao_representante_legal: 'Não informada',
      codigo_qualificacao_representante_legal: 0,
    },
  ],
  cnpj: '19131243000197',
  pais: null,
  email: null,
  porte: 'DEMAIS',
  bairro: 'BELA VISTA',
  numero: '37',
  ddd_fax: '',
  municipio: 'SAO PAULO',
  logradouro: 'PAULISTA 37',
  cnae_fiscal: 9430800,
  codigo_pais: null,
  complemento: 'ANDAR 4',
  codigo_porte: 5,
  razao_social: 'OPEN KNOWLEDGE BRASIL',
  nome_fantasia: 'REDE PELO CONHECIMENTO LIVRE',
  capital_social: 0,
  ddd_telefone_1: '1123851939',
  ddd_telefone_2: '',
  opcao_pelo_mei: null,
  codigo_municipio: 7107,
  cnaes_secundarios: [
    {
      codigo: 9493600,
      descricao:
        'Atividades de organizações associativas ligadas à cultura e à arte',
    },
  ],
  natureza_juridica: 'Associação Privada',
  regime_tributario: [
    {
      ano: 2024,
      cnpj_da_scp: null,
      forma_de_tributacao: 'IMUNE DE IRPJ',
      quantidade_de_escrituracoes: 1,
    },
  ],
  situacao_especial: '',
  opcao_pelo_simples: null,
  situacao_cadastral: 2,
  data_opcao_pelo_mei: null,
  data_exclusao_do_mei: null,
  cnae_fiscal_descricao:
    'Atividades de associações de defesa de direitos sociais',
  codigo_municipio_ibge: 3550308,
  data_inicio_atividade: '2013-10-03',
  data_situacao_especial: null,
  data_opcao_pelo_simples: null,
  data_situacao_cadastral: '2013-10-03',
  nome_cidade_no_exterior: '',
  codigo_natureza_juridica: 3999,
  data_exclusao_do_simples: null,
  motivo_situacao_cadastral: 0,
  ente_federativo_responsavel: '',
  identificador_matriz_filial: 1,
  qualificacao_do_responsavel: 16,
  descricao_situacao_cadastral: 'ATIVA',
  descricao_tipo_de_logradouro: 'AVENIDA',
  descricao_motivo_situacao_cadastral: 'SEM MOTIVO',
  descricao_identificador_matriz_filial: 'MATRIZ',
};

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

const ORIGINAL_BASE_URL = process.env.BRASILAPI_BASE_URL;

async function createProvider(
  baseUrl?: string,
): Promise<BrasilApiCnpjProvider> {
  if (baseUrl === undefined) {
    delete process.env.BRASILAPI_BASE_URL;
  } else {
    process.env.BRASILAPI_BASE_URL = baseUrl;
  }

  const moduleRef: TestingModule = await Test.createTestingModule({
    providers: [BrasilApiCnpjProvider],
  }).compile();

  return moduleRef.get(BrasilApiCnpjProvider);
}

async function captureError(promise: Promise<unknown>): Promise<DomainError> {
  return promise.then(
    () => {
      throw new Error('era esperado um erro');
    },
    (error: unknown) => error as DomainError,
  );
}

describe('BrasilApiCnpjProvider', () => {
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
      delete process.env.BRASILAPI_BASE_URL;
    } else {
      process.env.BRASILAPI_BASE_URL = ORIGINAL_BASE_URL;
    }
  });

  describe('consulta', () => {
    it('chama o endpoint padrao com o cnpj sem mascara', async () => {
      fetchMock.mockResolvedValue(jsonResponse(OKBR_RESPONSE));
      const provider = await createProvider();

      await provider.findByCnpj('19.131.243/0001-97');

      expect(fetchMock).toHaveBeenCalledTimes(1);

      const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];

      expect(url).toBe('https://brasilapi.com.br/api/cnpj/v1/19131243000197');
      // sem User-Agent próprio o Cloudflare da BrasilAPI responde 403 ao fetch do Node
      expect(init.headers).toEqual({
        Accept: 'application/json',
        'User-Agent': 'br-data-hub',
      });
      expect(init.signal).toBeInstanceOf(AbortSignal);
    });

    it('normaliza cnpj alfanumerico com minusculas, mascara e espacos', async () => {
      fetchMock.mockResolvedValue(jsonResponse({}, 404));
      const provider = await createProvider();

      await provider.findByCnpj('  12.abc.345/01de-35 ');

      expect(fetchMock.mock.calls[0][0]).toBe(
        'https://brasilapi.com.br/api/cnpj/v1/12ABC34501DE35',
      );
    });

    it('usa BRASILAPI_BASE_URL do ambiente, sem barras finais duplicadas', async () => {
      fetchMock.mockResolvedValue(jsonResponse(OKBR_RESPONSE));
      const provider = await createProvider(' http://localhost:9999/api/// ');

      await provider.findByCnpj('19131243000197');

      expect(fetchMock.mock.calls[0][0]).toBe(
        'http://localhost:9999/api/cnpj/v1/19131243000197',
      );
    });

    it('usa a url padrao quando BRASILAPI_BASE_URL estiver vazia', async () => {
      fetchMock.mockResolvedValue(jsonResponse(OKBR_RESPONSE));
      const provider = await createProvider('   ');

      await provider.findByCnpj('19131243000197');

      expect(fetchMock.mock.calls[0][0]).toBe(
        'https://brasilapi.com.br/api/cnpj/v1/19131243000197',
      );
    });
  });

  describe('mapeamento', () => {
    it('mapeia o json da BrasilAPI para os campos em ingles e camelCase', async () => {
      fetchMock.mockResolvedValue(jsonResponse(OKBR_RESPONSE));
      const provider = await createProvider();

      await expect(provider.findByCnpj('19131243000197')).resolves.toEqual({
        cnpj: '19131243000197',
        branchTypeCode: 1,
        branchTypeDescription: 'MATRIZ',
        legalName: 'OPEN KNOWLEDGE BRASIL',
        tradeName: 'REDE PELO CONHECIMENTO LIVRE',
        registrationStatusCode: 2,
        registrationStatusDescription: 'ATIVA',
        registrationStatusDate: '2013-10-03',
        registrationStatusReasonCode: 0,
        registrationStatusReasonDescription: 'SEM MOTIVO',
        foreignCityName: undefined,
        countryCode: undefined,
        countryName: undefined,
        legalNatureCode: 3999,
        legalNatureDescription: 'Associação Privada',
        activityStartDate: '2013-10-03',
        mainCnaeCode: '9430800',
        mainCnaeDescription:
          'Atividades de associações de defesa de direitos sociais',
        streetType: 'AVENIDA',
        street: 'PAULISTA 37',
        addressNumber: '37',
        complement: 'ANDAR 4',
        neighborhood: 'BELA VISTA',
        zipCode: '01311-902',
        stateCode: 'SP',
        city: 'SAO PAULO',
        siafiCode: '7107',
        ibgeCode: '3550308',
        primaryPhone: '1123851939',
        secondaryPhone: undefined,
        fax: undefined,
        email: undefined,
        responsibleQualificationCode: 16,
        shareCapital: 0,
        companySizeCode: 5,
        companySizeDescription: 'DEMAIS',
        simplesOption: undefined,
        simplesOptionDate: undefined,
        simplesExclusionDate: undefined,
        meiOption: undefined,
        meiOptionDate: undefined,
        meiExclusionDate: undefined,
        specialStatus: undefined,
        specialStatusDate: undefined,
        responsibleFederativeEntity: undefined,
        secondaryCnaes: [
          {
            code: '9493600',
            description:
              'Atividades de organizações associativas ligadas à cultura e à arte',
          },
        ],
        partners: [
          {
            typeCode: 2,
            name: 'HAYDEE SVAB',
            document: '***112108**',
            qualificationCode: 16,
            qualificationDescription: 'Presidente',
            joinedAt: '2024-02-27',
            countryCode: undefined,
            countryName: undefined,
            ageRangeCode: 5,
            ageRangeDescription: 'Entre 41 a 50 anos',
            legalRepresentativeDocument: '***000000**',
            legalRepresentativeName: undefined,
            legalRepresentativeQualificationCode: 0,
            legalRepresentativeQualificationDescription: 'Não informada',
          },
        ],
        taxRegimes: [
          {
            year: 2024,
            taxationForm: 'IMUNE DE IRPJ',
            scpCnpj: undefined,
            bookkeepingCount: 1,
          },
        ],
      });
    });

    it('mapeia booleanos, datas do simples/mei e campos de estabelecimento no exterior', async () => {
      fetchMock.mockResolvedValue(
        jsonResponse({
          ...OKBR_RESPONSE,
          cnpj: '12abc34501de35',
          uf: 'EX',
          nome_cidade_no_exterior: ' LISBOA ',
          codigo_pais: 607,
          pais: 'PORTUGAL',
          email: 'contato@empresa.pt',
          ddd_fax: '1123851941',
          opcao_pelo_simples: true,
          data_opcao_pelo_simples: '2014-01-01',
          data_exclusao_do_simples: '2015-01-01',
          opcao_pelo_mei: false,
          data_opcao_pelo_mei: '2016-01-01',
          data_exclusao_do_mei: '2017-01-01',
          situacao_especial: 'RECUPERACAO JUDICIAL',
          data_situacao_especial: '2018-01-01',
          ente_federativo_responsavel: 'UNIÃO',
        }),
      );
      const provider = await createProvider();

      const data = await provider.findByCnpj('12ABC34501DE35');

      expect(data).toMatchObject({
        cnpj: '12ABC34501DE35',
        stateCode: 'EX',
        foreignCityName: 'LISBOA',
        countryCode: 607,
        countryName: 'PORTUGAL',
        email: 'contato@empresa.pt',
        fax: '1123851941',
        simplesOption: true,
        simplesOptionDate: '2014-01-01',
        simplesExclusionDate: '2015-01-01',
        meiOption: false,
        meiOptionDate: '2016-01-01',
        meiExclusionDate: '2017-01-01',
        specialStatus: 'RECUPERACAO JUDICIAL',
        specialStatusDate: '2018-01-01',
        responsibleFederativeEntity: 'UNIÃO',
      });
    });

    it('preenche codigos com zeros a esquerda e formata o cep', async () => {
      fetchMock.mockResolvedValue(
        jsonResponse({
          ...OKBR_RESPONSE,
          cep: '01001-000',
          cnae_fiscal: 111301,
          codigo_municipio: '71',
          codigo_municipio_ibge: 0,
          cnaes_secundarios: [
            { codigo: 113000, descricao: ' Cultivo de cana ' },
          ],
        }),
      );
      const provider = await createProvider();

      const data = await provider.findByCnpj('19131243000197');

      expect(data).toMatchObject({
        zipCode: '01001-000',
        mainCnaeCode: '0111301',
        siafiCode: '0071',
        ibgeCode: undefined,
        secondaryCnaes: [{ code: '0113000', description: 'Cultivo de cana' }],
      });
    });

    it('mantem cep fora do padrao como veio, para a entidade reprovar depois', async () => {
      fetchMock.mockResolvedValue(
        jsonResponse({ ...OKBR_RESPONSE, cep: '1311-902' }),
      );
      const provider = await createProvider();

      const data = await provider.findByCnpj('19131243000197');

      expect(data?.zipCode).toBe('1311-902');
    });

    it('ignora o cnae secundario vazio e itens de lista que nao sao objetos', async () => {
      fetchMock.mockResolvedValue(
        jsonResponse({
          ...OKBR_RESPONSE,
          cnaes_secundarios: [{ codigo: 0, descricao: '' }, null],
          qsa: [null, 'socio'],
          regime_tributario: 'nenhum',
        }),
      );
      const provider = await createProvider();

      const data = await provider.findByCnpj('19131243000197');

      expect(data).toMatchObject({
        secondaryCnaes: [],
        partners: [],
        taxRegimes: [],
      });
    });

    it('usa vazio/NaN para obrigatorios ausentes (a entidade valida depois)', async () => {
      fetchMock.mockResolvedValue(
        jsonResponse({ qsa: [{}], regime_tributario: [{}] }),
      );
      const provider = await createProvider();

      const data = await provider.findByCnpj('19131243000197');

      expect(data).toMatchObject({
        cnpj: '',
        legalName: '',
        mainCnaeCode: '',
        stateCode: '',
        city: '',
        zipCode: undefined,
        tradeName: undefined,
        secondaryCnaes: [],
        partners: [{ name: '', document: undefined }],
        taxRegimes: [{ taxationForm: '', scpCnpj: undefined }],
      });
      expect(data?.branchTypeCode).toBeNaN();
      expect(data?.registrationStatusCode).toBeNaN();
      expect(data?.legalNatureCode).toBeNaN();
      expect(data?.shareCapital).toBeNaN();
      expect(data?.partners[0]!.typeCode).toBeNaN();
      expect(data?.partners[0]!.qualificationCode).toBeNaN();
      expect(data?.taxRegimes[0]!.year).toBeNaN();
    });
  });

  describe('cnpj inexistente', () => {
    it('retorna null quando a BrasilAPI responde 404', async () => {
      fetchMock.mockResolvedValue(
        jsonResponse(
          { message: 'CNPJ 04.252.011/0001-10 não encontrado.' },
          404,
        ),
      );
      const provider = await createProvider();

      await expect(provider.findByCnpj('04252011000110')).resolves.toBeNull();
      expect(loggerErrorMock).not.toHaveBeenCalled();
    });
  });

  describe('erros', () => {
    it.each([
      ['formato curto', '123'],
      ['digito verificador errado', '19131243000198'],
      ['letras nos digitos verificadores', '12ABC34501DEAB'],
      ['caractere especial', '12ABC34501D#35'],
      ['todos iguais', '11.111.111/1111-11'],
      ['vazio', ''],
      ['so mascara', ' ./- '],
      ['nao string', 19131243000197 as unknown as string],
    ])('lanca cnpj.invalid (400) sem chamar a API para %s', async (_, cnpj) => {
      const provider = await createProvider();

      const error = await captureError(provider.findByCnpj(cnpj));

      expect(error).toBeInstanceOf(DomainError);
      expect(error.message).toBe('cnpj.invalid');
      expect(error.statusCode).toBe(400);
      expect(fetchMock).not.toHaveBeenCalled();
    });

    it('lanca cnpj.provider.rate.limited (429) quando a BrasilAPI limita as requisicoes', async () => {
      const loggerWarnMock = jest
        .spyOn(Logger.prototype, 'warn')
        .mockImplementation(() => undefined);
      fetchMock.mockResolvedValue(jsonResponse({ message: 'too many' }, 429));
      const provider = await createProvider();

      const error = await captureError(provider.findByCnpj('19131243000197'));

      expect(error).toBeInstanceOf(DomainError);
      expect(error.message).toBe('cnpj.provider.rate.limited');
      expect(error.statusCode).toBe(429);
      expect(loggerErrorMock).not.toHaveBeenCalled();
      expect(loggerWarnMock).toHaveBeenCalledWith(
        'Limite de requisições da BrasilAPI atingido (https://brasilapi.com.br/api/cnpj/v1/19131243000197)',
      );
    });

    it.each([[400], [403], [500]])(
      'lanca cnpj.provider.failed (502) quando a BrasilAPI responde HTTP %p',
      async (status) => {
        fetchMock.mockResolvedValue(jsonResponse({ message: 'erro' }, status));
        const provider = await createProvider();

        const error = await captureError(provider.findByCnpj('19131243000197'));

        expect(error).toBeInstanceOf(DomainError);
        expect(error.message).toBe('cnpj.provider.failed');
        expect(error.statusCode).toBe(502);
        expect(loggerErrorMock).toHaveBeenCalledWith(
          `Falha ao consultar a BrasilAPI (https://brasilapi.com.br/api/cnpj/v1/19131243000197): HTTP ${status}`,
        );
      },
    );

    it('lanca cnpj.provider.failed (502) em falha de rede ou timeout', async () => {
      fetchMock.mockRejectedValue(new TypeError('fetch failed'));
      const provider = await createProvider();

      const error = await captureError(provider.findByCnpj('19131243000197'));

      expect(error.message).toBe('cnpj.provider.failed');
      expect(error.statusCode).toBe(502);
      expect(loggerErrorMock).toHaveBeenCalledWith(
        expect.stringContaining('fetch failed'),
      );
    });

    it('lanca cnpj.provider.failed (502) quando o corpo nao e json valido', async () => {
      fetchMock.mockResolvedValue(new Response('nao-e-json', { status: 200 }));
      const provider = await createProvider();

      const error = await captureError(provider.findByCnpj('19131243000197'));

      expect(error.message).toBe('cnpj.provider.failed');
      expect(error.statusCode).toBe(502);
    });

    it.each([
      ['null', null],
      ['lista', []],
      ['texto', 'ok'],
    ])(
      'lanca cnpj.provider.failed (502) quando o json nao e um objeto (%s)',
      async (_, body) => {
        fetchMock.mockResolvedValue(jsonResponse(body));
        const provider = await createProvider();

        const error = await captureError(provider.findByCnpj('19131243000197'));

        expect(error.statusCode).toBe(502);
        expect(loggerErrorMock).toHaveBeenCalledWith(
          expect.stringContaining('corpo da resposta não é um objeto json'),
        );
      },
    );

    it('registra no log erros que nao sao instancias de Error', async () => {
      fetchMock.mockRejectedValue('conexao recusada');
      const provider = await createProvider();

      const error = await captureError(provider.findByCnpj('19131243000197'));

      expect(error.statusCode).toBe(502);
      expect(loggerErrorMock).toHaveBeenCalledWith(
        'Falha ao consultar a BrasilAPI (https://brasilapi.com.br/api/cnpj/v1/19131243000197): conexao recusada',
      );
    });
  });
});
