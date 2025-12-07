// src/ui/renderMenu.js
import { fetchMenu } from "../data/loadMenu.js";

// optional: a tiny icon map for fun
const iconFor = (cat) => {
  const m = {
    "Tank & Tap Beers": "🍺",
    "Beer Bottles & Cans": "🧴",
    "Beer Flights": "🧪",
    "Sparkling Wine": "🥂",
    "White Wine": "🍷",
    "Red Wine": "🍷",
    "Rosé / Orange Wine": "🌸",
    "Cocktails": "🍸",
    "Spirits – Speciality": "🥃",
    "Spirits – Tequila": "🪅",
    "Spirits – Vodka": "❄️",
    "Spirits – Rum": "🏴‍☠️",
    "Schnapps": "🍶",
    "Alcohol-Free Cocktails": "🫗",
    "Alcohol-Free Beers": "🍺",
  };
  if (cat?.startsWith("Spirits")) return "🥃";
  if (cat?.startsWith("Alcohol-Free")) return "🫗";
  return m[cat] || "🎄";
};

const formatPrice = (price) =>
  Number.isFinite(price) ? `£${Number(price).toFixed(2)}` : "TBC";

export async function renderMenu(container) {
  container.innerHTML = ""; // clear
  const categories = await fetchMenu(); // [{category, items:[{name,price}]}]

  // Render each category inside an accordion-style container.
  categories.forEach((cat) => {
    const category = document.createElement("div");
    category.className = "menu-section glass category";

    const header = document.createElement("button");
    header.type = "button";
    header.className = "category-header";
    header.setAttribute("aria-expanded", "false");
    header.innerHTML = `<span class="menu-title">${iconFor(cat.category)} ${cat.category}</span>`;

    const content = document.createElement("div");
    content.className = "category-content";

    const list = document.createElement("div");
    list.className = "items";

    cat.items.forEach((it) => {
      const hasPrice = Number.isFinite(it.price);
      const row = document.createElement("div");
      row.classList.add("item", "menu-item", "drink-item");
      row.dataset.name = it.name;
      row.dataset.price = hasPrice ? String(it.price) : "";
      row.dataset.quantity = "0";
      if (!hasPrice) {
        row.setAttribute("aria-disabled", "true");
        row.classList.add("item--unpriced");
      }

      const infoWrap = document.createElement("div");
      infoWrap.className = "drink-info";

      const nameSpan = document.createElement("span");
      nameSpan.className = "item-name";
      nameSpan.textContent = it.name;

      const priceSpan = document.createElement("span");
      priceSpan.className = "item-price";
      priceSpan.textContent = formatPrice(it.price);

      infoWrap.appendChild(nameSpan);
      infoWrap.appendChild(priceSpan);

      const createQuantityStepper = (enabled = true) => {
        const stepper = document.createElement("div");
        stepper.className = "qty-stepper";
        stepper.dataset.value = "0";

        const toggleMinusState = (value) => {
          const isDisabled = value === 0 || !enabled;
          if (isDisabled) {
            minusBtn.classList.add("is-disabled");
            minusBtn.setAttribute("aria-disabled", "true");
          } else {
            minusBtn.classList.remove("is-disabled");
            minusBtn.removeAttribute("aria-disabled");
          }
        };

        const updateQuantity = (nextValue) => {
          const safeValue = Math.max(0, Number(nextValue) || 0);
          stepper.dataset.value = String(safeValue);
          row.dataset.quantity = String(safeValue);
          display.textContent = String(safeValue);
          display.setAttribute(
            "aria-label",
            `Quantity for ${it.name}: ${safeValue}`
          );
          stepper.dispatchEvent(
            new CustomEvent("quantitychange", {
              bubbles: true,
              detail: { value: safeValue },
            })
          );
          toggleMinusState(safeValue);
        };

        const minusBtn = document.createElement("button");
        minusBtn.type = "button";
        minusBtn.className = "qty-btn qty-btn--minus";
        minusBtn.setAttribute(
          "aria-label",
          `Decrease quantity for ${it.name}`
        );
        minusBtn.textContent = "−";

        const display = document.createElement("span");
        display.className = "qty-display";
        display.setAttribute("aria-live", "polite");
        display.textContent = "0";
        display.setAttribute("aria-label", `Quantity for ${it.name}: 0`);

        const plusBtn = document.createElement("button");
        plusBtn.type = "button";
        plusBtn.className = "qty-btn qty-btn--plus";
        plusBtn.setAttribute("aria-label", `Increase quantity for ${it.name}`);
        plusBtn.textContent = "+";

        minusBtn.addEventListener("click", () => {
          if (!enabled) return;
          const current = Number(stepper.dataset.value) || 0;
          if (current === 0) return;
          updateQuantity(current - 1);
        });

        plusBtn.addEventListener("click", () => {
          if (!enabled) return;
          const current = Number(stepper.dataset.value) || 0;
          updateQuantity(current + 1);
        });

        minusBtn.disabled = !enabled;
        plusBtn.disabled = !enabled;
        stepper.classList.toggle("is-disabled", !enabled);

        stepper.appendChild(minusBtn);
        stepper.appendChild(display);
        stepper.appendChild(plusBtn);

        toggleMinusState(0);
        return stepper;
      };

      const quantityStepper = createQuantityStepper(hasPrice);

      row.appendChild(infoWrap);
      row.appendChild(quantityStepper);
      list.appendChild(row);
    });

    content.appendChild(list);
    category.appendChild(header);
    category.appendChild(content);
    container.appendChild(category);
  });

  document.querySelectorAll(".category-header").forEach((header) => {
    header.addEventListener("click", () => {
      const content = header.nextElementSibling;
      const isOpen = header.getAttribute("aria-expanded") === "true";

      if (isOpen) {
        // Close
        content.style.maxHeight = "0px";
        content.classList.remove("open");
        header.setAttribute("aria-expanded", "false");
      } else {
        // Open (force reflow for mobile browsers)
        content.classList.add("open");
        content.style.maxHeight = content.scrollHeight + "px";
        header.setAttribute("aria-expanded", "true");
      }
    });
  });

  return categories;
}
