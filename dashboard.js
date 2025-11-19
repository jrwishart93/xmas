import { db } from "./src/firebase/firebaseConfig.js";
import { collection, getDocs } from "https://www.gstatic.com/firebasejs/10.5.0/firebase-firestore.js";
import { fetchMenu } from "./src/data/loadMenu.js";

const submissionRows = document.getElementById("submissionRows");
const peopleAccordion = document.getElementById("peopleAccordion");
const itemTotalsList = document.getElementById("itemTotalsList");
const kittyText = document.getElementById("kittyText");

const currency = new Intl.NumberFormat("en-GB", {
  style: "currency",
  currency: "GBP"
});

const SNACK_CATEGORIES = new Set(["Bites", "Sharers"]);

function normalizeSelections(rawSelections) {
  if (!rawSelections) return [];
  if (Array.isArray(rawSelections)) return rawSelections;
  if (typeof rawSelections === "object") {
    return Object.entries(rawSelections).map(([name, data]) => ({
      name,
      price: Number(data?.price) || 0,
      qty: Number(data?.qty) || 0
    }));
  }
  return [];
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

function summarisePerson(data, docId, categoryMap) {
  const selections = normalizeSelections(data?.selections || data?.choices);
  const name = data?.name || docId;

  let totalSpend = 0;
  let drinkCount = 0;
  let snackCount = 0;

  selections.forEach((item) => {
    const qty = Number(item.qty) || 0;
    const price = Number(item.price) || 0;
    totalSpend += qty * price;
    const category = categoryMap.get(item.name);
    if (SNACK_CATEGORIES.has(category)) {
      snackCount += qty;
    } else {
      drinkCount += qty;
    }
  });

  const hasSubmitted = Boolean(
    data?.hasSubmitted ?? selections.some((item) => (Number(item.qty) || 0) > 0)
  );

  return {
    id: docId,
    name,
    selections,
    totalSpend,
    drinkCount,
    snackCount,
    hasSubmitted
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

    const nameEl = document.createElement("span");
    nameEl.className = "name";
    nameEl.textContent = person.name;

    const status = document.createElement("span");
    status.className = `status ${person.hasSubmitted ? "complete" : "pending"}`;
    status.textContent = person.hasSubmitted ? "Submitted" : "Pending";

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
    item.className = "accordion-item";

    const header = document.createElement("button");
    header.className = "accordion-header";
    header.type = "button";

    const title = document.createElement("span");
    title.textContent = `${person.name} — ${currency.format(person.totalSpend)}`;

    const meta = document.createElement("span");
    meta.className = "meta";
    meta.textContent = `${person.drinkCount} drinks • ${person.snackCount} snacks`;

    header.append(title, meta);

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
        line.textContent = `${sel.name} ×${sel.qty} (${currency.format(lineTotal)})`;
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

function updateKittyBar(people) {
  if (!kittyText) return;
  const kittyTotal = people.length * 20;
  const spent = people.reduce((sum, person) => sum + person.totalSpend, 0);
  const remaining = Math.max(kittyTotal - spent, 0);
  kittyText.textContent = `Kitty: ${currency.format(kittyTotal)} | Spent: ${currency.format(spent)} | Left: ${currency.format(remaining)}`;
}

async function loadDashboard() {
  try {
    const [menu, snapshot] = await Promise.all([
      fetchMenu(),
      getDocs(collection(db, "choices"))
    ]);

    const categoryMap = buildCategoryMap(menu);
    const people = snapshot.docs.map((doc) =>
      summarisePerson(doc.data(), doc.id, categoryMap)
    );

    renderSubmissionOverview(people);
    renderPeopleBreakdown(people);
    renderItemTotals(aggregateItems(people));
    updateKittyBar(people);
  } catch (error) {
    console.error("Unable to load dashboard", error);
    if (submissionRows) {
      submissionRows.innerHTML = '<p class="muted-text">Unable to load submissions.</p>';
    }
    if (peopleAccordion) {
      peopleAccordion.innerHTML = '<p class="muted-text">Unable to load breakdown.</p>';
    }
    if (itemTotalsList) {
      itemTotalsList.innerHTML = '<p class="muted-text">Unable to load item totals.</p>';
    }
  }
}

loadDashboard();
