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

  categories.forEach((cat, cIdx) => {
    const section = document.createElement("section");
    section.className = "menu-section glass";

    const title = document.createElement("h3");
    title.className = "menu-title";
    title.textContent = `${iconFor(cat.category)} ${cat.category}`;
    section.appendChild(title);

    const list = document.createElement("div");
    list.className = "items";

    cat.items.forEach((it, iIdx) => {
      const row = document.createElement("div");
      row.className = "item";
      row.dataset.name = it.name;
      row.dataset.price = String(it.price);

      row.innerHTML = `
        <span class="item-name">${it.name}</span>
        <span class="item-price">£${Number(it.price).toFixed(2)}</span>
        <input
          type="number"
          class="qty-input"
          min="0"
          value="0"
          inputmode="numeric"
          aria-label="Quantity for ${it.name}"
        />
      `;

      list.appendChild(row);
    });

    section.appendChild(list);
    container.appendChild(section);
  });

  return categories;
}