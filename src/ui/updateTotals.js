// src/ui/updateTotals.js

export function calculateTotals() {
  let total = 0;
  const selections = [];

  const explicitItems = document.querySelectorAll('.menu-item');
  const items = explicitItems.length ? explicitItems : document.querySelectorAll('.item');

  items.forEach((item) => {
    const name = item.dataset.name;
    const price = Number(item.dataset.price);
    const qtyInput = item.querySelector('.qty-input');

    if (!name || isNaN(price) || !qtyInput) return;

    const qty = Number(qtyInput.value) || 0;

    if (qty > 0) {
      const lineTotal = qty * price;
      total += lineTotal;

      selections.push({
        name,
        price,
        qty,
      });
    }
  });

  if (isNaN(total)) total = 0;

  return {
    total: Number(total.toFixed(2)),
    selections,
  };
}

function formatCurrency(value) {
  const formatter = new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: 'GBP',
    minimumFractionDigits: 2,
  });
  return formatter.format(value);
}

export function attachTotalHandler({
  remainingElement,
  submitButton,
  budgetElement,
  maxBudget = 20,
  onTotalsChange,
} = {}) {
  const updateBudgetVisual = (remaining) => {
    if (!budgetElement) return;
    budgetElement.classList.remove('ok', 'warn', 'over');

    if (remaining < 0) {
      budgetElement.classList.add('over');
    } else if (remaining <= 5) {
      budgetElement.classList.add('warn');
    } else {
      budgetElement.classList.add('ok');
    }
  };

  const updateRemaining = (remaining) => {
    if (remainingElement) {
      remainingElement.textContent = formatCurrency(remaining);
    }
  };

  const updateButtonState = (disabled) => {
    if (submitButton) {
      submitButton.disabled = disabled;
    }
  };

  const recalc = () => {
    const { total, selections } = calculateTotals();
    const remaining = Number((maxBudget - total).toFixed(2));
    const overspent = remaining < 0;

    updateRemaining(remaining);
    updateBudgetVisual(remaining);
    updateButtonState(overspent || selections.length === 0);

    onTotalsChange?.({ total, selections, remaining, overspent });
  };

  document.querySelectorAll('.qty-input').forEach((input) => {
    input.addEventListener('input', () => {
      const numeric = Number(input.value);
      const safeValue = Number.isFinite(numeric) ? Math.min(5, Math.max(0, numeric)) : 0;
      input.value = safeValue;
      recalc();
    });
  });

  recalc();
  return recalc;
}
