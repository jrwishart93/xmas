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

  const searchWrap = document.createElement('div');
  searchWrap.className = 'act-search-wrap';
  searchWrap.innerHTML = `
    <label class="act-search-label" for="actSearchInput">Search the Act</label>
    <input id="actSearchInput" class="act-search-input" type="search" placeholder="Try section code, title, or clause text" autocomplete="off" />
  `;
  frame.appendChild(searchWrap);

  const searchInput = searchWrap.querySelector('#actSearchInput');
  const normalizedParts = parts.map((part) => ({
    ...part,
    sections: (part.sections || []).map((section) => ({
      ...section,
      searchBlob: `${section.code || ''} ${section.title || ''} ${section.description || ''}`.toLowerCase()
    }))
  }));

  const emptyState = document.createElement('p');
  emptyState.className = 'act-empty';
  emptyState.textContent = 'No published parts are available yet.';

  const noResults = document.createElement('p');
  noResults.className = 'act-empty';
  noResults.hidden = true;
  noResults.textContent = 'No sections matched your search.';
  frame.appendChild(noResults);

  if (!parts.length) {
    frame.appendChild(emptyState);
  }

  function renderParts(searchTerm = '') {
    frame.querySelectorAll('.act-part').forEach((node) => node.remove());

    let hasResults = false;
    normalizedParts.forEach((part) => {
      const matchingSections = searchTerm
        ? part.sections.filter((section) => section.searchBlob.includes(searchTerm))
        : part.sections;

      if (!matchingSections.length) return;
      hasResults = true;

      const details = document.createElement('details');
      details.className = 'act-part';
      details.open = Boolean(searchTerm);

      const summary = document.createElement('summary');
      summary.className = 'act-part-summary';
      summary.innerHTML = `
        <span class="act-part-title"><span class="act-part-pill">Part ${part.partNumber}</span> ${part.title}</span>
        <span class="act-part-count">${matchingSections.length} ${matchingSections.length === 1 ? 'section' : 'sections'}</span>
      `;
      details.appendChild(summary);

      matchingSections.forEach((section) => {
        const article = document.createElement('article');
        article.className = 'act-section';
        article.innerHTML = `
          <div class="act-section-heading">
            <code>${section.code}</code>
            <strong>${section.title}</strong>
          </div>
          <p><strong>Contribution:</strong> £${Number(section.amountGBP || 0).toFixed(0)} <span class="muted">(${Number(section.amountPence || 0)}p)</span></p>
          <p class="muted">Late penalty: x${Number(section.latePenaltyMultiplier || 2)} after ${Number(section.latePenaltyAfterDays || 3)} days.</p>
          <p>${section.description}</p>
        `;
        details.appendChild(article);
      });

      frame.appendChild(details);
    });

    noResults.hidden = hasResults || !searchTerm;
  }

  renderParts();

  searchInput.addEventListener('input', (event) => {
    const searchTerm = event.target.value.trim().toLowerCase();
    renderParts(searchTerm);
  });

  container.appendChild(frame);
}
