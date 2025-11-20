import { renderMenu } from "./src/ui/renderMenu.js";
import { attachTotalHandler } from "./src/ui/updateTotals.js";
import { saveUserSelections } from "./src/data/saveChoices.js";
import { db } from "./firebase.js";
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/10.5.0/firebase-firestore.js";

const MAX_BUDGET = 20;
const budgetTextElement = document.getElementById("budgetText");
const budgetBarElement = document.getElementById("budgetBar");
const menuContainer = document.getElementById("menu-container");
const submitButton = document.getElementById("submitChoices");
const statusElement = document.getElementById("menu-status");
const defaultButtonText = submitButton.textContent;

const storedUser = localStorage.getItem("xmasUser") || localStorage.getItem("currentUser");
if (!storedUser) {
  window.location.href = "index.html";
}

let latestTotals = { total: 0, selections: [], remaining: MAX_BUDGET };
let recalcTotals = () => {};
let currentUserName = storedUser;

const setStatus = (message, tone = "info") => {
  if (!statusElement) return;
  statusElement.textContent = message;
  statusElement.classList.remove("error", "success");
  if (tone === "error") {
    statusElement.classList.add("error");
  } else if (tone === "success") {
    statusElement.classList.add("success");
  }
};

const escapeSelector = (value) => {
  if (window.CSS && typeof window.CSS.escape === "function") {
    return window.CSS.escape(value);
  }
  return value.replace(/["\\]/g, "\\$&");
};

const normalizeSelections = (rawSelections) => {
  if (!rawSelections) return [];
  if (Array.isArray(rawSelections)) return rawSelections;
  if (typeof rawSelections === "object") {
    return Object.entries(rawSelections).map(([name, data]) => ({
      name,
      price: Number(data.price) || 0,
      qty: Number(data.qty) || 0,
    }));
  }
  return [];
};

const setItemQuantity = (itemElement, qty) => {
  const safeValue = Math.max(0, Number(qty) || 0);
  const stepper = itemElement.querySelector(".qty-stepper");
  if (stepper) {
    const display = stepper.querySelector(".qty-display");
    stepper.dataset.value = String(safeValue);
    itemElement.dataset.quantity = String(safeValue);
    if (display) {
      display.textContent = String(safeValue);
      const labelName = itemElement.dataset.name || "item";
      display.setAttribute(
        "aria-label",
        `Quantity for ${labelName}: ${safeValue}`
      );
    }
    stepper.dispatchEvent(
      new CustomEvent("quantitychange", { bubbles: true, detail: { value: safeValue } })
    );
    return;
  }

  const legacyInput = itemElement.querySelector(".qty-input");
  if (legacyInput) {
    legacyInput.value = String(safeValue);
    legacyInput.dispatchEvent(new Event("input", { bubbles: true }));
  }
};

const applyExistingSelections = (selections) => {
  selections.forEach(({ name, qty }) => {
    if (!name) return;
    const selector = `.menu-item[data-name="${escapeSelector(name)}"]`;
    const itemElement = document.querySelector(selector);
    if (itemElement) {
      setItemQuantity(itemElement, qty);
    }
  });

  if (typeof recalcTotals === "function") {
    recalcTotals();
  }
};

async function fetchExistingSelections(userId) {
  const choiceRef = doc(db, "choices", userId);
  const snap = await getDoc(choiceRef);
  if (!snap.exists()) return null;
  return snap.data();
}

async function fetchUserName(userId) {
  try {
    const userRef = doc(db, "users", userId);
    const snap = await getDoc(userRef);
    if (snap.exists() && snap.data()?.name) {
      return snap.data().name;
    }
  } catch (error) {
    console.warn("Unable to fetch user profile", error);
  }
  return userId;
}

async function init() {
  try {
    setStatus("Loading the Brewhemia menu…");
    await renderMenu(menuContainer);

    recalcTotals = attachTotalHandler({
      budgetTextElement,
      budgetBarElement,
      submitButton,
      maxBudget: MAX_BUDGET,
      onTotalsChange: (totals) => {
        latestTotals = totals;
      },
    });

    const existing = await fetchExistingSelections(storedUser);
    const selections = normalizeSelections(existing?.items || existing?.selections);
    currentUserName = existing?.name || (await fetchUserName(storedUser));
    if (selections.length) {
      applyExistingSelections(selections);
      setStatus("We restored your previous picks. Update them if you like and hit save.", "success");
    } else {
      setStatus("Pick up to £20 worth of drinks and bites.");
    }
  } catch (err) {
    console.error(err);
    setStatus("We couldn't load the menu. Please refresh and try again.", "error");
  }
}

submitButton.addEventListener("click", async () => {
  const { total, selections, remaining } = latestTotals;
  if (!selections.length) {
    setStatus("Please add at least one item before saving.", "error");
    return;
  }

  if (remaining < 0) {
    setStatus("You're over budget. Adjust your picks before saving.", "error");
    return;
  }

  submitButton.disabled = true;
  submitButton.textContent = "Saving…";
  setStatus("Saving your choices…");

  try {
    await saveUserSelections(storedUser, currentUserName, selections, total);
    window.location.href = "complete.html";
  } catch (err) {
    console.error(err);
    setStatus("Unable to save your choices. Please try again.", "error");
    submitButton.disabled = false;
    submitButton.textContent = defaultButtonText;
  }
});

init();
