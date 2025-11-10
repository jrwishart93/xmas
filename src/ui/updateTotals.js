// src/ui/updateTotals.js
import { currency } from "../utils/currency.js";

export function attachTotalHandler(menu, totalElement, submitButton, maxBudget) {
  const inputs = document.querySelectorAll(".qty-input");

  function update() {
    let total = 0;

    inputs.forEach((input) => {
      const index = Number(input.dataset.index);
      const qty = Number(input.value);
      total += qty * menu[index].price;
    });

    const remaining = maxBudget - total;
    totalElement.textContent = currency(remaining);

    submitButton.disabled = remaining < 0;
  }

  inputs.forEach((input) => {
    input.addEventListener("change", update);
    input.addEventListener("input", update);
  });

  // Initialize with 0 totals
  update();
}
