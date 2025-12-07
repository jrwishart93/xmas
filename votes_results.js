import { TEAM } from "./team.js";
import { VOTING_QUESTIONS } from "./src/data/votingQuestions.js";
import { fetchUsersFromFirestore } from "./src/data/users.js";
import { db } from "./firebase.js";
import { collection, getDocs } from "https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js";

const userId = sessionStorage.getItem("loggedInUser");
if (!userId) location.href = "index.html";

const QUESTION_TITLES = VOTING_QUESTIONS.reduce((acc, { id, question }) => {
  acc[id] = question;
  return acc;
}, {});

const tallies = VOTING_QUESTIONS.reduce((acc, { id }) => {
  acc[id] = {};
  return acc;
}, {});

const resultsContainer = document.getElementById("resultsContainer");
let participants = { ...TEAM };

function extractAnswers(data = {}) {
  const answers = {};

  VOTING_QUESTIONS.forEach(({ id }) => {
    if (data[id]) {
      answers[id] = data[id];
    }
  });

  if (!Object.keys(answers).length) {
    const legacy = data.answers || data.votes;
    if (legacy && typeof legacy === "object") {
      Object.entries(legacy).forEach(([qid, choice]) => {
        if (VOTING_QUESTIONS.some((q) => q.id === qid)) {
          answers[qid] = choice;
        }
      });
    }
  }

  return answers;
}

function getDisplayName(userId) {
  return (
    participants[userId]?.name ||
    TEAM[userId]?.name ||
    "Unknown"
  );
}

async function loadResults() {
  try {
    const remoteUsers = await fetchUsersFromFirestore();
    Object.entries(remoteUsers).forEach(([id, data]) => {
      participants[id] = {
        ...participants[id],
        ...data,
        name: data.name || participants[id]?.name,
      };
    });

    const snap = await getDocs(collection(db, "votes"));

    snap.forEach(docSnap => {
      const data = docSnap.data();
      const answers = extractAnswers(data);
      if (!answers) return;
      for (const [qid, choice] of Object.entries(answers)) {
        if (!tallies[qid]) continue;
        tallies[qid][choice] = (tallies[qid][choice] || 0) + 1;
      }
    });

    renderTallies();
  } catch (error) {
    console.error("Error loading votes", error);
    resultsContainer.innerHTML = "<p class=\"muted-text\">Unable to load voting results right now. Please try again soon.</p>";
  }
}

function renderTallies() {
  resultsContainer.innerHTML = "";
  let hasVotes = false;

  Object.entries(tallies).forEach(([qid, answers]) => {
    const block = document.createElement("section");
    block.className = "result-section";

    const title = QUESTION_TITLES[qid] || qid;
    block.innerHTML = `<h2>${title}</h2>`;

    const ul = document.createElement("ul");

    const sortedAnswers = Object.entries(answers).sort((a, b) => b[1] - a[1]);

    if (!sortedAnswers.length) {
      const emptyItem = document.createElement("li");
      emptyItem.className = "muted-text";
      emptyItem.textContent = "No votes submitted yet.";
      ul.appendChild(emptyItem);
    } else {
      hasVotes = true;
      sortedAnswers.forEach(([uid, count]) => {
        const li = document.createElement("li");
        const name = getDisplayName(uid);
        li.textContent = `${name}: ${count} vote(s)`;
        ul.appendChild(li);
      });
    }

    block.appendChild(ul);
    resultsContainer.appendChild(block);
  });

  if (!hasVotes) {
    const notice = document.createElement("p");
    notice.className = "muted-text";
    notice.textContent = "As soon as people vote, results will appear here.";
    resultsContainer.prepend(notice);
  }
}

loadResults();
