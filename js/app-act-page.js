import { bootProtectedPage } from '/js/app-common.js';
import { loadAct } from '/js/act.js';
import { renderAct } from '/js/render-act.js';

bootProtectedPage(async () => {
  renderAct(document.getElementById('actContainer'), await loadAct());
});
