import { jest } from '@jest/globals';
import httpStatus from 'http-status';
import BrasilApiService from '../../../src/modules/cnpj/brasilapi.service.js';
import { CnpjConstants } from '../../../src/modules/cnpj/cnpj.constants.js';
import { CNPJ, brasilApiPayload, cnpjData } from '../../fixtures/cnpj.fixture.js';

const { ERROR } = CnpjConstants.MESSAGES;

const jsonResponse = (body, init = {}) => ({ ok: true, status: 200, json: async () => body, ...init });

let fetchMock;

beforeEach(() => {
    fetchMock = jest.spyOn(globalThis, 'fetch');
    delete process.env.BRASILAPI_BASE_URL;
    delete process.env.BRASILAPI_TIMEOUT_MS;
});

afterEach(() => {
    fetchMock.mockRestore();
});

const expectHttpError = async (promise, status, message) => {
    await expect(promise).rejects.toMatchObject({ status, message });
};

describe('# BrasilApiService - configuration', () => {
    it('should use the default base URL and timeout', () => {
        const service = new BrasilApiService();

        expect(service.baseUrl).toBe(CnpjConstants.BRASILAPI_DEFAULT_BASE_URL);
        expect(service.timeoutMs).toBe(CnpjConstants.BRASILAPI_DEFAULT_TIMEOUT_MS);
    });

    it('should read BRASILAPI_BASE_URL and BRASILAPI_TIMEOUT_MS from the environment', () => {
        process.env.BRASILAPI_BASE_URL = 'http://brasilapi.local/api/cnpj/v1/';
        process.env.BRASILAPI_TIMEOUT_MS = '1500';

        const service = new BrasilApiService();

        expect(service.baseUrl).toBe('http://brasilapi.local/api/cnpj/v1');
        expect(service.timeoutMs).toBe(1500);
    });

    it('should accept explicit options', () => {
        const service = new BrasilApiService({ baseUrl: 'http://custom/v1//', timeoutMs: 10 });

        expect(service.baseUrl).toBe('http://custom/v1');
        expect(service.timeoutMs).toBe(10);
    });
});

