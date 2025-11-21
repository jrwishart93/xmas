import { renderMenu } from "./src/ui/renderMenu.js";
import { attachTotalHandler } from "./src/ui/updateTotals.js";
import { saveUserSelections } from "./src/data/saveChoices.js";
import { resetUserSelections } from "./src/data/resetChoices.js";
import { createAvatarName } from "./src/utils/avatarMap.js";
import { db } from "./firebase.js";
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/10.5.0/firebase-firestore.js";

const MAX_BUDGET = 20;
const budgetTextElement = document.getElementById("budgetText");
const budgetBarElement = document.getElementById("budgetBar");
const menuContainer = document.getElementById("menu-container");
const submitButton = document.getElementById("submitChoices");
const statusElement = document.getElementById("menu-status");
const resetButton = document.getElementById("resetChoicesBtn");
const resetStatusElement = document.getElementById("reset-status");
const resetDialog = document.getElementById("resetDialog");
const confirmResetButton = document.getElementById("confirmReset");
const cancelResetButton = document.getElementById("cancelReset");
const defaultButtonText = submitButton.textContent;
const defaultConfirmResetText = confirmResetButton?.textContent || "Reset choices";
const userBadge = document.getElementById("userBadge");

const storedUser = localStorage.getItem("xmasUser") || localStorage.getItem("currentUser");
if (!storedUser) {
  window.location.href = "index.html";
}

let latestTotals = { total: 0, selections: [], remaining: MAX_BUDGET };
let recalcTotals = () => {};
let currentUserName = storedUser;
let menuSections = [];

const renderUserBadge = (name) => {
  if (!userBadge) return;
  userBadge.innerHTML = "";

  if (!name) {
    userBadge.classList.add("hidden");
    return;
  }

  const label = document.createElement("p");
  label.className = "badge-label";
  label.textContent = "Logged in as";

  const nameRow = createAvatarName(name, 42);
  nameRow.classList.add("user-badge__name");

  userBadge.append(label, nameRow);
  userBadge.classList.remove("hidden");
};

renderUserBadge(currentUserName);

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

const setResetStatus = (message, tone = "info") => {
  if (!resetStatusElement) return;
  resetStatusElement.textContent = message;
  resetStatusElement.classList.remove("error", "success");
  if (!message) return;

  if (tone === "error") {
    resetStatusElement.classList.add("error");
  } else if (tone === "success") {
    resetStatusElement.classList.add("success");
  }
};

const buildZeroedSelections = () => {
  const items = Array.isArray(menuSections) && menuSections.length
    ? menuSections.flatMap((section) => section.items || [])
    : Array.from(document.querySelectorAll(".menu-item")).map((item) => ({
        name: item.dataset.name,
        price: Number(item.dataset.price) || 0,
      }));

  return items
    .filter((item) => Boolean(item?.name))
    .map((item) => ({
      name: item.name,
      price: Number(item.price) || 0,
      qty: 0,
    }));
};

const normalizeSelections = (rawSelections) => {
  if (!rawSelections) return [];
  if (Array.isArray(rawSelections)) return rawSelections;
  if (typeof rawSelections === "object") {
    return Object.entries(rawSelections).map(([name, data]) => {
      const qtyValue =
        typeof data === "number" ? data : Number(data?.qty ?? data) || 0;
      const priceValue = typeof data === "object" ? Number(data?.price) || 0 : 0;

      return {
        name,
        price: priceValue,
        qty: Number(qtyValue) || 0,
      };
    });
  }
  return [];
};

const hasNonZeroSelections = (selections = []) =>
  selections.some((selection) => Number(selection?.qty) > 0);

