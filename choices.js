import { db } from "./firebase/firebaseConfig.js";
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/10.5.0/firebase-firestore.js";
import { saveUserSelections } from "./src/data/saveChoices.js";
import { calculateTotals } from "./src/ui/updateTotals.js";

const userId = localStorage.getItem("xmasUser");
if (!userId) {
    window.location.href = 'index.html';
}

async function loadExistingChoices(userId) {
  const userRef = doc(db, "users", userId);
  const snap = await getDoc(userRef);

  if (!snap.exists()) return null;
  const data = snap.data();

  return {
    selections: data.selections || {},
    budget: data.budget ?? 20,
    totalSpent: data.totalSpent || 0
  };
}

let menuData = [];

const remainingBudgetElement = document.getElementById('remaining-budget');
const menuContainer = document.getElementById('menu-container');
const submitButton = document.getElementById('submit-choices');

async function fetchMenu() {
    const response = await fetch('./public/drinks.json');
    menuData = await response.json();
    renderMenu();
    
    const existing = await loadExistingChoices(userId);

    if (existing) {
      // Restore each item
      Object.keys(existing.selections).forEach(itemName => {
        const { qty } = existing.selections[itemName];
    
        const qtyInput = document.querySelector(`[data-name="${itemName}"] .qty-input`);
    
        if (qtyInput) {
          qtyInput.value = qty;
        }
      });
    
      // Restore remaining budget
      document.getElementById("remaining-budget").textContent = 
          `£${(20 - existing.totalSpent).toFixed(2)}`;
    
      updateTotals();
    }
}

function renderMenu() {
    menuContainer.innerHTML = '';
    menuData.forEach(category => {
        const categoryDiv = document.createElement('div');
        categoryDiv.classList.add('card');
        const categoryTitle = document.createElement('h2');
        categoryTitle.textContent = category.category;
        categoryDiv.appendChild(categoryTitle);

        category.items.forEach(item => {
            const itemDiv = document.createElement('div');
            itemDiv.classList.add('menu-item');
            itemDiv.dataset.name = item.name;
            itemDiv.dataset.price = item.price;
            
            const itemName = document.createElement('span');
            itemName.textContent = item.name;
            
            const itemPrice = document.createElement('span');
            itemPrice.textContent = `£${item.price.toFixed(2)}`;

            const quantityInput = document.createElement('input');
            quantityInput.type = 'number';
            quantityInput.min = 0;
            quantityInput.max = 5;
            quantityInput.value = 0;
            quantityInput.classList.add('qty-input');
            quantityInput.addEventListener('change', updateTotals);

            itemDiv.appendChild(itemName);
            itemDiv.appendChild(itemPrice);
            itemDiv.appendChild(quantityInput);
            categoryDiv.appendChild(itemDiv);
        });
        menuContainer.appendChild(categoryDiv);
    });
}

function updateTotals() {
    const { total, selections } = calculateTotals();
    const remaining = 20 - total;

    remainingBudgetElement.textContent = `£${remaining.toFixed(2)}`;

    if (remaining < 0) {
        remainingBudgetElement.style.color = 'red';
        submitButton.disabled = true;
    } else {
        remainingBudgetElement.style.color = 'black';
        submitButton.disabled = total === 0;
    }
}

submitButton.addEventListener('click', async () => {
  const { total, selections } = calculateTotals();

  if (total > 20) {
    alert("You cannot spend more than £20!");
    return;
  }

  await saveUserSelections(userId, selections, total);

  alert("Your order has been saved!");
  window.location.href = "complete.html";
});

fetchMenu();
