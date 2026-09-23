import { Injectable, Logger } from '@nestjs/common';
import { normalizeCnpj } from '@br-data-hub/cnpj';
import type {
  CnpjData,
  CnpjPartner,
  CnpjProvider,
  CnpjSecondaryCnae,
  CnpjTaxRegime,
} from '@br-data-hub/cnpj';
import { CnpjRule, DomainError } from '@br-data-hub/shared';

const DEFAULT_BASE_URL = 'https://brasilapi.com.br/api';
const REQUEST_TIMEOUT_MS = 10_000;
// O Cloudflare da BrasilAPI responde 403 ao User-Agent padrão do fetch do Node ("node").
const USER_AGENT = 'br-data-hub';
const CNPJ_RULE = new CnpjRule();

export type BrasilApiCnaeResponse = {
  codigo?: number | null;
  descricao?: string | null;
};

export type BrasilApiPartnerResponse = {
  identificador_de_socio?: number | null;
  nome_socio?: string | null;
  cnpj_cpf_do_socio?: string | null;
  codigo_qualificacao_socio?: number | null;
  qualificacao_socio?: string | null;
  data_entrada_sociedade?: string | null;
  codigo_pais?: number | null;
  pais?: string | null;
  codigo_faixa_etaria?: number | null;
  faixa_etaria?: string | null;
  cpf_representante_legal?: string | null;
  nome_representante_legal?: string | null;
  codigo_qualificacao_representante_legal?: number | null;
  qualificacao_representante_legal?: string | null;
};

export type BrasilApiTaxRegimeResponse = {
  ano?: number | null;
  forma_de_tributacao?: string | null;
  cnpj_da_scp?: string | null;
  quantidade_de_escrituracoes?: number | null;
};

// Contrato de GET /api/cnpj/v1/{cnpj} da BrasilAPI (dados abertos da Receita Federal).
// CNPJ inexistente responde 404; formato ou dígito inválido responde 400.
export type BrasilApiCnpjResponse = {
  cnpj?: string | null;
  identificador_matriz_filial?: number | null;
  descricao_identificador_matriz_filial?: string | null;
  razao_social?: string | null;
  nome_fantasia?: string | null;
  situacao_cadastral?: number | null;
  descricao_situacao_cadastral?: string | null;
  data_situacao_cadastral?: string | null;
  motivo_situacao_cadastral?: number | null;
  descricao_motivo_situacao_cadastral?: string | null;
  nome_cidade_no_exterior?: string | null;
  codigo_pais?: number | null;
  pais?: string | null;
  codigo_natureza_juridica?: number | null;
  natureza_juridica?: string | null;
  data_inicio_atividade?: string | null;
  cnae_fiscal?: number | null;
  cnae_fiscal_descricao?: string | null;
  descricao_tipo_de_logradouro?: string | null;
  logradouro?: string | null;
  numero?: string | null;
  complemento?: string | null;
  bairro?: string | null;
  cep?: string | null;
  uf?: string | null;
  municipio?: string | null;
  codigo_municipio?: number | null;
  codigo_municipio_ibge?: number | null;
  ddd_telefone_1?: string | null;
  ddd_telefone_2?: string | null;
  ddd_fax?: string | null;
  email?: string | null;
  qualificacao_do_responsavel?: number | null;
  capital_social?: number | null;
  codigo_porte?: number | null;
  porte?: string | null;
  opcao_pelo_simples?: boolean | null;
  data_opcao_pelo_simples?: string | null;
  data_exclusao_do_simples?: string | null;
  opcao_pelo_mei?: boolean | null;
  data_opcao_pelo_mei?: string | null;
  data_exclusao_do_mei?: string | null;
  situacao_especial?: string | null;
  data_situacao_especial?: string | null;
  ente_federativo_responsavel?: string | null;
  cnaes_secundarios?: BrasilApiCnaeResponse[] | null;
  qsa?: BrasilApiPartnerResponse[] | null;
  regime_tributario?: BrasilApiTaxRegimeResponse[] | null;
};

/**
 * Integração com a API pública de CNPJ da BrasilAPI (sem ApiKey).
 * URL base opcional em BRASILAPI_BASE_URL (carregada no process.env pelo ConfigModule).
 *
 * - CNPJ inválido (formato ou dígito verificador) -> DomainError('cnpj.invalid', 400), sem chamada HTTP;
 * - CNPJ inexistente (HTTP 404) -> null;
 * - falha de rede, timeout, outro HTTP não-2xx ou json inválido ->
 *   DomainError('cnpj.provider.failed', 502) — o detalhe fica só no log.
 */
