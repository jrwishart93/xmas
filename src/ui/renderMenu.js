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
      const row = document.createElement("div");
      row.classList.add("item", "menu-item", "drink-item");
      row.dataset.name = it.name;
      row.dataset.price = String(it.price);
      row.dataset.quantity = "0";

      const infoWrap = document.createElement("div");
      infoWrap.className = "drink-info";

      const nameSpan = document.createElement("span");
      nameSpan.className = "item-name";
      nameSpan.textContent = it.name;

      const priceSpan = document.createElement("span");
      priceSpan.className = "item-price";
      priceSpan.textContent = `£${Number(it.price).toFixed(2)}`;

      infoWrap.appendChild(nameSpan);
      infoWrap.appendChild(priceSpan);

      const createQuantityStepper = () => {
        const stepper = document.createElement("div");
        stepper.className = "qty-stepper";
        stepper.dataset.value = "0";

        const toggleMinusState = (value) => {
          const isDisabled = value === 0;
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
          const current = Number(stepper.dataset.value) || 0;
          if (current === 0) return;
          updateQuantity(current - 1);
        });

        plusBtn.addEventListener("click", () => {
          const current = Number(stepper.dataset.value) || 0;
          updateQuantity(current + 1);
        });

        stepper.appendChild(minusBtn);
        stepper.appendChild(display);
        stepper.appendChild(plusBtn);

        toggleMinusState(0);
        return stepper;
      };

      const quantityStepper = createQuantityStepper();

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