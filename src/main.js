// Avvio dell'app: routing per hash (#/ landing, #/app area di lavoro) e collegamento dei moduli.

import { createViewer } from './viewer.js';
import { createPanel } from './panel.js';
import { createFileSession } from './files.js';

const $ = (sel) => document.querySelector(sel);

// --- Routing ---------------------------------------------------------------
const views = document.querySelectorAll('[data-view]');
let viewer = null;

function route() {
  const name = location.hash.startsWith('#/app') ? 'app' : 'landing';
  views.forEach((v) => (v.hidden = v.dataset.view !== name));
  if (name === 'app') {
    initWorkspace();
    viewer?.resize();
  }
}
window.addEventListener('hashchange', route);

// --- Area di lavoro -----------------------------------------------------------
let initialized = false;

function initWorkspace() {
  if (initialized) return;
  initialized = true;

  const viewerEl = $('#viewer');
  try {
    viewer = createViewer(viewerEl, $('#viewer-canvas'));
  } catch (err) {
    console.error(err);
    const msg = $('#viewer-error');
    msg.textContent = 'La vista 3D non è disponibile su questo dispositivo (WebGL non attivo).';
    msg.hidden = false;
  }

  const panel = createPanel({
    form: $('#dims-form'),
    sourceEl: $('#meta-source'),
    confidenceEl: $('#meta-confidence'),
    warningsEl: $('#warnings'),
    onChange: ({ dims }) => viewer?.setDimensions(dims),
  });
  panel.submit();

  createFileSession({
    dropzone: $('#dropzone'),
    input: $('#file-input'),
    list: $('#file-list'),
    empty: $('#file-empty'),
    preview: $('#flat-preview'),
    onSelect: ({ entry, error }) => {
      if (error) alert(error);
      else if (entry) showTab('flat');
    },
  });

  // Tabs anteprima / 3D
  $('#tab-flat').addEventListener('click', () => showTab('flat'));
  $('#tab-3d').addEventListener('click', () => showTab('3d'));

  // Controlli 3D
  viewerEl.addEventListener('click', (e) => {
    const btn = e.target.closest('button');
    if (!btn || !viewer) return;
    if (btn.dataset.rotate) {
      viewer.rotate(btn.dataset.rotate, Number(btn.dataset.dir));
      return;
    }
    switch (btn.dataset.action) {
      case 'reset':
        viewer.resetView();
        break;
      case 'xray':
        btn.setAttribute('aria-pressed', String(viewer.setXray(!viewer.isXray())));
        break;
      case 'autorotate':
        btn.setAttribute('aria-pressed', String(viewer.setAutoRotate(btn.getAttribute('aria-pressed') !== 'true')));
        break;
      case 'background':
        viewerEl.classList.toggle('bg-white');
        break;
      case 'fullscreen':
        toggleFullscreen(viewerEl);
        break;
    }
  });
}

function showTab(which) {
  const flat = which === 'flat';
  $('#tab-flat').setAttribute('aria-selected', String(flat));
  $('#tab-3d').setAttribute('aria-selected', String(!flat));
  $('#pane-flat').hidden = !flat;
  $('#pane-3d').hidden = flat;
  if (!flat) viewer?.resize();
}

// Schermo intero: API standard dove c'è, altrimenti (es. iPhone Safari) un overlay a tutta pagina.
function toggleFullscreen(el) {
  if (document.fullscreenElement) return document.exitFullscreen();
  if (el.classList.contains('is-pseudo-fullscreen')) return el.classList.remove('is-pseudo-fullscreen');
  if (el.requestFullscreen) {
    el.requestFullscreen().catch(() => el.classList.add('is-pseudo-fullscreen'));
  } else {
    el.classList.add('is-pseudo-fullscreen');
  }
}
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') $('#viewer')?.classList.remove('is-pseudo-fullscreen');
});

route();
