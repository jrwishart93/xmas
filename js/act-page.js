import { loadAct } from '/js/act.js';
import { renderAct } from '/js/render-act.js';

const container = document.getElementById('actContainer');
loadAct().then((sections) => renderAct(container, sections));
