import { TEAM } from "./src/team.js";
import { fetchUsersFromFirestore } from "../src/data/users.js";
import { db } from "../firebase.js";
import {
  doc,
  getDoc,
  setDoc
} from "https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js";

const QUESTIONS = [
  {
    id: "firstHome",
    containerId: "q-first-home",
    prompt: "Who will be the first person to go home?"
  },
  {
    id: "lastStanding",
    containerId: "q-last-standing",
    prompt: "Who will be the last person standing?"
  },
  {
    id: "mostDrunk",
    containerId: "q-most-drunk",
    prompt: "Who will be the most drunk?"
  },
  {
    id: "mostAlcohol",
    containerId: "q-most-alcohol",
    prompt: "Who will consume the most alcohol?"
  },
  {
    id: "ninjaExit",
    containerId: "q-ninja-exit",
    prompt: "Who is most likely to disappear without saying goodbye?"
  }
];

const votesState = {};
let participants = { ...TEAM };
const userId = sessionStorage.getItem("loggedInUser");
const voteLoading = document.getElementById("voteLoading");
const submitButton = document.getElementById("submitVotes");

if (!userId) {
  window.location.href = "index.html";
}

function showToast(message) {
  const toast = document.createElement("div");
  toast.className = "toast";
  toast.textContent = message;
  document.body.appendChild(toast);
  requestAnimationFrame(() => toast.classList.add("show"));
  setTimeout(() => {
    toast.classList.remove("show");
    setTimeout(() => toast.remove(), 200);
  }, 2200);
}

function toggleLoading(isLoading) {
  if (!voteLoading) return;
  voteLoading.classList.toggle("hidden", !isLoading);
}

function selectAvatar(questionId, userKey) {
  const grid = document.querySelector(`.avatar-grid[data-question="${questionId}"]`);
  if (!grid) return;

  grid.querySelectorAll(".avatar-tile.selected").forEach((tile) => {
    tile.classList.remove("selected");
    tile.setAttribute("aria-pressed", "false");
  });

  const chosenTile = grid.querySelector(`[data-user-id="${userKey}"]`);
  if (chosenTile) {
    chosenTile.classList.add("selected");
    chosenTile.setAttribute("aria-pressed", "true");
  }

  votesState[questionId] = userKey;
}

function renderAvatarGrids() {
  QUESTIONS.forEach((question) => {
    const grid = document.querySelector(
      `.avatar-grid[data-question="${question.id}"]`
    );

    if (!grid) return;

    grid.innerHTML = "";

    Object.entries(participants).forEach(([id, person]) => {
      const avatarSrc = person.avatarUrl || person.image;
      const tile = document.createElement("button");
      tile.type = "button";
      tile.className = "avatar-tile";
      tile.dataset.userId = id;
      tile.setAttribute(
        "aria-label",
        `${question.prompt} – vote for ${person.name}`
      );
      tile.setAttribute("aria-pressed", "false");

      const resolvedSrc = avatarSrc?.startsWith("http") ? avatarSrc : `/${avatarSrc || ""}`;
      tile.innerHTML = `
        <div class="avatar-thumb">
          <img src="${resolvedSrc}" alt="${person.name}" />
        </div>
        <span class="avatar-name">${person.name}</span>
      `;

      tile.addEventListener("click", () => selectAvatar(question.id, id));
      grid.appendChild(tile);
    });
  });
}

async function loadParticipants() {
  const remoteUsers = await fetchUsersFromFirestore();
  const merged = {};

  Object.entries(TEAM).forEach(([id, person]) => {
    const remote = remoteUsers[id] || {};
    merged[id] = {
      ...person,
      name: remote.name || person.name,
      avatarUrl: remote.avatarUrl || person.image,
    };
  });

  participants = merged;
  renderAvatarGrids();
}

async function loadExistingVotes() {
  if (!userId) return;

  try {
    const ref = doc(db, "votes", userId);
    const snapshot = await getDoc(ref);

    if (snapshot.exists()) {
      const data = snapshot.data();
      QUESTIONS.forEach(({ id }) => {
        const saved = data?.[id] || data?.answers?.[id] || data?.votes?.[id];
        if (saved && participants[saved]) {
          selectAvatar(id, saved);
        }
      });
    }
  } catch (error) {
    console.error("Unable to load previous votes", error);
    showToast("Could not load previous votes. You can still vote.");
  }
}

function validateVotes() {
  const missing = QUESTIONS.filter((q) => !votesState[q.id]);
  if (missing.length) {
    showToast("Please answer every question before submitting.");
    return false;
  }

  return true;
}

async function saveVotes() {
  if (!validateVotes()) return;
  if (!submitButton) return;

  submitButton.disabled = true;
  submitButton.textContent = "Submitting…";

  const payload = QUESTIONS.reduce(
    (acc, q) => ({ ...acc, [q.id]: votesState[q.id] }),
    { submittedAt: Date.now() }
  );

  try {
    const ref = doc(db, "votes", userId);
    await setDoc(ref, payload, { merge: true });

    showToast("Votes saved!");
    submitButton.textContent = "Saved";
    setTimeout(() => {
      window.location.href = "dashboard.html";
    }, 700);
  } catch (error) {
    console.error("Failed to save votes", error);
    alert("Unable to save votes. Please try again.");
    submitButton.disabled = false;
    submitButton.textContent = "Submit Votes";
  }
}

async function init() {
  toggleLoading(true);
  try {
    await loadParticipants();
    await loadExistingVotes();
    submitButton?.addEventListener("click", saveVotes);
  } finally {
    toggleLoading(false);
  }
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}
