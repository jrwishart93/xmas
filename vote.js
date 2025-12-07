import { TEAM } from "./team.js";
import { VOTING_QUESTIONS } from "./src/data/votingQuestions.js";
import { createAvatarName } from "./src/utils/avatarMap.js";
import { db } from "./firebase.js";
import { collection, doc, setDoc } from "https://www.gstatic.com/firebasejs/10.5.0/firebase-firestore.js";

const userId = sessionStorage.getItem("loggedInUser");
if (!userId) location.href = "index.html";

const questionsContainer = document.getElementById("voteQuestions");
const voteSelections = {};

function buildQuestionSection({ id, question, icon, alt }) {
  const section = document.createElement("section");
  section.className = "vote-question vote-card";
  section.dataset.questionId = id;

  const selectId = `select-${id}`;
  section.innerHTML = `
    <h2>${question}</h2>
    <div class="question-art">
      <img src="${icon}" alt="${alt || ""}" class="vote-question-image" />
    </div>
    <div class="vote-avatar-grid" data-question-id="${id}"></div>
    <label class="sr-only" for="${selectId}">Select a person for ${question}</label>
    <select id="${selectId}" class="vote-select" data-question-id="${id}" hidden>
      <option value="">Select a person…</option>
    </select>
  `;

  return section;
}

if (questionsContainer) {
  VOTING_QUESTIONS.forEach((question) => {
    questionsContainer.appendChild(buildQuestionSection(question));
  });
}

const questionGrids = document.querySelectorAll(".vote-avatar-grid");
const voteSelects = document.querySelectorAll(".vote-select");

voteSelects.forEach((sel) => {
  Object.entries(TEAM).forEach(([id, user]) => {
    const opt = document.createElement("option");
    opt.value = id;
    opt.textContent = user.name;
    sel.appendChild(opt);
  });
});

function updateGridSelection(questionId, userId) {
  const gridEl = document.querySelector(
    `.vote-avatar-grid[data-question-id="${questionId}"]`
  );

  if (!gridEl) return;

  gridEl.querySelectorAll(".vote-avatar-card").forEach((card) => {
    const isSelected = card.dataset.userId === userId;
    card.classList.toggle("selected", isSelected);
    card.setAttribute("aria-pressed", String(isSelected));
  });
}

function setSelection(questionId, userId) {
  if (userId) {
    voteSelections[questionId] = userId;
  } else {
    delete voteSelections[questionId];
  }

  const selectEl = document.querySelector(
    `.vote-select[data-question-id="${questionId}"]`
  );

  if (selectEl) {
    selectEl.value = userId || "";
  }

  updateGridSelection(questionId, userId);
}

function renderAvatarGrid(gridEl) {
  const questionId = gridEl.dataset.questionId;
  gridEl.innerHTML = "";

  Object.entries(TEAM).forEach(([id, user]) => {
    const card = document.createElement("button");
    card.type = "button";
    card.className = "vote-avatar-card";
    card.dataset.userId = id;
    card.setAttribute("aria-pressed", "false");

    let avatarEl;
    if (user.image) {
      avatarEl = document.createElement("img");
      avatarEl.src = user.image;
      avatarEl.alt = user.name;
      avatarEl.loading = "lazy";
    } else {
      const avatarWrapper = createAvatarName(user.name, 56, { image: user.image });
      avatarWrapper.querySelector(".avatar-name__label")?.remove();
      avatarEl = avatarWrapper.querySelector(".avatar") || avatarWrapper;
    }

    const label = document.createElement("span");
    label.className = "vote-avatar-name";
    label.textContent = user.name;

    card.append(avatarEl, label);

    card.addEventListener("click", () => {
      setSelection(questionId, id);
    });

    gridEl.append(card);
  });
}

questionGrids.forEach(renderAvatarGrid);

voteSelects.forEach((sel) => {
  sel.addEventListener("change", () => {
    const qid = sel.dataset.questionId;
    const value = sel.value;
    setSelection(qid, value);
  });
});

const submitVotesBtn = document.getElementById("submitVotes");

submitVotesBtn?.addEventListener("click", async () => {
  const voterId = sessionStorage.getItem("loggedInUser");

  const requiredQuestions = VOTING_QUESTIONS.map(({ id }) => id);

  const missing = requiredQuestions.filter((qId) => !voteSelections[qId]);
  if (missing.length) {
    alert("Please choose someone for every question before submitting.");
    return;
  }

  submitVotesBtn.disabled = true;
  submitVotesBtn.textContent = "Submitting…";

  try {
    const ref = doc(collection(db, "votes"), voterId);
    await setDoc(ref, {
      voterId,
      answers: { ...voteSelections },
      submittedAt: Date.now()
    });

    submitVotesBtn.textContent = "Votes submitted!";
    window.location.href = "votes_results.html";
  } catch (error) {
    console.error("Failed to save votes", error);
    alert("We couldn't save your votes. Please try again.");
    submitVotesBtn.disabled = false;
    submitVotesBtn.textContent = "Submit votes";
  }
});
