import { db } from './firebase.js';
import { doc, updateDoc } from "https://www.gstatic.com/firebasejs/10.5.0/firebase-firestore.js";

const userId = localStorage.getItem("xmasUser");
if (!userId) {
    window.location.href = 'index.html';
}

const budget = 20;
let menuData = [];
let selections = {};

const remainingBudgetElement = document.getElementById('remaining-budget');
const menuContainer = document.getElementById('menu-container');
const submitButton = document.getElementById('submit-choices');

async function fetchMenu() {
    const response = await fetch('./public/drinks.json');
    menuData = await response.json();
    renderMenu();
    updateBudget();
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
            itemDiv.classList.add('item');
            
            const itemName = document.createElement('span');
            itemName.textContent = item.name;
            
            const itemPrice = document.createElement('span');
            itemPrice.textContent = `£${item.price.toFixed(2)}`;

            const quantitySelect = document.createElement('select');
            quantitySelect.dataset.itemName = item.name;
            for (let i = 0; i <= 5; i++) {
                const option = document.createElement('option');
                option.value = i;
                option.textContent = i;
                quantitySelect.appendChild(option);
            }
            quantitySelect.addEventListener('change', handleSelectionChange);

            itemDiv.appendChild(itemName);
            itemDiv.appendChild(itemPrice);
            itemDiv.appendChild(quantitySelect);
            categoryDiv.appendChild(itemDiv);
        });
        menuContainer.appendChild(categoryDiv);
    });
}

function handleSelectionChange(event) {
    const itemName = event.target.dataset.itemName;
    const quantity = parseInt(event.target.value, 10);

    if (quantity > 0) {
        selections[itemName] = quantity;
    } else {
        delete selections[itemName];
    }
    updateBudget();
}

function updateBudget() {
    let totalSpent = 0;
    for (const itemName in selections) {
        const item = findItem(itemName);
        if (item) {
            totalSpent += item.price * selections[itemName];
        }
    }

    const remainingBudget = budget - totalSpent;
    remainingBudgetElement.textContent = `£${remainingBudget.toFixed(2)}`;

    if (remainingBudget < 0) {
        remainingBudgetElement.style.color = 'red';
        submitButton.disabled = true;
    } else {
        remainingBudgetElement.style.color = 'black';
        submitButton.disabled = Object.keys(selections).length === 0;
    }
}

function findItem(itemName) {
    for (const category of menuData) {
        const item = category.items.find(i => i.name === itemName);
        if (item) {
            return item;
        }
    }
    return null;
}

submitButton.addEventListener('click', async () => {
    let totalSpent = 0;
    const choicesToSave = {};
    for (const itemName in selections) {
        const item = findItem(itemName);
        if (item) {
            totalSpent += item.price * selections[itemName];
            choicesToSave[itemName] = selections[itemName];
        }
    }
    const remainingBudget = budget - totalSpent;

    const userRef = doc(db, "users", userId);
    try {
        await updateDoc(userRef, {
            choices: choicesToSave,
            totalSpent: totalSpent,
            remainingBudget: remainingBudget,
            hasSubmitted: true
        });
        window.location.href = 'complete.html';
    } catch (error) {
        console.error("Error updating document: ", error);
        alert('Failed to save choices. Please try again.');
    }
});

fetchMenu();