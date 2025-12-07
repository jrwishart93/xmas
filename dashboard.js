import { db } from "../firebase.js";
import {
  collection,
  getDocs,
  doc,
  getDoc,
  serverTimestamp,
  writeBatch
} from "https://www.gstatic.com/firebasejs/10.5.0/firebase-firestore.js";
import { fetchMenu } from "./src/data/loadMenu.js";
import { createAvatarName } from "./src/utils/avatarMap.js";
import { TEAM } from "./team.js";

const MAX_BUDGET_PER_PERSON = 20;
const TOTAL_USERS = 9; // Ensure kitty calculation and team mapping stay in sync
const MAX_KITTY = TOTAL_USERS * MAX_BUDGET_PER_PERSON;

const submissionRows = document.getElementById("submissionRows");
const peopleAccordion = document.getElementById("peopleAccordion");
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

if (!db) {
  console.error("Firestore DB not initialised.");
}

const currency = new Intl.NumberFormat("en-GB", {
  style: "currency",
  currency: "GBP"
});

const SNACK_CATEGORIES = new Set(["Bites", "Sharers"]);
const RESET_TOKEN = "RESET";

function isAdmin() {
  return sessionStorage.getItem("loggedInUser") === "jamiew";
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
    image: user?.image,
    selections,
    totalSpend: Number.isFinite(totalSpend) ? totalSpend : 0,
    drinkCount,
    snackCount,
    hasSubmitted,
    isOverBudget
  };
}

function renderSubmissionOverview(people) {
  if (!submissionRows) return;
  submissionRows.innerHTML = "";

  if (!people.length) {
    submissionRows.innerHTML = '<p class="muted-text">No submissions yet.</p>';
    return;
  }

  const sorted = [...people].sort((a, b) => a.name.localeCompare(b.name));
  sorted.forEach((person) => {
    const row = document.createElement("div");
    row.className = "submission-row";

    const nameEl = createAvatarName(person.name, 34, {
      image: person.image,
      status: person.hasSubmitted ? "submitted" : "pending",
      overBudget: person.isOverBudget
    });
    nameEl.classList.add("name");

    const status = document.createElement("span");
    status.className = `status-pill ${person.hasSubmitted ? "submitted" : "pending"}`;
    status.textContent = person.hasSubmitted ? "Submitted" : "Not submitted yet";

    row.append(nameEl, status);
    submissionRows.append(row);
  });
}

function toggleAccordion(content, header) {
  const isOpen = content.classList.contains("open");

  document.querySelectorAll(".accordion-content.open").forEach((panel) => {
    panel.classList.remove("open");
    panel.style.maxHeight = null;
  });

  document.querySelectorAll(".accordion-header.active").forEach((btn) => {
    btn.classList.remove("active");
  });

  if (!isOpen) {
    content.classList.add("open");
    content.style.maxHeight = content.scrollHeight + "px";
    header.classList.add("active");
  }
}

function renderPeopleBreakdown(people) {
  if (!peopleAccordion) return;
  peopleAccordion.innerHTML = "";

  if (!people.length) {
    peopleAccordion.innerHTML = '<p class="muted-text">No selections found.</p>';
    return;
  }

  const sorted = [...people].sort((a, b) => a.name.localeCompare(b.name));
  sorted.forEach((person) => {
    const item = document.createElement("div");
    item.className = `accordion-item ${person.hasSubmitted ? "is-submitted" : "is-pending"}`;

    const header = document.createElement("button");
    header.className = "accordion-header";
    header.type = "button";

    const title = document.createElement("div");
    title.className = "accordion-title";

    const personLabel = createAvatarName(person.name, 42, {
      image: person.image,
      status: person.hasSubmitted ? "submitted" : "pending",
      overBudget: person.isOverBudget
    });
    personLabel.classList.add("name");

    const total = document.createElement("span");
    total.className = "person-total";
    total.textContent = currency.format(person.totalSpend);

    const statusBadge = document.createElement("span");
    statusBadge.className = `status-pill ${person.hasSubmitted ? "submitted" : "pending"}`;
    statusBadge.textContent = person.hasSubmitted ? "Submitted" : "Not submitted yet";

    const headerMeta = document.createElement("div");
    headerMeta.className = "meta";
    headerMeta.textContent = `${person.drinkCount} drinks • ${person.snackCount} snacks`;

    const headerGrid = document.createElement("div");
    headerGrid.className = "accordion-header__grid";
    headerGrid.append(personLabel, total, statusBadge);

    title.append(headerGrid, headerMeta);

    header.append(title);

    const content = document.createElement("div");
    content.className = "accordion-content";

    const lines = person.selections.filter((sel) => (Number(sel.qty) || 0) > 0);
    if (!lines.length) {
      const empty = document.createElement("div");
      empty.className = "line";
      empty.textContent = "No selections yet.";
      content.append(empty);
    } else {
      lines.forEach((sel) => {
        const line = document.createElement("div");
        line.className = "line";
        const lineTotal = (Number(sel.qty) || 0) * (Number(sel.price) || 0);

        const itemLabel = document.createElement("span");
        itemLabel.className = "line__label";
        itemLabel.textContent = `${sel.name} ×${sel.qty}`;

        const itemTotal = document.createElement("span");
        itemTotal.className = "line__total";
        itemTotal.textContent = currency.format(lineTotal);

        line.append(itemLabel, itemTotal);
        content.append(line);
      });
    }

    header.addEventListener("click", () => toggleAccordion(content, header));

    item.append(header, content);
    peopleAccordion.append(item);
  });
}

function aggregateItems(people) {
  const totals = new Map();
  people.forEach((person) => {
    person.selections.forEach((sel) => {
      const qty = Number(sel.qty) || 0;
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
    const userId = docSnap.id;
    if (!TEAM[userId]) return;

    const data = docSnap.data();
    const spend = Number(data.totalSpend) || 0;
    totalUsed += spend;
  });

  const remainingKitty = MAX_KITTY - totalUsed;

  kittyTotalEl.textContent = `£${remainingKitty.toFixed(2)}`;
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

function renderDashboard(people) {
  renderSubmissionOverview(people);
  renderPeopleBreakdown(people);
  renderItemTotals(aggregateItems(people));
}

async function loadDashboardData() {
  let categoryMap = new Map();

  try {
    const menu = await fetchMenu();
    categoryMap = buildCategoryMap(menu);
  } catch (error) {
    console.error("Unable to load menu for dashboard", error);
  }

  const colRef = collection(db, "choices");
  const snap = await getDocs(colRef);

  const data = [];

  snap.forEach((docSnap) => {
    const id = docSnap.id;
    const entry = docSnap.data();

    // Skip unknown docs to prevent duplicates or junk entries
    if (!TEAM[id]) return;

    data.push(
      summarisePerson(
        id,
        {
          ...entry,
          totalSpend: entry.totalSpend || 0,
          choices: entry.choices || entry.selections || {},
          selections: entry.choices || entry.selections || []
        },
        TEAM[id],
        categoryMap
      )
    );
  });

  return data;
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
    const data = await loadDashboardData();
    renderDashboard(data);
    await loadKitty();
  } catch (err) {
    console.error("Unable to load dashboard", err);
    alert("Unable to load dashboard data. Please refresh.");
  }
}

startDashboard();

