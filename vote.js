import { TEAM } from "./team.js";

const questions = [
  { id: "first_home", label: "Who will be the first person to go home?" },
  { id: "last_standing", label: "Who will be the last one standing?" },
  { id: "most_drunk", label: "Who will be the most drunk?" },
  { id: "most_alcohol", label: "Who will consume the most alcohol?" },
  { id: "irish_exit", label: "Who will do an Irish exit?" },
];

function populateSelectOptions(select) {
  if (!select) return;
  const fragment = document.createDocumentFragment();

  Object.entries(TEAM).forEach(([id, person]) => {
    const option = document.createElement("option");
    option.value = id;
    option.textContent = person.name;
    fragment.appendChild(option);
  });

  select.appendChild(fragment);
}

function setQuestionLabels() {
  questions.forEach(({ id, label }) => {
    const select = document.querySelector(`#select-${id}`);
    const section = document.querySelector(`.vote-question[data-qid="${id}"] h2`);

    if (section) {
      section.textContent = label;
    }

    populateSelectOptions(select);
  });
}

setQuestionLabels();