const buildChoicesMap = () => {
  const items = document.querySelectorAll(".menu-item");

  return Array.from(items).reduce((acc, item) => {
    const name = item.dataset.name;
    if (!name) return acc;

    const qty = Number(
      item.dataset.quantity ||
        item.querySelector(".qty-display")?.textContent ||
        item.querySelector(".qty-input")?.value ||
        0
    );

    acc[name] = Number.isFinite(qty) ? Math.max(0, qty) : 0;
    return acc;
  }, {});
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

const resetAllQuantities = () => {
  const items = document.querySelectorAll(".menu-item");
  items.forEach((item) => setItemQuantity(item, 0));

  if (typeof recalcTotals === "function") {
    recalcTotals();
  }
};

const toggleResetDialog = (show) => {
  if (!resetDialog) return;
  resetDialog.hidden = !show;
  if (show) {
    confirmResetButton?.focus();
  }
};

const requestResetConfirmation = () => {
  if (!resetDialog || !confirmResetButton || !cancelResetButton) {
    return Promise.resolve(
      window.confirm("Are you sure you want to clear your choices?")
    );
  }

  toggleResetDialog(true);

  return new Promise((resolve) => {
    const cleanup = () => {
      confirmResetButton.removeEventListener("click", handleConfirm);
      cancelResetButton.removeEventListener("click", handleCancel);
      toggleResetDialog(false);
    };

    const handleConfirm = () => {
      cleanup();
      resolve(true);
    };

    const handleCancel = () => {
      cleanup();
      resolve(false);
    };

    confirmResetButton.addEventListener("click", handleConfirm);
    cancelResetButton.addEventListener("click", handleCancel);
  });
};

const setResetInProgress = (isResetting) => {
  if (resetButton) resetButton.disabled = isResetting;
  if (submitButton) submitButton.disabled = isResetting;
  if (confirmResetButton) {
    confirmResetButton.disabled = isResetting;
    confirmResetButton.textContent = isResetting
      ? "Resetting…"
      : defaultConfirmResetText;
  }
  if (cancelResetButton) cancelResetButton.disabled = isResetting;
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
  const choiceRef = doc(db, "users", userId);
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
    menuSections = await renderMenu(menuContainer);

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
    const selections = normalizeSelections(
      existing?.choices || existing?.items || existing?.selections
    );
    currentUserName = existing?.name || (await fetchUserName(storedUser));
    renderUserBadge(currentUserName);
    if (selections.length) {
      applyExistingSelections(selections);
    }

    if (hasNonZeroSelections(selections)) {
      setStatus(
        "We restored your previous picks. Update them if you like and hit save.",
        "success"
      );
    } else {
      setStatus("Pick up to £20 worth of drinks and bites.");
    }
  } catch (err) {
    console.error(err);
    setStatus("We couldn't load the menu. Please refresh and try again.", "error");
  }
}

const handleResetChoices = async () => {
  setResetStatus("");
  const confirmed = await requestResetConfirmation();
  if (!confirmed) return;

  setResetStatus("Resetting your choices…");
  setResetInProgress(true);
  resetAllQuantities();

  try {
    const zeroSelections = buildZeroedSelections();
    await resetUserSelections(storedUser, zeroSelections);
    setResetStatus("Your choices have been reset.", "success");
    setStatus("All choices cleared. Pick again if you like.", "success");
  } catch (err) {
    console.error(err);
    setResetStatus(
      "Unable to reset your choices. Please try again.",
      "error"
    );
  } finally {
    setResetInProgress(false);
    if (typeof recalcTotals === "function") {
      recalcTotals();
    }
  }
};

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
    const choices = buildChoicesMap();
    const totalSpend = Number(Number(total).toFixed(2)) || 0;

    console.log("Saving choices for", storedUser, { choices, totalSpend });

    await saveUserSelections(storedUser, currentUserName, choices, totalSpend);
    setStatus("Choices saved!", "success");
    window.location.href = "complete.html";
  } catch (err) {
    console.error(err);
    setStatus("Unable to save your choices. Please try again.", "error");
    submitButton.disabled = false;
    submitButton.textContent = defaultButtonText;
  }
});

resetButton?.addEventListener("click", handleResetChoices);

init();
