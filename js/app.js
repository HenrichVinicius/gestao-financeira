const TX_STORAGE_KEY = "gestao_financeira_transacoes_v2";
const ACC_STORAGE_KEY = "gestao_financeira_contas_v2";
let expensesChartInstance = null;
let pendingImports = [];

function loadAccounts() {
  const data = localStorage.getItem(ACC_STORAGE_KEY);
  if (data) {
    try { return JSON.parse(data); } catch (e) { console.error(e); }
  }
  saveAccounts(mockAccounts);
  return [...mockAccounts];
}

function saveAccounts(list) {
  localStorage.setItem(ACC_STORAGE_KEY, JSON.stringify(list));
}

function loadTransactions() {
  const data = localStorage.getItem(TX_STORAGE_KEY);
  if (data) {
    try { return JSON.parse(data); } catch (e) { console.error(e); }
  }
  saveTransactions(mockTransactions);
  return [...mockTransactions];
}

function saveTransactions(list) {
  localStorage.setItem(TX_STORAGE_KEY, JSON.stringify(list));
}

let accounts = loadAccounts();
let transactions = loadTransactions();

function formatCurrency(cents) {
  return (cents / 100).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL"
  });
}

function calculateAccountBalances() {
  const balances = {};

  accounts.forEach((acc) => {
    balances[acc.id] = acc.tipo === "CONTA" ? (acc.saldoInicialCentavos || 0) : 0;
  });

  transactions.forEach((tx) => {
    if (tx.tipo === "RECEITA") {
      if (balances[tx.contaId] !== undefined) balances[tx.contaId] += tx.valorCentavos;
    } else if (tx.tipo === "DESPESA") {
      const acc = accounts.find((a) => a.id === tx.contaId);
      if (acc) {
        if (acc.tipo === "CONTA") balances[acc.id] -= tx.valorCentavos;
        else if (acc.tipo === "CARTAO") balances[acc.id] += tx.valorCentavos;
      }
    } else if (tx.tipo === "TRANSFERENCIA") {
      if (balances[tx.contaId] !== undefined) balances[tx.contaId] -= tx.valorCentavos;
      if (balances[tx.contaDestinoId] !== undefined) balances[tx.contaDestinoId] += tx.valorCentavos;
    }
  });

  return balances;
}

function calculateSummary(list, accountBalances) {
  let income = 0;
  let expense = 0;

  list.forEach((tx) => {
    if (tx.tipo === "RECEITA") income += tx.valorCentavos;
    else if (tx.tipo === "DESPESA") expense += tx.valorCentavos;
  });

  let consolidatedBalance = 0;
  accounts.forEach((acc) => {
    if (acc.tipo === "CONTA") consolidatedBalance += accountBalances[acc.id] || 0;
  });

  return { income, expense, consolidatedBalance };
}

function renderAccounts(accountBalances) {
  const container = document.getElementById("accounts-list");
  const originSelect = document.getElementById("account-origin");
  const destSelect = document.getElementById("account-destination");
  const importSelect = document.getElementById("import-account");

  container.innerHTML = "";
  originSelect.innerHTML = "";
  destSelect.innerHTML = "";
  importSelect.innerHTML = "";

  accounts.forEach((acc) => {
    const val = accountBalances[acc.id] || 0;
    const isCard = acc.tipo === "CARTAO";

    const card = document.createElement("div");
    card.className = "account-card";
    card.innerHTML = `
      <div class="account-card-header">
        <strong>${acc.nome}</strong>
        <span class="account-tag">${isCard ? "Cartão de Crédito" : "Conta"}</span>
      </div>
      <div class="account-balance ${isCard ? "text-expense" : "text-income"}">
        ${isCard ? "Fatura: " : ""}${formatCurrency(val)}
      </div>
      ${
        isCard
          ? `<div class="account-sub">Limite disponível: ${formatCurrency((acc.limiteCentavos || 0) - val)}</div>`
          : `<div class="account-sub">Saldo disponível em conta</div>`
      }
    `;
    container.appendChild(card);

    originSelect.add(new Option(acc.nome, acc.id));
    importSelect.add(new Option(acc.nome, acc.id));
    if (!isCard) destSelect.add(new Option(acc.nome, acc.id));
  });
}