@Injectable()
export class BrasilApiCnpjProvider implements CnpjProvider {
  private readonly logger = new Logger(BrasilApiCnpjProvider.name);
  private readonly baseUrl = (
    process.env.BRASILAPI_BASE_URL?.trim() || DEFAULT_BASE_URL
  ).replace(/\/+$/, '');

  async findByCnpj(cnpj: string): Promise<CnpjData | null> {
    const normalized = this.toNormalizedCnpj(cnpj);
    const body = await this.request(`${this.baseUrl}/cnpj/v1/${normalized}`);

    return body ? this.toCnpjData(body) : null;
  }

  private toNormalizedCnpj(cnpj: string): string {
    const normalized = typeof cnpj === 'string' ? normalizeCnpj(cnpj) : '';

    if (!normalized || CNPJ_RULE.validate(normalized) !== null) {
      throw new DomainError('cnpj.invalid', 400);
    }

    return normalized;
  }

  private async request(url: string): Promise<BrasilApiCnpjResponse | null> {
    try {
      const response = await fetch(url, {
        headers: { Accept: 'application/json', 'User-Agent': USER_AGENT },
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      });

      if (response.status === 404) {
        return null;
      }

      // Limite da BrasilAPI atingido: quem chama (fila de enriquecimento)
      // decide quando tentar de novo, então o erro não vira falha genérica.
      if (response.status === 429) {
        this.logger.warn(
          `Limite de requisições da BrasilAPI atingido (${url})`,
        );
        throw new DomainError('cnpj.provider.rate.limited', 429);
      }

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const body: unknown = await response.json();

      if (typeof body !== 'object' || body === null || Array.isArray(body)) {
        throw new Error('corpo da resposta não é um objeto json');
      }

      return body as BrasilApiCnpjResponse;
    } catch (error) {
      if (error instanceof DomainError) {
        throw error;
      }

      const reason = error instanceof Error ? error.message : String(error);

      this.logger.error(`Falha ao consultar a BrasilAPI (${url}): ${reason}`);

      throw new DomainError('cnpj.provider.failed', 502);
    }
  }

  private toCnpjData(body: BrasilApiCnpjResponse): CnpjData {
    return {
      cnpj: normalizeCnpj(this.text(body.cnpj)),
      branchTypeCode: this.requiredNumber(body.identificador_matriz_filial),
      branchTypeDescription: this.optionalText(
        body.descricao_identificador_matriz_filial,
      ),
      legalName: this.text(body.razao_social),
      tradeName: this.optionalText(body.nome_fantasia),
      registrationStatusCode: this.requiredNumber(body.situacao_cadastral),
      registrationStatusDescription: this.optionalText(
        body.descricao_situacao_cadastral,
      ),
      registrationStatusDate: this.optionalText(body.data_situacao_cadastral),
      registrationStatusReasonCode: this.optionalNumber(
        body.motivo_situacao_cadastral,
      ),
      registrationStatusReasonDescription: this.optionalText(
        body.descricao_motivo_situacao_cadastral,
      ),
      foreignCityName: this.optionalText(body.nome_cidade_no_exterior),
      countryCode: this.optionalNumber(body.codigo_pais),
      countryName: this.optionalText(body.pais),
      legalNatureCode: this.requiredNumber(body.codigo_natureza_juridica),
      legalNatureDescription: this.optionalText(body.natureza_juridica),
      activityStartDate: this.optionalText(body.data_inicio_atividade),
      mainCnaeCode: this.code(body.cnae_fiscal, 7) ?? '',
      mainCnaeDescription: this.optionalText(body.cnae_fiscal_descricao),
      streetType: this.optionalText(body.descricao_tipo_de_logradouro),
      street: this.optionalText(body.logradouro),
      addressNumber: this.optionalText(body.numero),
      complement: this.optionalText(body.complemento),
      neighborhood: this.optionalText(body.bairro),
      zipCode: this.zipCode(body.cep),
      stateCode: this.text(body.uf),
      city: this.text(body.municipio),
      siafiCode: this.code(body.codigo_municipio, 4),
      ibgeCode: this.code(body.codigo_municipio_ibge, 7),
      primaryPhone: this.optionalText(body.ddd_telefone_1),
      secondaryPhone: this.optionalText(body.ddd_telefone_2),
      fax: this.optionalText(body.ddd_fax),
      email: this.optionalText(body.email),
      responsibleQualificationCode: this.optionalNumber(
        body.qualificacao_do_responsavel,
      ),
      shareCapital: this.requiredNumber(body.capital_social),
      companySizeCode: this.optionalNumber(body.codigo_porte),
      companySizeDescription: this.optionalText(body.porte),
      simplesOption: this.optionalBoolean(body.opcao_pelo_simples),
      simplesOptionDate: this.optionalText(body.data_opcao_pelo_simples),
      simplesExclusionDate: this.optionalText(body.data_exclusao_do_simples),
      meiOption: this.optionalBoolean(body.opcao_pelo_mei),
      meiOptionDate: this.optionalText(body.data_opcao_pelo_mei),
      meiExclusionDate: this.optionalText(body.data_exclusao_do_mei),
      specialStatus: this.optionalText(body.situacao_especial),
      specialStatusDate: this.optionalText(body.data_situacao_especial),
      responsibleFederativeEntity: this.optionalText(
        body.ente_federativo_responsavel,
      ),
      secondaryCnaes: this.list(body.cnaes_secundarios)
        .map((item) => this.toSecondaryCnae(item))
        .filter((item): item is CnpjSecondaryCnae => item !== null),
      partners: this.list(body.qsa).map((item) => this.toPartner(item)),
      taxRegimes: this.list(body.regime_tributario).map((item) =>
        this.toTaxRegime(item),
      ),
    };
  }

