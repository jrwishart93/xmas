import { TEAM } from "./team.js";
import { db } from "./firebase.js";
import { doc, setDoc, getDoc } from "https://www.gstatic.com/firebasejs/10.5.0/firebase-firestore.js";

const userId = sessionStorage.getItem("loggedInUser");
if (!userId) location.href = "index.html";

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
