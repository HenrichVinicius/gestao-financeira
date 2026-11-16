const STORAGE_KEY = "gestao_financeira_transacoes";
let expensesChartInstance = null;

function loadTransactions() {
  const data = localStorage.getItem(STORAGE_KEY);
  if (data) {
    try {
      return JSON.parse(data);
    } catch (e) {
      console.error("Erro ao ler localStorage", e);
    }
  }
  saveTransactions(mockTransactions);
  return [...mockTransactions];
}

function saveTransactions(transactions) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(transactions));
}

let transactions = loadTransactions();

function formatCurrency(cents) {
  return (cents / 100).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL"
  });
}

function calculateSummary(list) {
  let income = 0;
  let expense = 0;

  list.forEach((tx) => {
    if (tx.tipo === "RECEITA") {
      income += tx.valorCentavos;
    } else if (tx.tipo === "DESPESA") {
      expense += tx.valorCentavos;
    }
  });

  return {
    income,
    expense,
    balance: income - expense
  };
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

  // Agrupa despesas por categoria
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

  const colors = [
    "#38bdf8", "#f43f5e", "#eab308", "#a855f7",
    "#22c55e", "#f97316", "#14b8a6", "#ec4899"
  ];

  expensesChartInstance = new Chart(canvas, {
    type: "doughnut",
    data: {
      labels: labels,
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
        legend: {
          position: "right",
          labels: {
            color: "#f8fafc",
            font: { size: 12 }
          }
        },
        tooltip: {
          callbacks: {
            label: function (context) {
              const val = context.parsed || 0;
              return " " + val.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
            }
          }
        }
      }
    }
  });
}

function render() {
  const filteredList = getFilteredTransactions();

  // Os cartões superiores refletem os lançamentos filtrados
  const summary = calculateSummary(filteredList);
  document.getElementById("total-income").textContent = formatCurrency(summary.income);
  document.getElementById("total-expense").textContent = formatCurrency(summary.expense);
  document.getElementById("total-balance").textContent = formatCurrency(summary.balance);

  // Atualiza o gráfico com base nos lançamentos filtrados
  renderChart(filteredList);

  // Renderiza a tabela
  const tableBody = document.getElementById("transactions-list");
  tableBody.innerHTML = "";

  filteredList.forEach((tx) => {
    const row = document.createElement("tr");
    const isIncome = tx.tipo === "RECEITA";
    const sign = isIncome ? "+" : "-";
    const classColor = isIncome ? "text-income" : "text-expense";

    row.innerHTML = `
      <td>${tx.data}</td>
      <td>${tx.descricao}</td>
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

function handleAddTransaction(event) {
  event.preventDefault();

  const desc = document.getElementById("desc").value.trim();
  const amountFloat = parseFloat(document.getElementById("amount").value);
  const date = document.getElementById("date").value;
  const type = document.getElementById("type").value;
  const category = document.getElementById("category").value.trim();

  if (!desc || isNaN(amountFloat) || !date || !category) {
    alert("Por favor, preencha todos os campos.");
    return;
  }

  const valorCentavos = Math.round(amountFloat * 100);

  const newTx = {
    id: "tx-" + Date.now(),
    data: date,
    descricao: desc,
    categoria: category,
    tipo: type,
    valorCentavos: valorCentavos
  };

  transactions.unshift(newTx);
  saveTransactions(transactions);
  render();

  event.target.reset();
  setDefaultDate();
}

function setDefaultDate() {
  const dateInput = document.getElementById("date");
  if (dateInput) {
    dateInput.value = new Date().toISOString().split("T")[0];
  }
}

document.addEventListener("DOMContentLoaded", () => {
  setDefaultDate();
  render();

  document.getElementById("transaction-form").addEventListener("submit", handleAddTransaction);
  document.getElementById("filter-search").addEventListener("input", render);
  document.getElementById("filter-type").addEventListener("change", render);
});