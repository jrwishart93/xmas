import { renderMenu } from "./src/ui/renderMenu.js";
import { attachTotalHandler } from "./src/ui/updateTotals.js";
import { resetUserSelections } from "./src/data/resetChoices.js";
import { createAvatarName } from "./src/utils/avatarMap.js";
import { TEAM, normaliseTeamId, toLegacyId } from "./team.js";
import {
  loadUserChoices,
  listenToUserChoices,
  saveUserChoices,
} from "./src/data/choicesStore.js";

const MAX_BUDGET = 20;
const userId = normaliseTeamId(sessionStorage.getItem("loggedInUser"));
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

if (!userId || !TEAM[userId]) {
  alert("User session expired. Please log in again.");
  window.location.href = "index.html";
}

sessionStorage.setItem("loggedInUser", userId);

let latestTotals = { total: 0, selections: [], remaining: MAX_BUDGET };
let recalcTotals = () => {};
let currentUserId = userId || sessionStorage.getItem("selectedUserId") || "";
let currentLegacyId =
  sessionStorage.getItem("selectedUserLegacyId") || toLegacyId(currentUserId) || "";
let currentUserName =
  sessionStorage.getItem("selectedUserName") || TEAM[userId]?.name || "";
let menuSections = [];
let hasInitialised = false;
let unsubscribeFromChoices = null;
let hasRestoredSelections = false;

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

const calculateTotalSpend = (selections = []) =>
  selections.reduce((total, item) => {
    const qty = Number(item?.qty) || 0;
    const price = Number(item?.price) || 0;
    return total + qty * price;
  }, 0);

const buildChoiceMap = (selections = []) =>
  selections.reduce((acc, item) => {
    if (!item?.name) return acc;
    acc[item.name] = {
      qty: Number(item.qty) || 0,
      price: Number(item.price) || 0,
    };
    return acc;
  }, {});

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

const showSuccessOptions = () => {
  if (submitButton) {
    submitButton.disabled = false;
    submitButton.textContent = defaultButtonText;
  }

  document.querySelector(".success-modal")?.remove();

  const modal = document.createElement("div");
  modal.className = "success-modal";

  modal.innerHTML = `
        <div class="success-box">
            <h2>🎉 Choice Saved!</h2>
            <p>Your selection has been recorded.</p>

            <button id="goDashboard">View Dashboard</button>
            <button id="addMore">Order More</button>
        </div>
    `;

  document.body.appendChild(modal);

  document.getElementById("goDashboard").onclick = () => {
    window.location.href = "dashboard.html";
  };

  document.getElementById("addMore").onclick = () => {
    modal.remove();
    window.location.href = "choices.html";
  };
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

const handleSelectionsUpdate = (data) => {
  if (!data) {
    hasRestoredSelections = true;
    setStatus("Pick up to £20 worth of drinks and bites.");
    return;
  }

  const selections = normalizeSelections(
    data.choices || data.items || data.selections
  );
  currentUserName = data?.name || currentUserName;
  renderUserBadge(currentUserName);

  if (selections.length) {
    applyExistingSelections(selections);
  }

  if (hasNonZeroSelections(selections)) {
    setStatus(
      hasRestoredSelections
        ? "Updated your saved picks from Firestore."
        : "We restored your previous picks. Update them if you like and hit save.",
      "success"
    );
    hasRestoredSelections = true;
  } else {
    setStatus("Pick up to £20 worth of drinks and bites.");
  }
};

const subscribeToUserChoices = (userId) => {
  if (!userId) return;

  const firestoreUserId = toLegacyId(userId);

  if (typeof unsubscribeFromChoices === "function") {
    unsubscribeFromChoices();
  }

  unsubscribeFromChoices = listenToUserChoices(
    firestoreUserId,
    (data) => {
      if (!data) {
        handleSelectionsUpdate(null);
        return;
      }
      handleSelectionsUpdate(data);
    },
    () => {
      setStatus("We couldn't load your saved choices. Please refresh.", "error");
    }
  );
};

async function fetchExistingSelections(userId) {
  const firestoreUserId = toLegacyId(userId);
  return loadUserChoices(firestoreUserId);
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

    const existing = await fetchExistingSelections(currentUserId);
    if (existing) {
      handleSelectionsUpdate(existing);
    }

    subscribeToUserChoices(currentUserId);
  } catch (err) {
    console.error(err);
    setStatus("We couldn't load the menu. Please refresh and try again.", "error");
  }
}

const detachListeners = () => {
  if (typeof unsubscribeFromChoices === "function") {
    unsubscribeFromChoices();
    unsubscribeFromChoices = null;
  }
};

const handleResetChoices = async () => {
  setResetStatus("");
  const confirmed = await requestResetConfirmation();
  if (!confirmed) return;

  setResetStatus("Resetting your choices…");
  setResetInProgress(true);
  resetAllQuantities();

  try {
    const zeroSelections = buildZeroedSelections();
    const firestoreUserId = toLegacyId(currentUserId || currentLegacyId);
    await resetUserSelections(
      firestoreUserId,
      zeroSelections,
      currentLegacyId || firestoreUserId
    );
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

async function submitChoices() {
  const userId = normaliseTeamId(sessionStorage.getItem("loggedInUser"));
  const firestoreUserId = toLegacyId(userId || currentLegacyId);

  if (!firestoreUserId) {
    alert("No logged-in user.");
    return;
  }

  if (!TEAM[userId]) {
    alert("Unknown user ID. Cannot save choices.");
    return;
  }

  const { selections = [], remaining } = latestTotals;
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

  const sanitizedSelections = selections
    .filter((item) => Boolean(item?.name))
    .map((item) => ({
      name: item.name,
      price: Number(item.price) || 0,
      qty: Number(item.qty) || 0,
    }));

  const payload = {
    choices: buildChoiceMap(sanitizedSelections),
    selections: sanitizedSelections,
    totalSpend: Number(calculateTotalSpend(sanitizedSelections).toFixed(2)) || 0,
    timestamp: Date.now(),
    name: TEAM[userId]?.name || userId,
  };

  try {
    await saveUserChoices(firestoreUserId, payload);
    setStatus("Choices saved!", "success");
    showSuccessOptions();
  } catch (err) {
    console.error("Save failed:", err);
    setStatus("Unable to save your choices. Please try again.", "error");
    alert("Unable to save your choices. Please try again.");
  } finally {
    submitButton.disabled = false;
    submitButton.textContent = defaultButtonText;
  }
}

submitButton.addEventListener("click", submitChoices);

resetButton?.addEventListener("click", handleResetChoices);

function startChoices() {
  if (!currentUserId) {
    window.location.href = "index.html";
    return;
  }

  if (!currentUserName) {
    currentUserName =
      sessionStorage.getItem("selectedUserName") || currentLegacyId || currentUserId;
  }

  if (!currentLegacyId) {
    currentLegacyId = toLegacyId(currentUserId);
  }

  renderUserBadge(currentUserName);

  if (hasInitialised) return;
  hasInitialised = true;
  init();

  window.addEventListener("beforeunload", detachListeners);
}

startChoices();
