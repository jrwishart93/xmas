import { TEAM, getAvatarSrc, normalizeAvatarPath, normaliseTeamId } from "./team.js";
import { VOTING_QUESTIONS } from "./src/data/votingQuestions.js";
import { fetchVotingQuestions } from "./src/data/votingQuestionsStore.js";
import { fetchUsersFromFirestore } from "./src/data/users.js";
import { createAvatarName } from "./src/utils/avatarMap.js";
import { db } from "./firebase.js";
import { collection, getDocs } from "https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js";

const userId = normaliseTeamId(sessionStorage.getItem("loggedInUser"));
if (!userId) location.href = "index.html";

let QUESTIONS = [...VOTING_QUESTIONS];
let QUESTION_TITLES = {};
let tallies = {};
let ballotCount = 0;

const resultsContainer = document.getElementById("resultsContainer");
const resultsSummary = document.getElementById("resultsSummary");
let participants = { ...TEAM };

function buildQuestionTitleMap(list) {
  return list.reduce((acc, { id, question }) => {
    acc[id] = question;
    return acc;
  }, {});
}

function buildTallies(list) {
  return list.reduce((acc, { id }) => {
    acc[id] = {};
    return acc;
  }, {});
}

function setQuestions(list = []) {
  QUESTIONS = list.length ? list : VOTING_QUESTIONS;
  QUESTION_TITLES = buildQuestionTitleMap(QUESTIONS);
  tallies = buildTallies(QUESTIONS);
}

setQuestions(QUESTIONS);

function extractAnswers(data = {}) {
  const answers = {};

  QUESTIONS.forEach(({ id }) => {
    if (data[id]) {
      answers[id] = data[id];
    }
  });

  if (!Object.keys(answers).length) {
    const legacy = data.answers || data.votes;
    if (legacy && typeof legacy === "object") {
      Object.entries(legacy).forEach(([qid, choice]) => {
        if (QUESTIONS.some((q) => q.id === qid)) {
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
    const remoteQuestions = await fetchVotingQuestions();
    if (remoteQuestions.length) {
      setQuestions(remoteQuestions);
    }

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
      ballotCount += 1;
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
    renderSummary();
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
    const totalVotesForQuestion = sortedAnswers.reduce((acc, [, count]) => acc + count, 0);
    const totalLabel = totalVotesForQuestion === 1 ? "vote" : "votes";

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
        const percentage = totalVotesForQuestion ? Math.round((count / totalVotesForQuestion) * 100) : 0;
        countBadge.textContent = `${count} ${voteWord} (${percentage}%)`;

        const progress = document.createElement("span");
        progress.className = "result-row__progress";
        progress.style.width = `${Math.max(percentage, 8)}%`;
        progress.setAttribute("aria-hidden", "true");

        li.append(progress, avatarName, countBadge);
        ul.appendChild(li);
      });
    }

    const total = document.createElement("p");
    total.className = "result-total muted-text";
    total.textContent = `${totalVotesForQuestion} ${totalLabel} recorded for this question.`;

    block.append(ul, total);
    resultsContainer.appendChild(block);
  });

  if (!hasVotes) {
    const notice = document.createElement("p");
    notice.className = "muted-text";
    notice.textContent = "As soon as people vote, results will appear here.";
    resultsContainer.prepend(notice);
  }
}

function renderSummary() {
  if (!resultsSummary) return;

  const totalVotes = Object.values(tallies).reduce((sum, answers) => {
    return sum + Object.values(answers).reduce((a, b) => a + b, 0);
  }, 0);

  const activeQuestions = Object.values(tallies).filter((answers) => Object.keys(answers).length).length;
  const totalQuestions = QUESTIONS.length;

  const ballotLabel = ballotCount === 1 ? "ballot" : "ballots";
  const voteLabel = totalVotes === 1 ? "vote" : "votes";

  const progress = totalQuestions
    ? Math.round((activeQuestions / totalQuestions) * 100)
    : 0;

  resultsSummary.innerHTML = `
    <div class="summary-card">
      <div>
        <p class="muted-text">Ballots counted</p>
        <p class="summary-value">${ballotCount} <span class="summary-label">${ballotLabel}</span></p>
      </div>
      <div>
        <p class="muted-text">Total predictions</p>
        <p class="summary-value">${totalVotes} <span class="summary-label">${voteLabel}</span></p>
      </div>
      <div class="summary-progress">
        <div class="summary-progress__header">
          <p class="muted-text">Questions with votes</p>
          <p class="summary-label">${activeQuestions}/${totalQuestions}</p>
        </div>
        <div class="summary-progress__track" role="img" aria-label="${progress}% of questions have been voted on">
          <span class="summary-progress__fill" style="width: ${progress}%"></span>
        </div>
      </div>
    </div>
  `;
}

loadResults();