describe('# BrasilApiService - findByCnpj', () => {
    it('should request the CNPJ endpoint and map every field to the Cnpj model', async () => {
        fetchMock.mockResolvedValue(jsonResponse(brasilApiPayload));

        const result = await new BrasilApiService().findByCnpj(CNPJ);

        expect(result).toEqual(cnpjData);
        const [url, options] = fetchMock.mock.calls[0];
        expect(url).toBe(`https://brasilapi.com.br/api/cnpj/v1/${CNPJ}`);
        expect(options.headers).toEqual({ Accept: 'application/json', 'User-Agent': CnpjConstants.BRASILAPI_USER_AGENT });
        expect(options.signal).toBeInstanceOf(AbortSignal);
    });

    it('should map every value of a fully filled response', async () => {
        fetchMock.mockResolvedValue(jsonResponse({
            ...brasilApiPayload,
            situacao_especial: 'INTERVENCAO',
            data_situacao_especial: '2020-01-02',
            pais: 'ALEMANHA',
            codigo_pais: 23,
            nome_cidade_no_exterior: 'BERLIM',
            email: 'contact@example.com',
            ddd_telefone_2: '1122223333',
            ddd_fax: '1133334444',
            capital_social: 1500.75,
            ente_federativo_responsavel: 'UNIAO',
            opcao_pelo_simples: true,
            data_opcao_pelo_simples: '2010-01-01',
            data_exclusao_do_simples: '2011-01-01',
            opcao_pelo_mei: false,
            data_opcao_pelo_mei: '2012-01-01',
            data_exclusao_do_mei: '2013-01-01',
        }));

        const result = await new BrasilApiService().findByCnpj(CNPJ);

        expect(result).toMatchObject({
            specialStatus: 'INTERVENCAO',
            specialStatusDate: new Date('2020-01-02'),
            country: 'ALEMANHA',
            countryCode: 23,
            foreignCityName: 'BERLIM',
            email: 'contact@example.com',
            secondaryPhone: '1122223333',
            fax: '1133334444',
            shareCapital: 1500.75,
            responsibleFederativeEntity: 'UNIAO',
            optedForSimples: true,
            simplesOptionDate: new Date('2010-01-01'),
            simplesExclusionDate: new Date('2011-01-01'),
            optedForMei: false,
            meiOptionDate: new Date('2012-01-01'),
            meiExclusionDate: new Date('2013-01-01'),
        });
    });

    it('should store missing, blank or malformed values as null and missing lists as empty', async () => {
        fetchMock.mockResolvedValue(jsonResponse({
            razao_social: 'EMPRESA',
            nome_fantasia: '   ',
            cnae_fiscal: '9430800',
            capital_social: '1000',
            opcao_pelo_simples: 'S',
            data_inicio_atividade: '03/10/2013',
            cep: '01311-902',
            cnaes_secundarios: null,
        }));

        const result = await new BrasilApiService().findByCnpj(CNPJ);

        expect(result).toMatchObject({
            cnpj: CNPJ,
            corporateName: 'EMPRESA',
            tradeName: null,
            mainCnaeCode: null,
            shareCapital: null,
            optedForSimples: null,
            activityStartDate: null,
            cep: null,
            secondaryCnaes: [],
            taxRegimes: [],
            qsa: [],
        });
        const { cnpj: _cnpj, corporateName: _name, secondaryCnaes, taxRegimes, qsa, ...others } = result;
        expect(Object.values(others).every(value => value === null)).toBe(true);
    });

    it('should translate list items, ignoring entries that are not objects and filling missing keys with null', async () => {
        fetchMock.mockResolvedValue(jsonResponse({
            ...brasilApiPayload,
            cnaes_secundarios: [{ codigo: 1, descricao: '' }, null, 'x', [1], { codigo: 2 }],
        }));

        const result = await new BrasilApiService().findByCnpj(CNPJ);

        expect(result.secondaryCnaes).toEqual([
            { code: 1, description: null },
            { code: 2, description: null },
        ]);
    });

    it('should throw 404 when BrasilAPI does not know the CNPJ', async () => {
        fetchMock.mockResolvedValue(jsonResponse({ type: 'not_found' }, { ok: false, status: 404 }));

        await expectHttpError(new BrasilApiService().findByCnpj(CNPJ), httpStatus.NOT_FOUND, ERROR.BRASILAPI_CNPJ_NOT_FOUND);
    });

    it('should throw 400 when BrasilAPI rejects the CNPJ', async () => {
        fetchMock.mockResolvedValue(jsonResponse({ type: 'bad_request' }, { ok: false, status: 400 }));

        await expectHttpError(new BrasilApiService().findByCnpj(CNPJ), httpStatus.BAD_REQUEST, ERROR.BRASILAPI_CNPJ_REJECTED);
    });

    it.each([403, 429, 500, 503])('should throw 502 when BrasilAPI answers with status %i', async status => {
        fetchMock.mockResolvedValue(jsonResponse({}, { ok: false, status }));

        await expectHttpError(new BrasilApiService().findByCnpj(CNPJ), httpStatus.BAD_GATEWAY, ERROR.BRASILAPI_REQUEST_FAILED);
    });

    it('should throw 502 when the response is not valid JSON', async () => {
        fetchMock.mockResolvedValue({ ok: true, status: 200, json: async () => { throw new SyntaxError('bad json'); } });

        await expectHttpError(new BrasilApiService().findByCnpj(CNPJ), httpStatus.BAD_GATEWAY, ERROR.BRASILAPI_REQUEST_FAILED);
    });

    it.each([
        ['null', null],
        ['not an object', 'unexpected'],
        ['a list', [brasilApiPayload]],
        ['missing the corporate name', { ...brasilApiPayload, razao_social: undefined }],
        ['a blank corporate name', { ...brasilApiPayload, razao_social: ' ' }],
    ])('should throw 502 when the response body is %s', async (_, body) => {
        fetchMock.mockResolvedValue(jsonResponse(body));

        await expectHttpError(new BrasilApiService().findByCnpj(CNPJ), httpStatus.BAD_GATEWAY, ERROR.BRASILAPI_REQUEST_FAILED);
    });

    it('should throw 502 on network failures', async () => {
        fetchMock.mockRejectedValue(new TypeError('fetch failed'));

        await expectHttpError(new BrasilApiService().findByCnpj(CNPJ), httpStatus.BAD_GATEWAY, ERROR.BRASILAPI_REQUEST_FAILED);
    });

    it('should throw 504 when BrasilAPI times out', async () => {
        fetchMock.mockRejectedValue(new DOMException('The operation timed out.', 'TimeoutError'));

        await expectHttpError(new BrasilApiService().findByCnpj(CNPJ), httpStatus.GATEWAY_TIMEOUT, ERROR.BRASILAPI_TIMEOUT);
    });

    it('should abort the request after the configured timeout', async () => {
        fetchMock.mockImplementation((url, { signal }) => new Promise((resolve, reject) => {
            signal.addEventListener('abort', () => reject(signal.reason));
        }));

        await expectHttpError(
            new BrasilApiService({ timeoutMs: 10 }).findByCnpj(CNPJ),
            httpStatus.GATEWAY_TIMEOUT,
            ERROR.BRASILAPI_TIMEOUT
        );
    });
});
