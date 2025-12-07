// src/ui/updateTotals.js

export function calculateTotals() {
  let total = 0;
  const selections = [];

  const explicitItems = document.querySelectorAll('.menu-item');
  const items = explicitItems.length ? explicitItems : document.querySelectorAll('.item');

  items.forEach((item) => {
    const name = item.dataset.name;
    const price = Number.parseFloat(item.dataset.price);
    if (!name || !Number.isFinite(price)) return;

    const qtyDisplay = item.querySelector('.qty-display');
    const qtyInput = item.querySelector('.qty-input');
    const qtyFromDataset = item.dataset.quantity;
    const qty = Number(
      qtyFromDataset ?? qtyDisplay?.textContent ?? qtyInput?.value ?? 0
    ) || 0;

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

export function attachTotalHandler({
  budgetTextElement,
  budgetBarElement,
  submitButton,
  maxBudget = 20,
  onTotalsChange,
} = {}) {
  const updateBudgetVisual = (remaining) => {
    if (!budgetBarElement) return;
    budgetBarElement.classList.remove('ok', 'warn', 'over');

    if (remaining < 0) {
      budgetBarElement.classList.add('over');
    } else if (remaining <= 5) {
      budgetBarElement.classList.add('warn');
    } else {
      budgetBarElement.classList.add('ok');
    }
  };

  const updateRemaining = (remaining) => {
    if (budgetTextElement) {
      budgetTextElement.innerText = `Budget: £${remaining.toFixed(2)}`;
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
      const safeValue = Number.isFinite(numeric) ? Math.max(0, numeric) : 0;
      input.value = safeValue;
      recalc();
    });
  });

  document.querySelectorAll('.qty-stepper').forEach((stepper) => {
    stepper.addEventListener('quantitychange', () => {
      const parentItem = stepper.closest('.menu-item, .item');
      if (parentItem) {
        parentItem.dataset.quantity = stepper.dataset.value || '0';
      }
      recalc();
    });
  });

  recalc();
  return recalc;
}
