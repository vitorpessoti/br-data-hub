import { Injectable, Logger } from '@nestjs/common';
import type { CepData, CepProvider } from '@br-data-hub/cep';
import { DomainError } from '@br-data-hub/shared';

const DEFAULT_BASE_URL = 'https://viacep.com.br/ws';
const REQUEST_TIMEOUT_MS = 10_000;
const CEP_PATTERN = /^(\d{5})-?(\d{3})$/;

// Contrato do formato json da ViaCEP (GET /ws/{cep}/json/).
// CEP inexistente responde 200 com { "erro": "true" } (ou true, em versões antigas).
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

/**
 * Integração com a API pública ViaCEP (sem ApiKey), consumindo o formato json.
 * URL base opcional em VIACEP_BASE_URL (carregada no process.env pelo ConfigModule).
 *
 * - formato de CEP inválido -> DomainError('cep.invalid', 400), sem chamada HTTP;
 * - CEP inexistente -> null;
 * - falha de rede, timeout, HTTP não-2xx ou json inválido ->
 *   DomainError('cep.provider.failed', 502) — o detalhe fica só no log.
 */
@Injectable()
export class ViaCepProvider implements CepProvider {
  private readonly logger = new Logger(ViaCepProvider.name);
  private readonly baseUrl = (
    process.env.VIACEP_BASE_URL?.trim() || DEFAULT_BASE_URL
  ).replace(/\/+$/, '');

  async findByCep(cep: string): Promise<CepData | null> {
    const digits = this.toDigits(cep);
    const body = await this.request(`${this.baseUrl}/${digits}/json/`);

    if (body.erro === true || body.erro === 'true') {
      return null;
    }

    return this.toCepData(body);
  }

  private toDigits(cep: string): string {
    const match = CEP_PATTERN.exec(typeof cep === 'string' ? cep.trim() : '');

    if (!match) {
      throw new DomainError('cep.invalid', 400);
    }

    return `${match[1]}${match[2]}`;
  }

  private async request(url: string): Promise<ViaCepResponse> {
    try {
      const response = await fetch(url, {
        headers: { Accept: 'application/json' },
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      });

      // Limite da ViaCEP atingido: quem chama (fila de enriquecimento) decide
      // quando tentar de novo, então o erro não vira falha genérica.
      if (response.status === 429) {
        this.logger.warn(`Limite de requisições da ViaCEP atingido (${url})`);
        throw new DomainError('cep.provider.rate.limited', 429);
      }

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      return (await response.json()) as ViaCepResponse;
    } catch (error) {
      if (error instanceof DomainError) {
        throw error;
      }

      const reason = error instanceof Error ? error.message : String(error);

      this.logger.error(`Falha ao consultar a ViaCEP (${url}): ${reason}`);

      throw new DomainError('cep.provider.failed', 502);
    }
  }

  private toCepData(body: ViaCepResponse): CepData {
    return {
      cep: this.text(body.cep),
      street: this.optionalText(body.logradouro),
      complement: this.optionalText(body.complemento),
      unit: this.optionalText(body.unidade),
      neighborhood: this.optionalText(body.bairro),
      city: this.text(body.localidade),
      stateCode: this.text(body.uf),
      stateName: this.text(body.estado),
      region: this.text(body.regiao),
      ibgeCode: this.text(body.ibge),
      giaCode: this.optionalText(body.gia),
      areaCode: this.text(body.ddd),
      siafiCode: this.text(body.siafi),
    };
  }

  private text(value: string | undefined): string {
    return (value ?? '').trim();
  }

  // A ViaCEP devolve "" para campos sem valor; no domínio isso vira undefined.
  private optionalText(value: string | undefined): string | undefined {
    return this.text(value) || undefined;
  }
}
