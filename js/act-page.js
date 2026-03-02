import { initIcons, initMobileNav } from '/js/app-common.js';
import { loadLocalAct } from '/js/act.js';
import { renderAct } from '/js/render-act.js';

const container = document.getElementById('actContainer');
initMobileNav();
initIcons();

loadLocalAct()
  .then((sections) => renderAct(container, sections))
  .catch((error) => {
    container.innerHTML = `<section class="card"><p>Unable to load Act data: ${error.message}</p></section>`;
  });
