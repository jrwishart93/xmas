import { db } from "./firebase.js";
import {
  collection,
  getDocs,
  doc,
  serverTimestamp,
  writeBatch
} from "https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js";
import { fetchMenu } from "./src/data/loadMenu.js";
import { TEAM, normaliseTeamId } from "./team.js";

const MAX_BUDGET_PER_PERSON = 20;
const TOTAL_USERS = 9; // Ensure kitty calculation and team mapping stay in sync
const MAX_KITTY = TOTAL_USERS * MAX_BUDGET_PER_PERSON;

const submissionList = document.getElementById("submissionList");
const itemTotalsList = document.getElementById("itemTotalsList");
const hardResetTrigger = document.getElementById("hardResetTrigger");
const hardResetModal = document.getElementById("hardResetModal");
const confirmHardResetButton = document.getElementById("confirmHardReset");
const cancelHardResetButton = document.getElementById("cancelHardReset");
const confirmResetInput = document.getElementById("confirmResetInput");
const hardResetError = document.getElementById("hardResetError");
const hardResetModalError = document.getElementById("hardResetModalError");
const hardResetProgress = document.getElementById("hardResetProgress");
const dashboardToast = document.getElementById("dashboardToast");

const currency = new Intl.NumberFormat("en-GB", {
  style: "currency",
  currency: "GBP"
});

const SNACK_CATEGORIES = new Set(["Bites", "Sharers"]);
const RESET_TOKEN = "RESET";

function isAdmin() {
  return normaliseTeamId(sessionStorage.getItem("loggedInUser")) === "jamie_w";
}

function normalizeSelections(rawSelections) {
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
        qty: Number(qtyValue) || 0
      };
    });
  }
  return [];
}

function showToast(message) {
  if (!dashboardToast) return;
  dashboardToast.textContent = message;
  dashboardToast.classList.add("show");

  window.setTimeout(() => {
    dashboardToast?.classList.remove("show");
  }, 2800);
}

function buildCategoryMap(menu) {
  const map = new Map();
  menu.forEach((section) => {
    section?.items?.forEach((item) => {
      if (item?.name) {
        map.set(item.name, section.category);
      }
    });
  });
  return map;
}

function summarisePerson(docId, data, user, categoryMap) {
  const selections = normalizeSelections(data?.choices || data?.items || data?.selections);
  const name = user?.name || data?.name || docId;

  let totalSpend = Number(data?.totalSpend ?? data?.total);
  const shouldRecalculateTotal = !Number.isFinite(totalSpend);
  if (shouldRecalculateTotal) {
    totalSpend = 0;
  }
  let drinkCount = 0;
  let snackCount = 0;

  selections.forEach((item) => {
    const qty = Number(item.qty) || 0;
    const price = Number(item.price) || 0;
    if (shouldRecalculateTotal) {
      totalSpend += qty * price;
    }
    const category = categoryMap.get(item.name);
    if (SNACK_CATEGORIES.has(category)) {
      snackCount += qty;
    } else {
      drinkCount += qty;
    }
  });

  const hasSubmitted = Boolean(
    data?.submitted ?? data?.hasSubmitted ?? selections.some((item) => (Number(item.qty) || 0) > 0)
  );

  const isOverBudget = Number.isFinite(totalSpend) && totalSpend > MAX_BUDGET_PER_PERSON;

  return {
    id: docId,
    name,
    avatar: user?.avatar || user?.image,
    selections,
    totalSpend: Number.isFinite(totalSpend) ? totalSpend : 0,
    drinkCount,
    snackCount,
    hasSubmitted,
    isOverBudget
  };
}

