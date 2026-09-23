import httpStatus from 'http-status';
import createError from 'http-errors';
import { CnpjConstants } from './cnpj.constants.js';

const { ERROR } = CnpjConstants.MESSAGES;

// BrasilAPI returns empty strings for missing values; they are stored as null.
const text = value => (typeof value === 'string' && value.trim() !== '' ? value : null);
const integer = value => (Number.isInteger(value) ? value : null);
const boolean = value => (typeof value === 'boolean' ? value : null);
const decimal = value => (typeof value === 'number' && Number.isFinite(value) ? value : null);
const date = value => (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) ? new Date(value) : null);
const cep = value => (typeof value === 'string' && /^\d{8}$/.test(value) ? value : null);

const isObject = value => value !== null && typeof value === 'object' && !Array.isArray(value);

// Keys of the nested lists, from the BrasilAPI (Portuguese) name to the stored (English) name.
const SECONDARY_CNAE_KEYS = {
    codigo: 'code',
    descricao: 'description',
};

const TAX_REGIME_KEYS = {
    ano: 'year',
    cnpj_da_scp: 'scpCnpj',
    forma_de_tributacao: 'taxationMethod',
    quantidade_de_escrituracoes: 'bookkeepingCount',
};

const QSA_KEYS = {
    identificador_de_socio: 'partnerTypeCode',
    nome_socio: 'partnerName',
    cnpj_cpf_do_socio: 'partnerDocument',
    codigo_qualificacao_socio: 'partnerQualificationCode',
    qualificacao_socio: 'partnerQualification',
    data_entrada_sociedade: 'partnershipStartDate',
    codigo_pais: 'countryCode',
    pais: 'country',
    cpf_representante_legal: 'legalRepresentativeCpf',
    nome_representante_legal: 'legalRepresentativeName',
    codigo_qualificacao_representante_legal: 'legalRepresentativeQualificationCode',
    qualificacao_representante_legal: 'legalRepresentativeQualification',
    codigo_faixa_etaria: 'ageRangeCode',
    faixa_etaria: 'ageRange',
};

// Translates the keys of every object in the list; missing values and empty strings become null.
const list = (value, keys) => {
    if (!Array.isArray(value)) return [];
    return value.filter(isObject).map(item => Object.fromEntries(
        Object.entries(keys).map(([source, target]) => [target, item[source] === '' ? null : item[source] ?? null])
    ));
};

// HTTP client for the BrasilAPI CNPJ endpoint (always JSON).
export default class BrasilApiService {
    constructor({
        baseUrl = process.env.BRASILAPI_BASE_URL || CnpjConstants.BRASILAPI_DEFAULT_BASE_URL,
        timeoutMs = Number(process.env.BRASILAPI_TIMEOUT_MS) || CnpjConstants.BRASILAPI_DEFAULT_TIMEOUT_MS,
    } = {}) {
        this.baseUrl = baseUrl.replace(/\/+$/, '');
        this.timeoutMs = timeoutMs;
    }

    // Returns the company mapped to the Cnpj model fields, or throws an HttpError.
    async findByCnpj(cnpj) {
        let response;
        try {
            response = await fetch(`${this.baseUrl}/${cnpj}`, {
                headers: { Accept: 'application/json', 'User-Agent': CnpjConstants.BRASILAPI_USER_AGENT },
                signal: AbortSignal.timeout(this.timeoutMs),
            });
        } catch (error) {
            if (error.name === 'TimeoutError') {
                throw createError(httpStatus.GATEWAY_TIMEOUT, ERROR.BRASILAPI_TIMEOUT);
            }
            throw createError(httpStatus.BAD_GATEWAY, ERROR.BRASILAPI_REQUEST_FAILED, { cause: error });
        }

        if (response.status === httpStatus.NOT_FOUND) {
            throw createError(httpStatus.NOT_FOUND, ERROR.BRASILAPI_CNPJ_NOT_FOUND);
        }
        if (response.status === httpStatus.BAD_REQUEST) {
            throw createError(httpStatus.BAD_REQUEST, ERROR.BRASILAPI_CNPJ_REJECTED);
        }
        if (!response.ok) {
            throw createError(httpStatus.BAD_GATEWAY, ERROR.BRASILAPI_REQUEST_FAILED);
        }

        let data;
        try {
            data = await response.json();
        } catch (error) {
            throw createError(httpStatus.BAD_GATEWAY, ERROR.BRASILAPI_REQUEST_FAILED, { cause: error });
        }

        // The corporate name is the only required field besides the CNPJ itself.
        if (!isObject(data) || !text(data.razao_social)) {
            throw createError(httpStatus.BAD_GATEWAY, ERROR.BRASILAPI_REQUEST_FAILED);
        }

        return BrasilApiService.toCnpjData(cnpj, data);
    }

    static toCnpjData(cnpj, data) {
        return {
            cnpj,
            corporateName: data.razao_social,
            tradeName: text(data.nome_fantasia),
            establishmentTypeCode: integer(data.identificador_matriz_filial),
            establishmentType: text(data.descricao_identificador_matriz_filial),
            registrationStatusCode: integer(data.situacao_cadastral),
            registrationStatus: text(data.descricao_situacao_cadastral),
            registrationStatusDate: date(data.data_situacao_cadastral),
            registrationStatusReasonCode: integer(data.motivo_situacao_cadastral),
            registrationStatusReason: text(data.descricao_motivo_situacao_cadastral),
            specialStatus: text(data.situacao_especial),
            specialStatusDate: date(data.data_situacao_especial),
            legalNatureCode: integer(data.codigo_natureza_juridica),
            legalNature: text(data.natureza_juridica),
            activityStartDate: date(data.data_inicio_atividade),
            mainCnaeCode: integer(data.cnae_fiscal),
            mainCnaeDescription: text(data.cnae_fiscal_descricao),
            secondaryCnaes: list(data.cnaes_secundarios, SECONDARY_CNAE_KEYS),
            streetType: text(data.descricao_tipo_de_logradouro),
            street: text(data.logradouro),
            number: text(data.numero),
            complement: text(data.complemento),
            neighborhood: text(data.bairro),
            cep: cep(data.cep),
            uf: text(data.uf),
            cityCode: integer(data.codigo_municipio),
            cityIbgeCode: integer(data.codigo_municipio_ibge),
            city: text(data.municipio),
            foreignCityName: text(data.nome_cidade_no_exterior),
            countryCode: integer(data.codigo_pais),
            country: text(data.pais),
            primaryPhone: text(data.ddd_telefone_1),
            secondaryPhone: text(data.ddd_telefone_2),
            fax: text(data.ddd_fax),
            email: text(data.email),
            responsibleQualificationCode: integer(data.qualificacao_do_responsavel),
            shareCapital: decimal(data.capital_social),
            companySizeCode: integer(data.codigo_porte),
            companySize: text(data.porte),
            responsibleFederativeEntity: text(data.ente_federativo_responsavel),
            optedForSimples: boolean(data.opcao_pelo_simples),
            simplesOptionDate: date(data.data_opcao_pelo_simples),
            simplesExclusionDate: date(data.data_exclusao_do_simples),
            optedForMei: boolean(data.opcao_pelo_mei),
            meiOptionDate: date(data.data_opcao_pelo_mei),
            meiExclusionDate: date(data.data_exclusao_do_mei),
            taxRegimes: list(data.regime_tributario, TAX_REGIME_KEYS),
            qsa: list(data.qsa, QSA_KEYS),
        };
    }
}
