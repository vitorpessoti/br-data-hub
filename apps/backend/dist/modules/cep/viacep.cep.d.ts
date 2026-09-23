import type { CepData, CepProvider } from '@br-data-hub/cep';
export type ViaCepResponse = {
    cep?: string;
    logradouro?: string;
    complemento?: string;
    unidade?: string;
    bairro?: string;
    localidade?: string;
    uf?: string;
    estado?: string;
    regiao?: string;
    ibge?: string;
    gia?: string;
    ddd?: string;
    siafi?: string;
    erro?: boolean | string;
};
export declare class ViaCepProvider implements CepProvider {
    private readonly logger;
    private readonly baseUrl;
    findByCep(cep: string): Promise<CepData | null>;
    private toDigits;
    private request;
    private toCepData;
    private text;
    private optionalText;
}
