import { TEAM } from "./team.js";
import { VOTING_QUESTIONS } from "./src/data/votingQuestions.js";
import { db } from "./firebase.js";
import { doc, setDoc } from "https://www.gstatic.com/firebasejs/10.5.0/firebase-firestore.js";

const userId = sessionStorage.getItem("loggedInUser");
if (!userId) location.href = "index.html";

const questionsContainer = document.getElementById("voteQuestions");

function buildQuestionSection({ id, question, icon }) {
  const section = document.createElement("section");
  section.className = "vote-question";
  section.dataset.qid = id;

  const selectId = `select-${id}`;
  section.innerHTML = `
    <h2>${question}</h2>
    <img src="${icon}" alt="" class="vote-icon" />
    <label class="sr-only" for="${selectId}">Select a person for ${question}</label>
    <select id="${selectId}" class="vote-select">
      <option value="">Select a person…</option>
    </select>
  `;

  return section;
}

if (questionsContainer) {
  VOTING_QUESTIONS.forEach((question) => {
    console.log("Loading icon:", question.icon);
    questionsContainer.appendChild(buildQuestionSection(question));
  });
}

const selects = document.querySelectorAll(".vote-select");

selects.forEach(sel => {
  Object.entries(TEAM).forEach(([id, user]) => {
    const opt = document.createElement("option");
    opt.value = id;
    opt.textContent = user.name;
    sel.appendChild(opt);
  });
});

document.getElementById("submitVotes").addEventListener("click", async () => {
  const results = {};
  let valid = true;

  document.querySelectorAll(".vote-question").forEach(q => {
    const qid = q.dataset.qid;
    const value = q.querySelector(".vote-select").value;
    if (!value) valid = false;
    results[qid] = value;
  });

  if (!valid) {
    alert("Please answer all questions before submitting.");
    return;
  }

  try {
    await setDoc(doc(db, "votes", userId), {
      votes: results,
      updatedAt: Date.now()
    });
    window.location.href = "votes_results.html";
  } catch (e) {
    alert("Unable to save votes. Please try again.");
    console.error(e);
  }
});
