import { TEAM, getAvatarSrc, normalizeAvatarPath, normaliseTeamId } from "./team.js";
import { VOTING_QUESTIONS } from "./src/data/votingQuestions.js";
import { fetchUsersFromFirestore } from "./src/data/users.js";
import { createAvatarName } from "./src/utils/avatarMap.js";
import { db } from "./firebase.js";
import { collection, getDocs } from "https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js";

const userId = normaliseTeamId(sessionStorage.getItem("loggedInUser"));
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
      const canonicalId = normaliseTeamId(id);
      if (!canonicalId) return;

      participants[canonicalId] = {
        ...participants[canonicalId],
        ...data,
        name: data.name || participants[canonicalId]?.name,
        avatar: normalizeAvatarPath(
          data.avatarUrl || data.avatar || participants[canonicalId]?.avatar || getAvatarSrc(canonicalId)
        ),
      };
    });

    const snap = await getDocs(collection(db, "votes"));

    snap.forEach(docSnap => {
      const data = docSnap.data();
      const answers = extractAnswers(data);
      if (!answers) return;
      for (const [qid, choice] of Object.entries(answers)) {
        if (!tallies[qid]) continue;
        const normalisedChoice = normaliseTeamId(choice);
        if (!normalisedChoice) continue;
        tallies[qid][normalisedChoice] = (tallies[qid][normalisedChoice] || 0) + 1;
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
      sortedAnswers.forEach(([uid, count], index) => {
        const li = document.createElement("li");
        li.className = "result-row";
        const isLeader = index === 0;

        if (isLeader) {
          li.classList.add("result-row--leader");
        }

        const name = getDisplayName(uid);
        const avatar = normalizeAvatarPath(
          participants[uid]?.avatar || participants[uid]?.avatarUrl || getAvatarSrc(uid)
        );
        const resolvedAvatar = normalizeAvatarPath(avatar) || undefined;
        const avatarName = createAvatarName(name, isLeader ? 60 : 42, { image: resolvedAvatar });
        avatarName.classList.add("result-row__identity");

        if (isLeader) {
          const badge = document.createElement("span");
          badge.className = "result-row__medal";
          badge.setAttribute("aria-hidden", "true");
          badge.textContent = "🏆";
          avatarName.prepend(badge);
        }

        const countBadge = document.createElement("span");
        countBadge.className = "result-row__count";
        const voteWord = count === 1 ? "vote" : "votes";
        countBadge.textContent = `${count} ${voteWord}`;

        li.append(avatarName, countBadge);
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
