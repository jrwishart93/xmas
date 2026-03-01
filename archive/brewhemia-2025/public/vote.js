import {
  TEAM,
  getAvatarSrc,
  normalizeAvatarPath,
  normaliseTeamId,
  toLegacyId,
} from "./src/team.js";
import { fetchUsersFromFirestore } from "../src/data/users.js";
import { fetchVotingQuestions } from "../src/data/votingQuestionsStore.js";
import { VOTING_QUESTIONS } from "../src/data/votingQuestions.js";
import { db } from "../firebase.js";
import {
  doc,
  getDoc,
  setDoc
} from "https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js";

function toKebabCase(value = "") {
  return value
    .replace(/([a-z0-9])([A-Z])/g, "$1-$2")
    .replace(/[_\s]+/g, "-")
    .toLowerCase();
}

function createQuestionShape(entry) {
  const baseId = entry?.id || "";
  const containerId = entry?.containerId || `q-${toKebabCase(baseId)}`;

  return {
    id: baseId,
    containerId,
    prompt: entry?.prompt || entry?.question || "",
    icon: entry?.icon,
    alt: entry?.alt,
  };
}

let QUESTIONS = VOTING_QUESTIONS.map(createQuestionShape);

const votesState = {};
let participants = { ...TEAM };
const unavailableIds = new Set(
  Object.entries(TEAM)
    .filter(([, person]) => person?.unavailable)
    .map(([id]) => id)
);
const userId = normaliseTeamId(sessionStorage.getItem("loggedInUser"));
const voteLoading = document.getElementById("voteLoading");
const submitButton = document.getElementById("submitVotes");
const resetButton = document.getElementById("resetVotes");

if (!userId) {
  window.location.href = "index.html";
} else {
  sessionStorage.setItem("loggedInUser", userId);
  sessionStorage.setItem("selectedUser", userId);
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

function scrollToNextQuestion(currentQuestionId) {
  const currentIndex = QUESTIONS.findIndex((q) => q.id === currentQuestionId);
  const nextQuestion = currentIndex >= 0 ? QUESTIONS[currentIndex + 1] : null;

  if (!nextQuestion) return;

  const nextElement = document.getElementById(nextQuestion.containerId);
  nextElement?.scrollIntoView({ behavior: "smooth", block: "start" });
}

function selectAvatar(questionId, userKey, { autoAdvance = false } = {}) {
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

  if (autoAdvance) {
    scrollToNextQuestion(questionId);
  }
}

function renderQuestionContent() {
  QUESTIONS.forEach((question) => {
    const container = document.getElementById(question.containerId);
    if (!container) return;

    const title = container.querySelector(".vote-question-title");
    const img = container.querySelector(".vote-image");

    if (title) {
      title.textContent = question.prompt;
    }

    if (img && (question.icon || question.alt)) {
      if (question.icon) {
        img.src = question.icon;
      }
      if (question.alt) {
        img.alt = question.alt;
      }
    }
  });
}

function renderAvatarGrids() {
  QUESTIONS.forEach((question) => {
    const grid = document.querySelector(
      `.avatar-grid[data-question="${question.id}"]`
    );

    if (!grid) return;

    grid.innerHTML = "";

    Object.entries(participants).forEach(([id, person]) => {
      const avatarSrc = normalizeAvatarPath(
        person.avatarUrl || person.avatar || getAvatarSrc(id)
      );
      const tile = document.createElement("button");
      tile.type = "button";
      tile.className = "avatar-tile";
      tile.dataset.userId = id;
      tile.setAttribute(
        "aria-label",
        `${question.prompt} – vote for ${person.name}`
      );
      tile.setAttribute("aria-pressed", "false");

      const resolvedSrc = avatarSrc?.startsWith("http")
        ? avatarSrc
        : normalizeAvatarPath(avatarSrc);
      tile.innerHTML = `
        <div class="avatar-thumb">
          <img src="${resolvedSrc}" alt="${person.name}" />
        </div>
        <span class="avatar-name">${person.name}</span>
      `;

      tile.addEventListener("click", () =>
        selectAvatar(question.id, id, { autoAdvance: true })
      );
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
      avatar: normalizeAvatarPath(
        remote.avatarUrl || remote.avatar || person.avatar || getAvatarSrc(id)
      ),
      avatarUrl: normalizeAvatarPath(remote.avatarUrl || person.avatarUrl),
    };
  });

  Object.entries(remoteUsers).forEach(([id, data]) => {
    const canonicalId = normaliseTeamId(id);
    if (!canonicalId || !merged[canonicalId]) return;

    merged[canonicalId] = {
      ...merged[canonicalId],
      name: data.name || merged[canonicalId].name,
      avatar: normalizeAvatarPath(
        data.avatarUrl || data.avatar || merged[canonicalId].avatar
      ),
      avatarUrl: normalizeAvatarPath(
        data.avatarUrl || merged[canonicalId].avatarUrl
      ),
    };
  });

  const availableEntries = Object.entries(merged).filter(
    ([id, person]) => !unavailableIds.has(id) && !person?.unavailable
  );

  participants = Object.fromEntries(availableEntries);
  renderAvatarGrids();
}

async function loadQuestions() {
  const remoteQuestions = await fetchVotingQuestions();
  if (remoteQuestions.length) {
    QUESTIONS = remoteQuestions.map(createQuestionShape);
  }

  renderQuestionContent();
}

async function loadExistingVotes() {
  if (!userId) return;

  const voteDocId = toLegacyId(userId);
  if (!voteDocId) return;

  try {
    const ref = doc(db, "votes", voteDocId);
    const snapshot = await getDoc(ref);

    if (snapshot.exists()) {
      const data = snapshot.data();
      QUESTIONS.forEach(({ id }) => {
        const saved = data?.[id] || data?.answers?.[id] || data?.votes?.[id];
        const normalisedSaved = normaliseTeamId(saved);
        if (normalisedSaved && participants[normalisedSaved]) {
          selectAvatar(id, normalisedSaved);
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

function resetVotes() {
  Object.keys(votesState).forEach((key) => delete votesState[key]);

  document.querySelectorAll(".avatar-grid .avatar-tile.selected").forEach((tile) => {
    tile.classList.remove("selected");
    tile.setAttribute("aria-pressed", "false");
  });

  if (submitButton) {
    submitButton.disabled = false;
    submitButton.textContent = "Submit Votes";
  }

  showToast("Votes reset");
}

async function saveVotes() {
  if (!validateVotes()) return;
  if (!submitButton) return;

  submitButton.disabled = true;
  submitButton.textContent = "Submitting…";

  const payload = QUESTIONS.reduce((acc, q) => {
    return { ...acc, [q.id]: votesState[q.id] };
  }, {});

  try {
    const voteDocId = toLegacyId(userId);
    if (!voteDocId) {
      throw new Error("Unable to determine voter id");
    }

    const ref = doc(db, "votes", voteDocId);
    await setDoc(ref, payload, { merge: true });

    showToast("Votes saved!");
    submitButton.textContent = "Saved";
    setTimeout(() => {
      window.location.href = "votes_results.html";
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
    await loadQuestions();
    await loadParticipants();
    await loadExistingVotes();
    submitButton?.addEventListener("click", saveVotes);
    resetButton?.addEventListener("click", resetVotes);
  } finally {
    toggleLoading(false);
  }
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}
