// src/ui/updateTotals.js

export function calculateTotals() {
  let total = 0;
  const selections = [];

  // Loop over ALL rendered menu items
  document.querySelectorAll(".menu-item").forEach(item => {
    const name = item.dataset.name;
    const price = Number(item.dataset.price);
    const qtyInput = item.querySelector(".qty-input");

    if (!name || isNaN(price) || !qtyInput) return;

    const qty = Number(qtyInput.value) || 0;

    if (qty > 0) {
      const lineTotal = qty * price;
      total += lineTotal;

      selections.push({
        name,
        price,
        qty
      });
    }
  });

  // Ensure totals never become invalid
  if (isNaN(total)) total = 0;

  return {
    total: Number(total.toFixed(2)),
    selections
  };
}