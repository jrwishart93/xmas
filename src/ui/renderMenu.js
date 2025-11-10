// src/ui/renderMenu.js
import { fetchMenu } from "../data/loadMenu.js";

export async function renderMenu(container) {
  const menu = await fetchMenu();

  menu.forEach((item, index) => {
    const div = document.createElement("div");
    div.className = "item";

    div.innerHTML = `
      <span>${item.name} — £${item.price.toFixed(2)}</span>
      <input type="number" class="qty-input" min="0" value="0"
             data-index="${index}">
    `;
    container.appendChild(div);
  });

  return menu;
}
