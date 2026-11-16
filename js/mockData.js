const mockAccounts = [
  { id: "acc-1", nome: "Conta Principal", tipo: "CONTA", saldoInicialCentavos: 0 },
  { id: "acc-2", nome: "Carteira / Dinheiro", tipo: "CONTA", saldoInicialCentavos: 15000 }, // R$ 150,00
  { id: "card-1", nome: "Cartão de Crédito", tipo: "CARTAO", limiteCentavos: 300000 } // Limite R$ 3.000,00
];

const mockTransactions = [
  {
    id: "tx-001",
    data: "2026-10-01",
    descricao: "Salário Mensal",
    categoria: "Receita Fixa",
    tipo: "RECEITA",
    contaId: "acc-1",
    valorCentavos: 450000
  },
  {
    id: "tx-002",
    data: "2026-10-05",
    descricao: "Supermercado Semanal",
    categoria: "Alimentação",
    tipo: "DESPESA",
    contaId: "acc-1",
    valorCentavos: 38250
  },
  {
    id: "tx-003",
    data: "2026-10-10",
    descricao: "Assinatura Streaming",
    categoria: "Lazer",
    tipo: "DESPESA",
    contaId: "card-1", // Lançado no cartão de crédito
    valorCentavos: 5590
  },
  {
    id: "tx-004",
    data: "2026-10-12",
    descricao: "Serviço Freelance",
    categoria: "Serviços",
    tipo: "RECEITA",
    contaId: "acc-1",
    valorCentavos: 80000
  },
  {
    id: "tx-005",
    data: "2026-10-15",
    descricao: "Transferência para Carteira",
    categoria: "Transferência",
    tipo: "TRANSFERENCIA",
    contaId: "acc-1",        // Origem
    contaDestinoId: "acc-2", // Destino
    valorCentavos: 20000
  }
];