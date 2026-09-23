import httpStatus from 'http-status';
import createError from 'http-errors';
import { CepConstants } from './cep.constants.js';

const { ERROR } = CepConstants.MESSAGES;

// ViaCEP returns empty strings for missing values; they are stored as null.
const emptyToNull = value => (typeof value === 'string' && value.trim() !== '' ? value : null);

// HTTP client for the ViaCEP public API (always JSON).
export default class ViaCepService {
    constructor({
        baseUrl = process.env.VIACEP_BASE_URL || CepConstants.VIACEP_DEFAULT_BASE_URL,
        timeoutMs = Number(process.env.VIACEP_TIMEOUT_MS) || CepConstants.VIACEP_DEFAULT_TIMEOUT_MS,
    } = {}) {
        this.baseUrl = baseUrl.replace(/\/+$/, '');
        this.timeoutMs = timeoutMs;
    }

    // Returns the address mapped to the Cep model fields, or throws an HttpError.
    async findByCep(cep) {
        let response;
        try {
            response = await fetch(`${this.baseUrl}/${cep}/json/`, {
                headers: { Accept: 'application/json' },
                signal: AbortSignal.timeout(this.timeoutMs),
            });
        } catch (error) {
            if (error.name === 'TimeoutError') {
                throw createError(httpStatus.GATEWAY_TIMEOUT, ERROR.VIACEP_TIMEOUT);
            }
            throw createError(httpStatus.BAD_GATEWAY, ERROR.VIACEP_REQUEST_FAILED, { cause: error });
        }

        if (!response.ok) {
            throw createError(httpStatus.BAD_GATEWAY, ERROR.VIACEP_REQUEST_FAILED);
        }

        let data;
        try {
            data = await response.json();
        } catch (error) {
            throw createError(httpStatus.BAD_GATEWAY, ERROR.VIACEP_REQUEST_FAILED, { cause: error });
        }

        if (!data || typeof data !== 'object') {
            throw createError(httpStatus.BAD_GATEWAY, ERROR.VIACEP_REQUEST_FAILED);
        }
        if (data.erro === true || data.erro === 'true') {
            throw createError(httpStatus.NOT_FOUND, ERROR.VIACEP_CEP_NOT_FOUND);
        }

        return ViaCepService.toCepData(cep, data);
    }

    static toCepData(cep, data) {
        return {
            cep,
            street: emptyToNull(data.logradouro),
            complement: emptyToNull(data.complemento),
            unit: emptyToNull(data.unidade),
            neighborhood: emptyToNull(data.bairro),
            city: data.localidade,
            uf: data.uf,
            state: emptyToNull(data.estado),
            region: emptyToNull(data.regiao),
            ibgeCode: emptyToNull(data.ibge),
            giaCode: emptyToNull(data.gia),
            ddd: emptyToNull(data.ddd),
            // The API returns "siafi"; "siafiCode" is accepted as a fallback.
            siafiCode: emptyToNull(data.siafi ?? data.siafiCode),
        };
    }
}
