// File della sessione: drop / scelta, lista in memoria e anteprima piatta.
// I file restano nel browser: nessun upload, nessuna persistenza.

const PDF_WORKER = 'https://cdn.jsdelivr.net/npm/pdfjs-dist@4.7.76/build/pdf.worker.min.mjs';
const ACCEPTED = ['application/pdf', 'image/png', 'image/jpeg'];
const PREVIEW_MAX_PX = 1600;

let pdfjsPromise = null;
function loadPdfjs() {
  // pdf.js si carica solo al primo PDF.
  pdfjsPromise ??= import('pdfjs-dist').then((pdfjs) => {
    pdfjs.GlobalWorkerOptions.workerSrc = PDF_WORKER;
    return pdfjs;
  });
  return pdfjsPromise;
}

function kindOf(file) {
  if (file.type === 'application/pdf' || /\.pdf$/i.test(file.name)) return 'pdf';
  if (ACCEPTED.includes(file.type) || /\.(png|jpe?g)$/i.test(file.name)) return 'image';
  return null;
}

function formatSize(bytes) {
  return bytes < 1024 * 1024 ? `${Math.round(bytes / 1024)} KB` : `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export function createFileSession({ dropzone, input, list, empty, preview, onSelect }) {
  const files = [];
  let current = null;
  // Contatore e non crypto.randomUUID(): quella API esiste solo in contesti sicuri
  // (HTTPS o localhost) e manca quando il sito è aperto via http://IP-di-rete.
  let nextId = 1;

  function add(fileList) {
    for (const file of fileList) {
      const kind = kindOf(file);
      if (!kind) {
        onSelect?.({ error: `Formato non supportato: ${file.name}. Usa PDF, PNG o JPG.` });
        continue;
      }
      const entry = { id: nextId++, file, kind };
      files.push(entry);
      select(entry.id);
    }
    renderList();
  }

  function select(id) {
    current = files.find((f) => f.id === id) ?? null;
    renderList();
    renderPreview();
    onSelect?.({ entry: current });
  }

  function renderList() {
    list.replaceChildren(
      ...files.map((f) => {
        const li = document.createElement('li');
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'file-item';
        btn.setAttribute('aria-current', String(f === current));
        btn.innerHTML = `<span class="file-name"></span><span class="file-meta"></span>`;
        btn.querySelector('.file-name').textContent = f.file.name;
        btn.querySelector('.file-meta').textContent = `${f.kind.toUpperCase()} · ${formatSize(f.file.size)}`;
        btn.addEventListener('click', () => select(f.id));
        li.append(btn);
        return li;
      }),
    );
    empty.hidden = files.length > 0;
  }

  async function renderPreview() {
    const entry = current;
    preview.replaceChildren();
    if (!entry) return;
    const status = document.createElement('p');
    status.className = 'muted';
    status.textContent = 'Preparazione anteprima…';
    preview.append(status);
    try {
      const el = entry.kind === 'pdf' ? await renderPdf(entry.file) : await renderImage(entry.file);
      if (current === entry) preview.replaceChildren(el);
    } catch (err) {
      console.error(err);
      if (current === entry) status.textContent = `Impossibile leggere il file: ${err.message}`;
    }
  }

  async function renderPdf(file) {
    const pdfjs = await loadPdfjs();
    const doc = await pdfjs.getDocument({ data: await file.arrayBuffer() }).promise;
    const page = await doc.getPage(1);
    const base = page.getViewport({ scale: 1 });
    const scale = Math.min(PREVIEW_MAX_PX / Math.max(base.width, base.height), 4);
    const viewport = page.getViewport({ scale });
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(viewport.width);
    canvas.height = Math.round(viewport.height);
    canvas.setAttribute('aria-label', `Anteprima di ${file.name}`);
    await page.render({ canvasContext: canvas.getContext('2d'), viewport }).promise;
    doc.destroy();
    return canvas;
  }

  function renderImage(file) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.alt = `Anteprima di ${file.name}`;
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error('immagine non valida'));
      img.src = URL.createObjectURL(file);
    });
  }

  // Input
  input.addEventListener('change', () => {
    add(input.files);
    input.value = '';
  });
  dropzone.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      input.click();
    }
  });
  for (const type of ['dragenter', 'dragover']) {
    dropzone.addEventListener(type, (e) => {
      e.preventDefault();
      dropzone.classList.add('is-over');
    });
  }
  for (const type of ['dragleave', 'drop']) {
    dropzone.addEventListener(type, () => dropzone.classList.remove('is-over'));
  }
  dropzone.addEventListener('drop', (e) => {
    e.preventDefault();
    add(e.dataTransfer.files);
  });
  // Un file lasciato fuori dall'area non deve far navigare il browser via dalla pagina.
  window.addEventListener('dragover', (e) => e.preventDefault());
  window.addEventListener('drop', (e) => e.preventDefault());

  renderList();
  return { add, select, files };
}
