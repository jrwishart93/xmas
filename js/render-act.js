function formatLastUpdated(value) {
  if (!value) return 'Unknown';

  if (typeof value === 'object' && typeof value.toDate === 'function') {
    return value.toDate().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Unknown';

  return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

export function renderAct(container, act) {
  container.innerHTML = '';
  container.classList.add('act-view');

  const frame = document.createElement('section');
  frame.className = 'act-frame';

  const hero = document.createElement('section');
  hero.className = 'act-hero';
  const parts = act.parts || [];
  hero.innerHTML = `
    <h2>${act.title}</h2>
    <p class="act-subtitle">Read-Only Rulebook</p>
    <div class="act-meta-row">
      <p class="act-meta">Version: ${act.version}</p>
      <p class="act-meta">Last updated: ${formatLastUpdated(act.lastUpdated)}</p>
      <p class="act-meta">Parts: ${parts.length}</p>
    </div>
  `;
  frame.appendChild(hero);

  parts.forEach((part, index) => {
    const details = document.createElement('details');
    details.className = 'act-part';
    details.open = index === 0;

    const summary = document.createElement('summary');
    summary.className = 'act-part-summary';

    const title = document.createElement('span');
    title.textContent = `Part ${part.partNumber} – ${part.title}`;
    summary.appendChild(title);

    details.appendChild(summary);

    (part.sections || []).forEach((section) => {
      const article = document.createElement('article');
      article.className = 'act-section';
      article.innerHTML = `
        <div class="act-section-heading">
          <code>${section.code}</code>
          <strong>${section.title}</strong>
        </div>
        <p>${section.description}</p>
      `;
      details.appendChild(article);
    });

    frame.appendChild(details);
  });

  container.appendChild(frame);
}
