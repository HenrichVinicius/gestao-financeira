// Lógica matemática dos Simuladores Financeiros (Etapa 06)

function formatBRL(value) {
  return value.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL"
  });
}

// 1. Simulador de Empréstimo (Price vs SAC + CET)
function handleLoanSimulation(event) {
  event.preventDefault();

  const principal = parseFloat(document.getElementById("loan-amount").value);
  const monthlyRatePct = parseFloat(document.getElementById("loan-rate").value);
  const months = parseInt(document.getElementById("loan-months").value, 10);
  const extraFees = parseFloat(document.getElementById("loan-fees").value) || 0;
  const system = document.getElementById("loan-system").value;

  if (isNaN(principal) || isNaN(monthlyRatePct) || isNaN(months) || principal <= 0 || months <= 0) {
    return;
  }

  const i = monthlyRatePct / 100;
  let firstInstallment = 0;
  let lastInstallment = 0;
  let totalPaid = 0;

  if (system === "PRICE") {
    // Parcelas fixas: PMT = PV * [i(1+i)^n] / [(1+i)^n - 1]
    if (i === 0) {
      firstInstallment = principal / months;
    } else {
      const factor = Math.pow(1 + i, months);
      firstInstallment = principal * ((i * factor) / (factor - 1));
    }
    lastInstallment = firstInstallment;
    totalPaid = firstInstallment * months;
  } else {
    // SAC: Amortização constante + juros decrescentes
    const amortization = principal / months;
    firstInstallment = amortization + principal * i;
    lastInstallment = amortization + amortization * i;
    // Soma da PA das parcelas
    totalPaid = ((firstInstallment + lastInstallment) / 2) * months;
  }

  const totalInterest = totalPaid - principal;
  const totalCostWithFees = totalPaid + extraFees;
  const cetPercent = ((totalCostWithFees - principal) / principal) * 100;

  const resultBox = document.getElementById("loan-result");
  resultBox.style.display = "grid";
  resultBox.innerHTML = `
    <div class="sim-metric">
      <span>${system === "PRICE" ? "Parcela Fixa" : "1ª / Última Parcela"}</span>
      <strong>${
        system === "PRICE"
          ? formatBRL(firstInstallment)
          : `${formatBRL(firstInstallment)} → ${formatBRL(lastInstallment)}`
      }</strong>
    </div>
    <div class="sim-metric">
      <span>Total em Juros</span>
      <strong class="text-expense">${formatBRL(totalInterest)}</strong>
    </div>
    <div class="sim-metric">
      <span>Total a Pagar (+ Taxas)</span>
      <strong>${formatBRL(totalCostWithFees)}</strong>
    </div>
    <div class="sim-metric">
      <span>Custo Efetivo Total (Período)</span>
      <strong class="text-transfer">${cetPercent.toFixed(2)}%</strong>
    </div>
  `;
}

// 2. Simulador de Investimentos (Juros Compostos + Tabela Regressiva IR)
function getIrRateByMonths(months) {
  const days = months * 30;
  if (days <= 180) return 0.225; // 22,5%
  if (days <= 360) return 0.20;  // 20,0%
  if (days <= 720) return 0.175; // 17,5%
  return 0.15;                   // 15,0%
}

function handleInvestmentSimulation(event) {
  event.preventDefault();

  const initial = parseFloat(document.getElementById("inv-initial").value) || 0;
  const monthly = parseFloat(document.getElementById("inv-monthly").value) || 0;
  const monthlyRatePct = parseFloat(document.getElementById("inv-rate").value);
  const months = parseInt(document.getElementById("inv-months").value, 10);
  const isTaxExempt = document.getElementById("inv-exempt").checked;

  if (isNaN(monthlyRatePct) || isNaN(months) || months <= 0) return;

  const i = monthlyRatePct / 100;
  let grossTotal = initial;

  for (let m = 1; m <= months; m++) {
    grossTotal = grossTotal * (1 + i) + monthly;
  }

  const totalInvested = initial + monthly * months;
  const grossProfit = Math.max(0, grossTotal - totalInvested);

  const irRate = isTaxExempt ? 0 : getIrRateByMonths(months);
  const taxAmount = grossProfit * irRate;
  const netProfit = grossProfit - taxAmount;
  const netTotal = totalInvested + netProfit;

  const resultBox = document.getElementById("inv-result");
  resultBox.style.display = "grid";
  resultBox.innerHTML = `
    <div class="sim-metric">
      <span>Total Investido</span>
      <strong>${formatBRL(totalInvested)}</strong>
    </div>
    <div class="sim-metric">
      <span>Rendimento Bruto</span>
      <strong class="text-income">+ ${formatBRL(grossProfit)}</strong>
    </div>
    <div class="sim-metric">
      <span>Imposto de Renda (${(irRate * 100).toFixed(1)}%)</span>
      <strong class="text-expense">- ${formatBRL(taxAmount)}</strong>
    </div>
    <div class="sim-metric">
      <span>Valor Líquido Final</span>
      <strong class="text-transfer">${formatBRL(netTotal)}</strong>
    </div>
  `;
}

document.addEventListener("DOMContentLoaded", () => {
  const loanForm = document.getElementById("loan-form");
  const invForm = document.getElementById("inv-form");

  if (loanForm) loanForm.addEventListener("submit", handleLoanSimulation);
  if (invForm) invForm.addEventListener("submit", handleInvestmentSimulation);
});