function getFilteredTransactions() {
  const searchTerm = document.getElementById("filter-search").value.toLowerCase().trim();
  const typeFilter = document.getElementById("filter-type").value;

  return transactions.filter((tx) => {
    const matchesType = typeFilter === "TODOS" || tx.tipo === typeFilter;
    const matchesSearch =
      tx.descricao.toLowerCase().includes(searchTerm) ||
      tx.categoria.toLowerCase().includes(searchTerm);

    return matchesType && matchesSearch;
  });
}

function renderChart(list) {
  const canvas = document.getElementById("expenses-chart");
  const emptyMsg = document.getElementById("chart-empty-msg");

  const categoryTotals = {};
  list.forEach((tx) => {
    if (tx.tipo === "DESPESA") {
      const cat = tx.categoria.trim();
      categoryTotals[cat] = (categoryTotals[cat] || 0) + tx.valorCentavos;
    }
  });

  const labels = Object.keys(categoryTotals);
  const values = Object.values(categoryTotals).map((cents) => cents / 100);

  if (labels.length === 0) {
    canvas.style.display = "none";
    emptyMsg.style.display = "block";
    if (expensesChartInstance) {
      expensesChartInstance.destroy();
      expensesChartInstance = null;
    }
    return;
  }

  canvas.style.display = "block";
  emptyMsg.style.display = "none";

  if (expensesChartInstance) expensesChartInstance.destroy();

  const colors = ["#38bdf8", "#f43f5e", "#eab308", "#a855f7", "#22c55e", "#f97316"];

  expensesChartInstance = new Chart(canvas, {
    type: "doughnut",
    data: {
      labels,
      datasets: [
        {
          data: values,
          backgroundColor: colors.slice(0, labels.length),
          borderColor: "#1e293b",
          borderWidth: 2
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { position: "right", labels: { color: "#f8fafc", font: { size: 12 } } }
      }
    }
  });
}

function getAccountName(id) {
  const found = accounts.find((a) => a.id === id);
  return found ? found.nome : "Desconhecida";
}

function render() {
  const accountBalances = calculateAccountBalances();
  renderAccounts(accountBalances);

  const filteredList = getFilteredTransactions();
  const summary = calculateSummary(filteredList, accountBalances);

  document.getElementById("total-balance").textContent = formatCurrency(summary.consolidatedBalance);
  document.getElementById("total-income").textContent = formatCurrency(summary.income);
  document.getElementById("total-expense").textContent = formatCurrency(summary.expense);

  renderChart(filteredList);

  const tableBody = document.getElementById("transactions-list");
  tableBody.innerHTML = "";

  filteredList.forEach((tx) => {
    const row = document.createElement("tr");
    let sign = "-";
    let classColor = "text-expense";
    let accountDisplay = getAccountName(tx.contaId);

    if (tx.tipo === "RECEITA") {
      sign = "+";
      classColor = "text-income";
    } else if (tx.tipo === "TRANSFERENCIA") {
      sign = "⇄";
      classColor = "text-transfer";
      accountDisplay = `${getAccountName(tx.contaId)} → ${getAccountName(tx.contaDestinoId)}`;
    }

    row.innerHTML = `
      <td>${tx.data}</td>
      <td>${tx.descricao}</td>
      <td>${accountDisplay}</td>
      <td>${tx.categoria}</td>
      <td>${tx.tipo}</td>
      <td class="text-right ${classColor}">${sign} ${formatCurrency(tx.valorCentavos)}</td>
      <td class="text-center">
        <button class="btn-delete" onclick="handleDelete('${tx.id}')">Excluir</button>
      </td>
    `;
    tableBody.appendChild(row);
  });
}

function handleDelete(id) {
  transactions = transactions.filter((tx) => tx.id !== id);
  saveTransactions(transactions);
  render();
}

function handleAddAccount(event) {
  event.preventDefault();
  const nome = document.getElementById("acc-name").value.trim();
  const tipo = document.getElementById("acc-type").value;
  const valFloat = parseFloat(document.getElementById("acc-initial").value);

  if (!nome || isNaN(valFloat)) return;

  const cents = Math.round(valFloat * 100);
  accounts.push({
    id: "acc-" + Date.now(),
    nome,
    tipo,
    saldoInicialCentavos: tipo === "CONTA" ? cents : 0,
    limiteCentavos: tipo === "CARTAO" ? cents : 0
  });

  saveAccounts(accounts);
  event.target.reset();
  render();
}

function handleAddTransaction(event) {
  event.preventDefault();

  const tipo = document.getElementById("type").value;
  const date = document.getElementById("date").value;
  const contaId = document.getElementById("account-origin").value;
  const contaDestinoId = document.getElementById("account-destination").value;
  const desc = document.getElementById("desc").value.trim();
  const amountFloat = parseFloat(document.getElementById("amount").value);
  const category = tipo === "TRANSFERENCIA" ? "Transferência" : document.getElementById("category").value.trim();

  if (tipo === "TRANSFERENCIA" && contaId === contaDestinoId) {
    alert("A conta de origem e destino não podem ser iguais.");
    return;
  }

  transactions.unshift({
    id: "tx-" + Date.now(),
    data: date,
    descricao: desc,
    categoria: category,
    tipo,
    contaId,
    contaDestinoId: tipo === "TRANSFERENCIA" ? contaDestinoId : null,
    valorCentavos: Math.round(amountFloat * 100)
  });

  saveTransactions(transactions);
  render();

  event.target.reset();
  toggleTransferFields();
  setDefaultDate();
}

// --- LÓGICA DE IMPORTAÇÃO CSV ---

function normalizeDate(rawDate) {
  const clean = rawDate.trim();
  // Converte DD/MM/AAAA para AAAA-MM-DD
  if (clean.includes("/")) {
    const parts = clean.split("/");
    if (parts.length === 3) {
      return `${parts[2]}-${parts[1].padStart(2, "0")}-${parts[0].padStart(2, "0")}`;
    }
  }
  return clean;
}

function isDuplicate(item, contaId) {
  return transactions.some(
    (tx) =>
      tx.contaId === contaId &&
      tx.data === item.data &&
      tx.descricao.toLowerCase() === item.descricao.toLowerCase() &&
      tx.valorCentavos === item.valorCentavos
  );
}

function handleCsvUpload(event) {
  const file = event.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = function (e) {
    const text = e.target.result;
    const lines = text.split(/\r?\n/).filter((line) => line.trim() !== "");
    const targetAccountId = document.getElementById("import-account").value;

    pendingImports = [];

    lines.forEach((line, index) => {
      const separator = line.includes(";") ? ";" : ",";
      const cols = line.split(separator).map((c) => c.trim().replace(/^"|"$/g, ""));

      if (cols.length < 4) return;
      // Ignora linha de cabeçalho se houver
      if (index === 0 && cols[0].toLowerCase().includes("data")) return;

      const data = normalizeDate(cols[0]);
      const descricao = cols[1];
      const categoria = cols[2] || "Importado";
      // Suporta formato brasileiro (-120,50) ou americano (-120.50)
      const numericStr = cols[3].replace("R$", "").trim().replace(/\./g, "").replace(",", ".");
      const amountFloat = parseFloat(numericStr);

      if (!data || !descricao || isNaN(amountFloat) || amountFloat === 0) return;

      const tipo = amountFloat < 0 ? "DESPESA" : "RECEITA";
      const valorCentavos = Math.round(Math.abs(amountFloat) * 100);

      const candidate = {
        data,
        descricao,
        categoria,
        tipo,
        contaId: targetAccountId,
        valorCentavos
      };

      candidate.duplicate = isDuplicate(candidate, targetAccountId);
      pendingImports.push(candidate);
    });

    renderImportPreview();
  };

  reader.readAsText(file, "UTF-8");
}

function renderImportPreview() {
  const box = document.getElementById("import-preview-box");
  const tbody = document.getElementById("import-preview-list");
  const summary = document.getElementById("preview-summary");

  if (pendingImports.length === 0) {
    alert("Nenhuma movimentação válida encontrada no arquivo CSV.");
    box.style.display = "none";
    return;
  }

  const newCount = pendingImports.filter((i) => !i.duplicate).length;
  const dupCount = pendingImports.length - newCount;

  summary.textContent = `${pendingImports.length} linhas lidas (${newCount} novas, ${dupCount} duplicadas ignoradas)`;
  tbody.innerHTML = "";

  pendingImports.forEach((item) => {
    const row = document.createElement("tr");
    const isIncome = item.tipo === "RECEITA";
    row.innerHTML = `
      <td>
        <span class="status-badge ${item.duplicate ? "status-dup" : "status-new"}">
          ${item.duplicate ? "Duplicado" : "Novo"}
        </span>
      </td>
      <td>${item.data}</td>
      <td>${item.descricao}</td>
      <td>${item.categoria}</td>
      <td class="text-right ${isIncome ? "text-income" : "text-expense"}">
        ${isIncome ? "+" : "-"} ${formatCurrency(item.valorCentavos)}
      </td>
    `;
    tbody.appendChild(row);
  });

  box.style.display = "block";
}

function confirmImport() {
  const validItems = pendingImports.filter((item) => !item.duplicate);

  validItems.forEach((item, idx) => {
    transactions.unshift({
      id: "tx-imp-" + Date.now() + "-" + idx,
      data: item.data,
      descricao: item.descricao,
      categoria: item.categoria,
      tipo: item.tipo,
      contaId: item.contaId,
      contaDestinoId: null,
      valorCentavos: item.valorCentavos
    });
  });

  saveTransactions(transactions);
  cancelImport();
  render();
}

function cancelImport() {
  pendingImports = [];
  document.getElementById("csv-file-input").value = "";
  document.getElementById("import-preview-box").style.display = "none";
}

function downloadSampleCsv() {
  const csvContent =
    "Data;Descricao;Categoria;Valor\n" +
    "2026-11-18;Padaria Central;Alimentacao;-18,50\n" +
    "2026-11-19;Posto Ipiranga;Transporte;-150,00\n" +
    "2026-11-20;Reembolso Projeto;Servicos;320,00\n" +
    "2026-10-05;Supermercado Semanal;Alimentacao;-382,50\n";

  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = "extrato_exemplo.csv";
  link.click();
}

function toggleTransferFields() {
  const tipo = document.getElementById("type").value;
  const destGroup = document.getElementById("group-destination");
  const catGroup = document.getElementById("group-category");
  const catInput = document.getElementById("category");
  const labelOrigin = document.getElementById("label-origin");

  if (tipo === "TRANSFERENCIA") {
    destGroup.style.display = "flex";
    catGroup.style.display = "none";
    catInput.required = false;
    labelOrigin.textContent = "Conta de Origem";
  } else {
    destGroup.style.display = "none";
    catGroup.style.display = "flex";
    catInput.required = true;
    labelOrigin.textContent = "Conta / Cartão";
  }
}

function setDefaultDate() {
  const dateInput = document.getElementById("date");
  if (dateInput) dateInput.value = new Date().toISOString().split("T")[0];
}

document.addEventListener("DOMContentLoaded", () => {
  setDefaultDate();
  toggleTransferFields();
  render();

  document.getElementById("type").addEventListener("change", toggleTransferFields);
  document.getElementById("account-form").addEventListener("submit", handleAddAccount);
  document.getElementById("transaction-form").addEventListener("submit", handleAddTransaction);
  document.getElementById("filter-search").addEventListener("input", render);
  document.getElementById("filter-type").addEventListener("change", render);

  // Eventos de Importação
  document.getElementById("csv-file-input").addEventListener("change", handleCsvUpload);
  document.getElementById("btn-confirm-import").addEventListener("click", confirmImport);
  document.getElementById("btn-cancel-import").addEventListener("click", cancelImport);
  document.getElementById("btn-sample-csv").addEventListener("click", downloadSampleCsv);
});