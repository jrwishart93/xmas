import { TEAM } from "./team.js";
import { VOTING_QUESTIONS } from "./src/data/votingQuestions.js";
import { db } from "./firebase.js";
import { collection, doc, setDoc } from "https://www.gstatic.com/firebasejs/10.5.0/firebase-firestore.js";

const userId = sessionStorage.getItem("loggedInUser");
if (!userId) location.href = "index.html";

const QUESTIONS = VOTING_QUESTIONS.map(({ id, question, icon }) => ({
  id,
  label: question,
  image: icon
}));

const questionsContainer = document.getElementById("questionsContainer");
const votesState = {}; // { questionId: userId }

function handleVoteClick(questionId, userId, chip, strip) {
  votesState[questionId] = userId;

  strip.querySelectorAll(".vote-avatar-chip.selected").forEach((el) => {
    el.classList.remove("selected");
  });

  chip.classList.add("selected");

  const label = document.querySelector(
    `.vote-selected-label[data-selected-label="${questionId}"]`
  );
  const userName = TEAM[userId]?.name || userId;
  if (label) {
    label.textContent = `You’ve picked ${userName} for this question.`;
  }
}

function renderQuestions() {
  if (!questionsContainer) return;
  questionsContainer.innerHTML = "";

  QUESTIONS.forEach((q) => {
    const card = document.createElement("article");
    card.className = "vote-question-card";
    card.dataset.questionId = q.id;

    card.innerHTML = `
      <h2 class="vote-question-title">${q.label}</h2>
      <div class="vote-question-image">
        <img src="${q.image}" alt="${q.label}" />
      </div>
      <div class="avatar-strip" data-question-id="${q.id}"></div>
      <p class="vote-selected-label" data-selected-label="${q.id}">
        Tap a face to vote.
      </p>
    `;

    questionsContainer.appendChild(card);

    const strip = card.querySelector(".avatar-strip");
    if (!strip) return;

    Object.entries(TEAM).forEach(([id, user]) => {
      const chip = document.createElement("button");
      chip.type = "button";
      chip.className = "vote-avatar-chip";
      chip.dataset.userId = id;
      chip.setAttribute("aria-label", `${q.label} – vote for ${user.name}`);

      chip.innerHTML = `
        <img src="${user.image}" alt="${user.name}" />
        <span>${user.name}</span>
      `;

      chip.addEventListener("click", () => handleVoteClick(q.id, id, chip, strip));

      strip.appendChild(chip);
    });
  });
}

const submitVotesBtn = document.getElementById("submitVotes");

submitVotesBtn?.addEventListener("click", async () => {
  const voterId = sessionStorage.getItem("loggedInUser");

  const missing = QUESTIONS.filter((q) => !votesState[q.id]);
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
      answers: { ...votesState },
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

document.addEventListener("DOMContentLoaded", () => {
  renderQuestions();
});
