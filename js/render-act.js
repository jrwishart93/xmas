import { money } from '/js/constants.js';

export function renderAct(container, sections) {
  container.innerHTML = '';
  sections.forEach((section) => {
    const details = document.createElement('details');
    details.open = true;
    const summary = document.createElement('summary');
    summary.textContent = `${section.section}: ${section.title}`;
    details.appendChild(summary);

    section.clauses.forEach((clause) => {
      const p = document.createElement('p');
      p.innerHTML = `<strong>${clause.id} — ${clause.title}</strong><br>${clause.description}<br><small>Typical amount: ${money(clause.typicalAmountPence)}</small>`;
      details.appendChild(p);
    });

    container.appendChild(details);
  });
}