  // Sem CNAE secundário, a BrasilAPI devolve [{ codigo: 0, descricao: "" }].
  private toSecondaryCnae(
    item: BrasilApiCnaeResponse,
  ): CnpjSecondaryCnae | null {
    const code = this.code(item.codigo, 7);

    return code ? { code, description: this.text(item.descricao) } : null;
  }

  private toPartner(item: BrasilApiPartnerResponse): CnpjPartner {
    return {
      typeCode: this.requiredNumber(item.identificador_de_socio),
      name: this.text(item.nome_socio),
      document: this.optionalText(item.cnpj_cpf_do_socio),
      qualificationCode: this.requiredNumber(item.codigo_qualificacao_socio),
      qualificationDescription: this.optionalText(item.qualificacao_socio),
      joinedAt: this.optionalText(item.data_entrada_sociedade),
      countryCode: this.optionalNumber(item.codigo_pais),
      countryName: this.optionalText(item.pais),
      ageRangeCode: this.optionalNumber(item.codigo_faixa_etaria),
      ageRangeDescription: this.optionalText(item.faixa_etaria),
      legalRepresentativeDocument: this.optionalText(
        item.cpf_representante_legal,
      ),
      legalRepresentativeName: this.optionalText(item.nome_representante_legal),
      legalRepresentativeQualificationCode: this.optionalNumber(
        item.codigo_qualificacao_representante_legal,
      ),
      legalRepresentativeQualificationDescription: this.optionalText(
        item.qualificacao_representante_legal,
      ),
    };
  }

  private toTaxRegime(item: BrasilApiTaxRegimeResponse): CnpjTaxRegime {
    return {
      year: this.requiredNumber(item.ano),
      taxationForm: this.text(item.forma_de_tributacao),
      scpCnpj: this.optionalText(item.cnpj_da_scp),
      bookkeepingCount: this.optionalNumber(item.quantidade_de_escrituracoes),
    };
  }

  private list<T>(value: T[] | null | undefined): T[] {
    return Array.isArray(value)
      ? value.filter((item) => typeof item === 'object' && item !== null)
      : [];
  }

  private text(value: unknown): string {
    return typeof value === 'string' ? value.trim() : '';
  }

  // A BrasilAPI devolve "" ou null para campos sem valor; no domínio isso vira undefined.
  private optionalText(value: unknown): string | undefined {
    return this.text(value) || undefined;
  }

  private optionalNumber(value: unknown): number | undefined {
    return typeof value === 'number' && Number.isFinite(value)
      ? value
      : undefined;
  }

  // Numérico obrigatório ausente vira NaN, que a entidade reprova ao validar.
  private requiredNumber(value: unknown): number {
    return this.optionalNumber(value) ?? Number.NaN;
  }

  private optionalBoolean(value: unknown): boolean | undefined {
    return typeof value === 'boolean' ? value : undefined;
  }

  // Códigos numéricos (CNAE, município) viram string com zeros à esquerda; 0 ou vazio -> undefined.
  private code(value: unknown, length: number): string | undefined {
    const text = typeof value === 'number' ? String(value) : this.text(value);

    return /^\d+$/.test(text) && Number(text) > 0
      ? text.padStart(length, '0')
      : undefined;
  }

  // "01311902" -> "01311-902"; outro formato segue como veio, para a entidade reprovar.
  private zipCode(value: unknown): string | undefined {
    const match = /^(\d{5})-?(\d{3})$/.exec(this.text(value));

    return match ? `${match[1]}-${match[2]}` : this.optionalText(value);
  }
}
