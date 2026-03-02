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
  const totalSections = parts.reduce((count, part) => count + (part.sections?.length || 0), 0);
  hero.innerHTML = `
    <p class="act-eyebrow">⚖️ Public rulebook</p>
    <h2>${act.title}</h2>
    <p class="act-subtitle">Browse all sections and clauses in an elevated, easy-to-scan format.</p>
    <div class="act-meta-row" role="list" aria-label="Act summary">
      <p class="act-meta" role="listitem"><span class="meta-label">Version</span><strong>${act.version}</strong></p>
      <p class="act-meta" role="listitem"><span class="meta-label">Last updated</span><strong>${formatLastUpdated(act.lastUpdated)}</strong></p>
      <p class="act-meta" role="listitem"><span class="meta-label">Parts</span><strong>${parts.length}</strong></p>
      <p class="act-meta" role="listitem"><span class="meta-label">Sections</span><strong>${totalSections}</strong></p>
    </div>
  `;
  frame.appendChild(hero);

  if (!parts.length) {
    const emptyState = document.createElement('p');
    emptyState.className = 'act-empty';
    emptyState.textContent = 'No published parts are available yet.';
    frame.appendChild(emptyState);
  }

  parts.forEach((part, index) => {
    const details = document.createElement('details');
    details.className = 'act-part';
    details.open = index === 0;

    const summary = document.createElement('summary');
    summary.className = 'act-part-summary';

    summary.innerHTML = `
      <span class="act-part-title"><span class="act-part-pill">Part ${part.partNumber}</span> ${part.title}</span>
      <span class="act-part-count">${(part.sections || []).length} ${(part.sections || []).length === 1 ? 'section' : 'sections'}</span>
    `;

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
