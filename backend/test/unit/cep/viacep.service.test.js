import { jest } from '@jest/globals';
import httpStatus from 'http-status';
import ViaCepService from '../../../src/modules/cep/viacep.service.js';
import { CepConstants } from '../../../src/modules/cep/cep.constants.js';

const { ERROR } = CepConstants.MESSAGES;

const viaCepPayload = {
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

const mappedCep = {
    cep: '01001000',
    street: 'Praça da Sé',
    complement: 'lado ímpar',
    unit: null,
    neighborhood: 'Sé',
    city: 'São Paulo',
    uf: 'SP',
    state: 'São Paulo',
    region: 'Sudeste',
    ibgeCode: '3550308',
    giaCode: '1004',
    ddd: '11',
    siafiCode: '7107',
};

const jsonResponse = (body, init = {}) => ({ ok: true, status: 200, json: async () => body, ...init });

let fetchMock;

beforeEach(() => {
    fetchMock = jest.spyOn(globalThis, 'fetch');
    delete process.env.VIACEP_BASE_URL;
    delete process.env.VIACEP_TIMEOUT_MS;
});

afterEach(() => {
    fetchMock.mockRestore();
});

const expectHttpError = async (promise, status, message) => {
    await expect(promise).rejects.toMatchObject({ status, message });
};

describe('# ViaCepService - configuration', () => {
    it('should use the default base URL and timeout', () => {
        const service = new ViaCepService();

        expect(service.baseUrl).toBe(CepConstants.VIACEP_DEFAULT_BASE_URL);
        expect(service.timeoutMs).toBe(CepConstants.VIACEP_DEFAULT_TIMEOUT_MS);
    });

    it('should read VIACEP_BASE_URL and VIACEP_TIMEOUT_MS from the environment', () => {
        process.env.VIACEP_BASE_URL = 'http://viacep.local/ws/';
        process.env.VIACEP_TIMEOUT_MS = '1500';

        const service = new ViaCepService();

        expect(service.baseUrl).toBe('http://viacep.local/ws');
        expect(service.timeoutMs).toBe(1500);
    });

    it('should accept explicit options', () => {
        const service = new ViaCepService({ baseUrl: 'http://custom/ws//', timeoutMs: 10 });

        expect(service.baseUrl).toBe('http://custom/ws');
        expect(service.timeoutMs).toBe(10);
    });
});

describe('# ViaCepService - findByCep', () => {
    it('should request the JSON endpoint and map the response to the Cep fields', async () => {
        fetchMock.mockResolvedValue(jsonResponse(viaCepPayload));

        const result = await new ViaCepService().findByCep('01001000');

        expect(result).toEqual(mappedCep);
        const [url, options] = fetchMock.mock.calls[0];
        expect(url).toBe('https://viacep.com.br/ws/01001000/json/');
        expect(options.headers).toEqual({ Accept: 'application/json' });
        expect(options.signal).toBeInstanceOf(AbortSignal);
    });

    it('should accept "siafiCode" when "siafi" is absent', async () => {
        const { siafi: _siafi, ...payload } = viaCepPayload;
        fetchMock.mockResolvedValue(jsonResponse({ ...payload, siafiCode: '9999' }));

        const result = await new ViaCepService().findByCep('01001000');

        expect(result.siafiCode).toBe('9999');
    });

    it('should store missing or blank values as null', async () => {
        fetchMock.mockResolvedValue(jsonResponse({
            cep: '01001-000',
            logradouro: '  ',
            localidade: 'São Paulo',
            uf: 'SP',
        }));

        const result = await new ViaCepService().findByCep('01001000');

        expect(result).toEqual({
            cep: '01001000',
            street: null,
            complement: null,
            unit: null,
            neighborhood: null,
            city: 'São Paulo',
            uf: 'SP',
            state: null,
            region: null,
            ibgeCode: null,
            giaCode: null,
            ddd: null,
            siafiCode: null,
        });
    });

    it.each([
        ['as a string', 'true'],
        ['as a boolean', true],
    ])('should throw 404 when ViaCEP flags "erro" %s', async (_, erro) => {
        fetchMock.mockResolvedValue(jsonResponse({ erro }));

        await expectHttpError(new ViaCepService().findByCep('99999999'), httpStatus.NOT_FOUND, ERROR.VIACEP_CEP_NOT_FOUND);
    });

    it('should throw 502 when ViaCEP answers with a non-2xx status', async () => {
        fetchMock.mockResolvedValue(jsonResponse({}, { ok: false, status: 400 }));

        await expectHttpError(new ViaCepService().findByCep('01001000'), httpStatus.BAD_GATEWAY, ERROR.VIACEP_REQUEST_FAILED);
    });

    it('should throw 502 when the response is not valid JSON', async () => {
        fetchMock.mockResolvedValue({ ok: true, status: 200, json: async () => { throw new SyntaxError('bad json'); } });

        await expectHttpError(new ViaCepService().findByCep('01001000'), httpStatus.BAD_GATEWAY, ERROR.VIACEP_REQUEST_FAILED);
    });

    it.each([
        ['null', null],
        ['not an object', 'unexpected'],
    ])('should throw 502 when the response body is %s', async (_, body) => {
        fetchMock.mockResolvedValue(jsonResponse(body));

        await expectHttpError(new ViaCepService().findByCep('01001000'), httpStatus.BAD_GATEWAY, ERROR.VIACEP_REQUEST_FAILED);
    });

    it('should throw 502 on network failures', async () => {
        fetchMock.mockRejectedValue(new TypeError('fetch failed'));

        await expectHttpError(new ViaCepService().findByCep('01001000'), httpStatus.BAD_GATEWAY, ERROR.VIACEP_REQUEST_FAILED);
    });

    it('should throw 504 when ViaCEP times out', async () => {
        fetchMock.mockRejectedValue(new DOMException('The operation timed out.', 'TimeoutError'));

        await expectHttpError(new ViaCepService().findByCep('01001000'), httpStatus.GATEWAY_TIMEOUT, ERROR.VIACEP_TIMEOUT);
    });

    it('should abort the request after the configured timeout', async () => {
        fetchMock.mockImplementation((url, { signal }) => new Promise((resolve, reject) => {
            signal.addEventListener('abort', () => reject(signal.reason));
        }));

        await expectHttpError(
            new ViaCepService({ timeoutMs: 10 }).findByCep('01001000'),
            httpStatus.GATEWAY_TIMEOUT,
            ERROR.VIACEP_TIMEOUT
        );
    });
});
