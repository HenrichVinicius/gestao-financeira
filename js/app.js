const TX_STORAGE_KEY = "gestao_financeira_transacoes_v2";
const ACC_STORAGE_KEY = "gestao_financeira_contas_v2";
let expensesChartInstance = null;

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

// Calcula saldo atual de cada conta e fatura atual de cada cartão
function calculateAccountBalances() {
  const balances = {};

  accounts.forEach((acc) => {
    if (acc.tipo === "CONTA") {
      balances[acc.id] = acc.saldoInicialCentavos || 0;
    } else {
      // Para cartão de crédito, acumula o valor da fatura atual
      balances[acc.id] = 0;
    }
  });

  transactions.forEach((tx) => {
    if (tx.tipo === "RECEITA") {
      if (balances[tx.contaId] !== undefined) {
        balances[tx.contaId] += tx.valorCentavos;
      }
    } else if (tx.tipo === "DESPESA") {
      const acc = accounts.find((a) => a.id === tx.contaId);
      if (acc) {
        if (acc.tipo === "CONTA") {
          balances[acc.id] -= tx.valorCentavos;
        } else if (acc.tipo === "CARTAO") {
          // Despesa no cartão aumenta a fatura
          balances[acc.id] += tx.valorCentavos;
        }
      }
    } else if (tx.tipo === "TRANSFERENCIA") {
      if (balances[tx.contaId] !== undefined) {
        balances[tx.contaId] -= tx.valorCentavos;
      }
      if (balances[tx.contaDestinoId] !== undefined) {
        balances[tx.contaDestinoId] += tx.valorCentavos;
      }
    }
  });

  return balances;
}

// Calcula indicadores gerais (Transferências NÃO entram como receita/despesa)
function calculateSummary(list, accountBalances) {
  let income = 0;
  let expense = 0;

  list.forEach((tx) => {
    if (tx.tipo === "RECEITA") {
      income += tx.valorCentavos;
    } else if (tx.tipo === "DESPESA") {
      expense += tx.valorCentavos;
    }
  });

  // Saldo consolidado soma apenas contas correntes/carteiras
  let consolidatedBalance = 0;
  accounts.forEach((acc) => {
    if (acc.tipo === "CONTA") {
      consolidatedBalance += accountBalances[acc.id] || 0;
    }
  });

  return { income, expense, consolidatedBalance };
}

function renderAccounts(accountBalances) {
  const container = document.getElementById("accounts-list");
  const originSelect = document.getElementById("account-origin");
  const destSelect = document.getElementById("account-destination");

  container.innerHTML = "";
  originSelect.innerHTML = "";
  destSelect.innerHTML = "";

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

    // Popula seletores do formulário
    const opt1 = new Option(acc.nome, acc.id);
    originSelect.add(opt1);

    if (!isCard) {
      const opt2 = new Option(acc.nome, acc.id);
      destSelect.add(opt2);
    }
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

  if (expensesChartInstance) {
    expensesChartInstance.destroy();
  }

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
  const newAcc = {
    id: "acc-" + Date.now(),
    nome,
    tipo,
    saldoInicialCentavos: tipo === "CONTA" ? cents : 0,
    limiteCentavos: tipo === "CARTAO" ? cents : 0
  };

  accounts.push(newAcc);
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

  const newTx = {
    id: "tx-" + Date.now(),
    data: date,
    descricao: desc,
    categoria: category,
    tipo,
    contaId,
    contaDestinoId: tipo === "TRANSFERENCIA" ? contaDestinoId : null,
    valorCentavos: Math.round(amountFloat * 100)
  };

  transactions.unshift(newTx);
  saveTransactions(transactions);
  render();

  event.target.reset();
  toggleTransferFields();
  setDefaultDate();
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
});