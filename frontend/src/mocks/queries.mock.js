// Consultas fictícias exibidas na página de tabelas, usadas até a integração com o backend.

export const QUERY_STATUS_MOCK = {
  success: { label: "Sucesso", color: "success" },
  pending: { label: "Na fila", color: "warning" },
  failed: { label: "Falhou", color: "error" },
};

const USERS = [
  { name: "Ana Souza", image: "/images/user/user-17.jpg" },
  { name: "Bruno Lima", image: "/images/user/user-18.jpg" },
  { name: "Carla Mendes", image: "/images/user/user-19.jpg" },
  { name: "Diego Rocha", image: "/images/user/user-20.jpg" },
  { name: "Elisa Castro", image: "/images/user/user-21.jpg" },
  { name: "Felipe Nunes", image: "/images/user/user-22.jpg" },
  { name: "Gabriela Alves", image: "/images/user/user-23.jpg" },
];

const QUERIES = [
  { type: "CEP", value: "01310-100", source: "ViaCEP" },
  { type: "CNPJ", value: "00.000.000/0001-91", source: "BrasilAPI" },
  { type: "CEP", value: "20040-020", source: "ViaCEP" },
  { type: "CNPJ", value: "33.000.167/0001-01", source: "BrasilAPI" },
  { type: "CEP", value: "30130-010", source: "ViaCEP" },
  { type: "CNPJ", value: "60.746.948/0001-12", source: "BrasilAPI" },
  { type: "CEP", value: "40010-000", source: "ViaCEP" },
  { type: "CEP", value: "80010-000", source: "ViaCEP" },
  { type: "CNPJ", value: "47.960.950/0001-21", source: "BrasilAPI" },
];

const STATUSES = ["success", "success", "pending", "success", "failed"];

export const QUERIES_MOCK = Array.from({ length: 28 }, (_, index) => {
  const user = USERS[index % USERS.length];
  const query = QUERIES[index % QUERIES.length];
  const day = String(28 - (index % 28)).padStart(2, "0");
  const hour = String(8 + (index % 10)).padStart(2, "0");
  const minute = String((index * 7) % 60).padStart(2, "0");

  return {
    id: index + 1,
    user: user.name,
    userImage: user.image,
    type: query.type,
    value: query.value,
    source: query.source,
    requestedAt: `2026-08-${day}T${hour}:${minute}:00`,
    duration: 120 + ((index * 37) % 880),
    status: STATUSES[index % STATUSES.length],
  };
});