async function renderCombinedDashboard(usersData, choicesData) {
  const container = submissionList;
  if (!container) return;

  container.innerHTML = "";

  const list = Object.keys(usersData).map((uid) => {
    const choice = choicesData[uid] || null;
    const hasSubmitted = !!choice;

    return {
      uid,
      name: usersData[uid].name,
      avatar: `/public/${uid}.png`,
      hasSubmitted,
      total: hasSubmitted ? choice.totalPrice.toFixed(2) : "0.00",
      drinks: hasSubmitted ? choice.drinks.length : 0,
      snacks: hasSubmitted ? choice.snacks.length : 0
    };
  });

  // Sort: submitted users first
  list.sort((a, b) => Number(b.hasSubmitted) - Number(a.hasSubmitted));

  list.forEach((user) => {
    const card = document.createElement("div");
    card.className = "submission-card";

    card.innerHTML = `
      <div class="submission-left">
        <img src="${user.avatar}" class="submission-avatar" alt="${user.name} avatar" />
        <div>
          <div class="submission-name">${user.name}</div>
          <div class="submission-meta">£${user.total} • ${user.drinks} drinks • ${user.snacks} snacks</div>
        </div>
      </div>
      <span class="submission-status ${user.hasSubmitted ? "status-submitted" : "status-pending"}">
        ${user.hasSubmitted ? "SUBMITTED" : "NOT SUBMITTED"}
      </span>
    `;

    container.appendChild(card);
  });
}

function aggregateItems(people) {
  const totals = new Map();
  people.forEach((person) => {
    person.selections.forEach((sel) => {
      const qty = Number(sel.qty);
      if (!sel.name || qty <= 0) return;

      const current = totals.get(sel.name) || { qty: 0 };
      totals.set(sel.name, { qty: current.qty + qty });
    });
  });

  return totals;
}

function renderItemTotals(totalsMap) {
  if (!itemTotalsList) return;
  itemTotalsList.innerHTML = "";

  const entries = Array.from(totalsMap.entries()).sort((a, b) => {
    return b[1].qty - a[1].qty || a[0].localeCompare(b[0]);
  });

  if (!entries.length) {
    itemTotalsList.innerHTML = '<p class="muted-text">No items added yet.</p>';
    return;
  }

  entries.forEach(([name, data]) => {
    const line = document.createElement("div");
    line.className = "total-line";
    line.style.animation = "fadeSlideIn 0.3s ease forwards";

    const label = document.createElement("span");
    label.className = "label";
    label.textContent = name;

    const count = document.createElement("span");
    count.className = "count";
    count.textContent = `${data.qty} total`;

    line.append(label, count);
    itemTotalsList.append(line);
  });
}

async function loadKitty() {
  const kittyTotalEl = document.getElementById("kittyTotal");
  if (!kittyTotalEl) return;

  const snap = await getDocs(collection(db, "choices"));

  let totalUsed = 0;

  snap.forEach((docSnap) => {
    const id = normaliseTeamId(docSnap.id);
    if (!TEAM[id]) return;

    const data = docSnap.data();
    const spend = Number(data.totalSpend) || 0;
    totalUsed += spend;
  });

  const remaining = MAX_KITTY - totalUsed;
  kittyTotalEl.textContent = `£${remaining.toFixed(2)}`;
}

function toggleResetModal(show) {
  if (!hardResetModal) return;
  hardResetModal.hidden = !show;
  hardResetModalError && (hardResetModalError.textContent = "");
  hardResetProgress && (hardResetProgress.textContent = "");
  confirmHardResetButton && (confirmHardResetButton.disabled = true);
  confirmResetInput && (confirmResetInput.value = "");

  if (show) {
    confirmResetInput?.focus();
  }
}

function setResetAvailability(isAllowed) {
  if (!hardResetTrigger) return;
  hardResetTrigger.disabled = !isAllowed;
  hardResetTrigger.setAttribute("aria-disabled", String(!isAllowed));
}

function evaluateAdminAccess() {
  if (!hardResetTrigger) return;
  const admin = isAdmin();
  hardResetTrigger.style.display = admin ? "block" : "none";
  setResetAvailability(admin);
  if (!admin && hardResetError) {
    hardResetError.textContent = "You must be an admin to hard reset.";
  }
}

function updateConfirmButtonState() {
  if (!confirmHardResetButton) return;
  const inputMatches = confirmResetInput?.value?.trim().toUpperCase() === RESET_TOKEN;
  confirmHardResetButton.disabled = !inputMatches;
}

