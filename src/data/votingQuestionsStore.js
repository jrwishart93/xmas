import { collection, getDocs } from "https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js";
import { db } from "../../firebase.js";

function normaliseQuestionShape(entry = {}) {
  const id = entry.id || entry.questionId || "";
  if (!id) return null;

  return {
    id,
    question: entry.question || entry.prompt || "",
    icon: entry.icon || entry.image || "",
    alt: entry.alt || entry.altText || entry.question || entry.prompt || "",
  };
}

/**
 * Load the current set of voting questions from Firestore.
 * Falls back to an empty array if nothing is configured or the request fails.
 */
export async function fetchVotingQuestions() {
  try {
    const snap = await getDocs(collection(db, "votingQuestions"));
    const questions = [];

    snap.forEach((docSnap) => {
      const normalised = normaliseQuestionShape({
        id: docSnap.id,
        ...docSnap.data(),
      });

      if (normalised?.question) {
        questions.push(normalised);
      }
    });

    return questions;
  } catch (error) {
    console.error("Unable to load voting questions", error);
    return [];
  }
}

export const votingQuestionsStore = {
  fetchVotingQuestions,
};
