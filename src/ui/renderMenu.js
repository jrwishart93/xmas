// src/ui/renderMenu.js
import { fetchMenu } from "../data/loadMenu.js";

// optional: a tiny icon map for fun
const iconFor = (cat) => {
  const m = {
    "Tap Beers": "🍺",
    "Bottles & Cans": "🧴",
    "Sparkling": "🥂",
    "White Wine": "🍷",
    "Red Wine": "🍷",
    "Rosé / Orange": "🌸",
    "Cocktails": "🍸",
    "Spirits": "🥃",
    "Schnapps": "🍶",
    "No & Low": "🫗",
    "Alcohol-Free Beers": "🍺",
    "Alcohol-Free Spirits": "🧊",
    "Alcohol-Free Wine": "🍷",
    "Soft Drinks": "🥤",
    "Bites": "🍟",
    "Sharers": "🧀"
  };
  return m[cat] || "🎄";
};

export async function renderMenu(container) {
  container.innerHTML = ""; // clear
  const categories = await fetchMenu(); // [{category, items:[{name,price}]}]

  categories.forEach((cat) => {
    const section = document.createElement("section");
    section.className = "menu-section glass";

    const title = document.createElement("h3");
    title.className = "menu-title";
    title.textContent = `${iconFor(cat.category)} ${cat.category}`;
    section.appendChild(title);

    const list = document.createElement("div");
    list.className = "items";

    cat.items.forEach((it) => {
      const row = document.createElement("div");
      row.classList.add("item", "menu-item");
      row.dataset.name = it.name;
      row.dataset.price = String(it.price);

      const nameSpan = document.createElement("span");
      nameSpan.className = "item-name";
      nameSpan.textContent = it.name;

      const priceSpan = document.createElement("span");
      priceSpan.className = "item-price";
      priceSpan.textContent = `£${Number(it.price).toFixed(2)}`;

      const quantityInput = document.createElement("input");
      quantityInput.type = "number";
      quantityInput.className = "qty-input";
      quantityInput.min = "0";
      quantityInput.max = "5";
      quantityInput.value = "0";
      quantityInput.inputMode = "numeric";
      quantityInput.setAttribute(
        "aria-label",
        `Quantity for ${it.name}`
      );

      row.appendChild(nameSpan);
      row.appendChild(priceSpan);
      row.appendChild(quantityInput);
      list.appendChild(row);
    });

    section.appendChild(list);
    container.appendChild(section);
  });

  return categories;
}