async function performHardReset() {
  const usersSnapshot = await getDocs(collection(db, "choices"));
  const batch = writeBatch(db);

  usersSnapshot.forEach((userDoc) => {
    const userRef = doc(db, "choices", userDoc.id);
    batch.set(
      userRef,
      {
        hasSubmitted: false,
        choices: {},
        selections: [],
        total: 0,
        totalSpend: 0,
        updatedAt: serverTimestamp()
      },
      { merge: true }
    );
  });

  const kittyRef = doc(db, "kitty", "shared");
  batch.set(
    kittyRef,
    {
      totalSpent: 0,
      kittyBudget: MAX_KITTY,
      remainingBudget: MAX_KITTY,
      itemTotals: {},
      updatedAt: serverTimestamp()
    },
    { merge: true }
  );

  await batch.commit();
}

async function handleHardReset() {
  if (!isAdmin()) {
    hardResetModalError && (hardResetModalError.textContent = "Only admins can reset data.");
    hardResetError && (hardResetError.textContent = "Only admins can reset data.");
    return;
  }

  if (confirmHardResetButton) {
    confirmHardResetButton.disabled = true;
  }
  if (hardResetProgress) {
    hardResetProgress.textContent = "Resetting…";
  }
  hardResetModalError && (hardResetModalError.textContent = "");

  try {
    await performHardReset();
    toggleResetModal(false);
    showToast("All choices and kitty totals have been reset.");
  } catch (error) {
    console.error("Unable to hard reset", error);
    hardResetModalError &&
      (hardResetModalError.textContent = "Could not reset data. Please try again.");
  } finally {
    if (confirmHardResetButton) {
      confirmHardResetButton.disabled = false;
    }
    if (hardResetProgress) {
      hardResetProgress.textContent = "";
    }
  }
}

function renderDashboard(people, choices) {
  renderCombinedDashboard(TEAM, choices);
  renderItemTotals(aggregateItems(people));
}

async function loadDashboardData() {
  const choicesRef = collection(db, "choices");
  const snap = await getDocs(choicesRef);

  let categoryMap = new Map();
  try {
    const menu = await fetchMenu();
    categoryMap = buildCategoryMap(menu);
  } catch (err) {
    console.warn("Menu failed to load", err);
  }

  const people = [];
  const choices = {};

  snap.forEach((docSnap) => {
    const id = normaliseTeamId(docSnap.id);
    if (!TEAM[id]) return; // skip junk docs

    const entry = docSnap.data();
    const normalised = normalizeSelections(entry.choices || entry.selections);

    const summary = summarisePerson(
      id,
      {
        ...entry,
        totalSpend: Number(entry.totalSpend) || 0,
        choices: normalised,
        selections: normalised
      },
      TEAM[id],
      categoryMap
    );

    const drinks = [];
    const snacks = [];

    normalised.forEach((sel) => {
      const qty = Number(sel.qty) || 0;
      if (qty <= 0) return;

      const category = categoryMap.get(sel.name);
      const bucket = SNACK_CATEGORIES.has(category) ? snacks : drinks;
      bucket.push(sel);
    });

    if (summary.hasSubmitted) {
      choices[id] = {
        totalPrice: summary.totalSpend,
        drinks,
        snacks
      };
    }

    people.push(summary);
  });

  return { people, choices };
}

hardResetTrigger?.addEventListener("click", () => {
  toggleResetModal(true);
  if (!isAdmin() && hardResetModalError) {
    hardResetModalError.textContent = "Only admins can reset data.";
  }
});

confirmResetInput?.addEventListener("input", updateConfirmButtonState);
cancelHardResetButton?.addEventListener("click", () => toggleResetModal(false));
confirmHardResetButton?.addEventListener("click", handleHardReset);

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && hardResetModal && !hardResetModal.hidden) {
    toggleResetModal(false);
  }
});

async function startDashboard() {
  evaluateAdminAccess();

  try {
    const { people, choices } = await loadDashboardData();
    renderDashboard(people, choices);
    await loadKitty();
  } catch (err) {
    console.error("Dashboard failed", err);
    alert("Unable to load dashboard data. Please refresh.");
  }
}

startDashboard();

