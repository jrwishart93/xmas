export function calculateTotals() {
  let total = 0;
  let selections = {};

  document.querySelectorAll(".menu-item").forEach(item => {
    const name = item.dataset.name;
    const price = parseFloat(item.dataset.price);
    const qtyInput = item.querySelector(".qty-input");
    const qty = Number(qtyInput.value || 0);

    if (qty > 0) {
      selections[name] = { qty, price };
      total += qty * price;
    }
  });

  return { total, selections };
}