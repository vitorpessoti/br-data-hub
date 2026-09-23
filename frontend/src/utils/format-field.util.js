export const EMPTY_VALUE = "—";

const DATE_ONLY_PATTERN = /^(\d{4})-(\d{2})-(\d{2})T00:00:00(\.000)?Z$/;
const DATE_TIME_PATTERN = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/;

// Siglas que sempre aparecem em maiúsculo nos rótulos.
const ACRONYMS = ["cnpj", "cep", "ibge", "cnae", "uf", "ddd", "qsa", "mei", "siafi", "gia"];

// Nomes em português dos campos de CEP e CNPJ (não são tradução literal:
// "corporateName" é "Razão social").
export const FIELD_LABELS = {
  id: "ID",
  jobId: "Job ID",
  status: "Status",
  createdAt: "Criado em",
  updatedAt: "Atualizado em",
  // CEP
  cep: "CEP",
  street: "Logradouro",
  complement: "Complemento",
  unit: "Unidade",
  neighborhood: "Bairro",
  city: "Cidade",
  uf: "UF",
  state: "Estado",
  region: "Região",
  ibgeCode: "Código IBGE",
  giaCode: "Código GIA",
  ddd: "DDD",
  siafiCode: "Código SIAFI",
  // CNPJ
  cnpj: "CNPJ",
  corporateName: "Razão social",
  tradeName: "Nome fantasia",
  establishmentTypeCode: "Código do tipo de estabelecimento",
  establishmentType: "Tipo de estabelecimento",
  registrationStatusCode: "Código da situação cadastral",
  registrationStatus: "Situação cadastral",
  registrationStatusDate: "Data da situação cadastral",
  registrationStatusReasonCode: "Código do motivo da situação cadastral",
  registrationStatusReason: "Motivo da situação cadastral",
  specialStatus: "Situação especial",
  specialStatusDate: "Data da situação especial",
  legalNatureCode: "Código da natureza jurídica",
  legalNature: "Natureza jurídica",
  activityStartDate: "Início da atividade",
  mainCnaeCode: "CNAE principal",
  mainCnaeDescription: "Descrição do CNAE principal",
  secondaryCnaes: "CNAEs secundários",
  streetType: "Tipo de logradouro",
  number: "Número",
  cityCode: "Código do município (SIAFI)",
  cityIbgeCode: "Código IBGE do município",
  foreignCityName: "Município no exterior",
  countryCode: "Código do país",
  country: "País",
  primaryPhone: "Telefone principal",
  secondaryPhone: "Telefone secundário",
  fax: "Fax",
  email: "E-mail",
  responsibleQualificationCode: "Qualificação do responsável",
  shareCapital: "Capital social",
  companySizeCode: "Código do porte",
  companySize: "Porte da empresa",
  responsibleFederativeEntity: "Ente federativo responsável",
  optedForSimples: "Optante pelo Simples",
  simplesOptionDate: "Data de opção pelo Simples",
  simplesExclusionDate: "Data de exclusão do Simples",
  optedForMei: "Optante pelo MEI",
  meiOptionDate: "Data de opção pelo MEI",
  meiExclusionDate: "Data de exclusão do MEI",
  taxRegimes: "Regimes tributários",
  qsa: "Quadro de sócios e administradores (QSA)",
};

// Status do enriquecimento na API externa (chamada direta ou fila).
export const STATUS_LABELS = {
  pending: "Pendente",
  processing: "Processando",
  completed: "Concluído",
  failed: "Falhou",
};

const capitalize = (text) => text.charAt(0).toUpperCase() + text.slice(1);

// Nome do campo para exibição: usa a tradução quando existe; senão separa o
// camelCase ("fooBar" -> "Foo Bar"), mantendo as siglas em maiúsculo.
export const formatFieldLabel = (key) =>
  FIELD_LABELS[key] ??
  key
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .split(/[\s_-]+/)
    .filter(Boolean)
    .map((word) =>
      ACRONYMS.includes(word.toLowerCase()) ? word.toUpperCase() : capitalize(word),
    )
    .join(" ");

// Status sempre com a primeira letra em maiúscula ("completed" -> "Concluído").
export const formatStatus = (status) =>
  status ? (STATUS_LABELS[status] ?? capitalize(String(status))) : EMPTY_VALUE;

// "01001000" -> "01001-000"
export const formatCep = (cep) =>
  /^\d{8}$/.test(cep ?? "") ? `${cep.slice(0, 5)}-${cep.slice(5)}` : cep;

// "19131243000197" -> "19.131.243/0001-97" (também para CNPJ alfanumérico).
export const formatCnpj = (cnpj) =>
  /^[0-9A-Z]{14}$/i.test(cnpj ?? "")
    ? `${cnpj.slice(0, 2)}.${cnpj.slice(2, 5)}.${cnpj.slice(5, 8)}/${cnpj.slice(8, 12)}-${cnpj.slice(12)}`
    : cnpj;

// "1123456789" -> "(11) 2345-6789"; "11923456789" -> "(11) 92345-6789".
export const formatPhone = (phone) => {
  const digits = String(phone ?? "").replace(/\D/g, "").slice(0, 11);
  if (digits.length <= 2) return digits;
  const splitAt = digits.length === 11 ? 7 : 6;
  if (digits.length <= splitAt) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  return `(${digits.slice(0, 2)}) ${digits.slice(2, splitAt)}-${digits.slice(splitAt)}`;
};

// 9430800 -> "9430-8/00"
export const formatCnae = (code) => {
  const digits = String(code ?? "").replace(/\D/g, "").slice(0, 7);
  if (digits.length <= 4) return digits;
  if (digits.length <= 5) return `${digits.slice(0, 4)}-${digits.slice(4)}`;
  return `${digits.slice(0, 4)}-${digits.slice(4, 5)}/${digits.slice(5)}`;
};

// "1234.5" -> "R$ 1.234,50". Trabalha com o texto para não perder precisão
// em valores grandes (o backend guarda Decimal(18, 2)).
export const formatCurrency = (value) => {
  const [integer, decimals = ""] = String(value).split(".");
  const grouped = integer.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return `R$ ${grouped},${decimals.padEnd(2, "0").slice(0, 2)}`;
};

// Formatação específica de alguns campos, igual à máscara usada na edição.
const VALUE_FORMATTERS = {
  status: formatStatus,
  cep: formatCep,
  cnpj: formatCnpj,
  primaryPhone: formatPhone,
  secondaryPhone: formatPhone,
  fax: formatPhone,
  mainCnaeCode: formatCnae,
  shareCapital: formatCurrency,
  country: (country) => String(country).toUpperCase(),
};

// Valor do campo para exibição. Listas e objetos (ex.: QSA) viram JSON indentado.
export const formatFieldValue = (value, key) => {
  if (value === null || value === undefined || value === "") return EMPTY_VALUE;
  if (typeof value === "boolean") return value ? "Sim" : "Não";
  if (typeof value === "object") return JSON.stringify(value, null, 2);
  if (VALUE_FORMATTERS[key]) return VALUE_FORMATTERS[key](value);

  const text = String(value);
  // Colunas só de data (@db.Date) chegam como meia-noite UTC.
  const dateOnly = text.match(DATE_ONLY_PATTERN);
  if (dateOnly) return `${dateOnly[3]}/${dateOnly[2]}/${dateOnly[1]}`;
  if (DATE_TIME_PATTERN.test(text)) {
    return new Date(text).toLocaleString("pt-BR");
  }
  return text;
};
