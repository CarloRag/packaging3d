// Pannello dati: misure L × P × H, fonte, confidenza, tipo di astuccio.
// Per ora le misure sono solo manuali: fonte "manuale", confidenza "bassa".

const CONFIDENCE = {
  alta: 'badge-high',
  media: 'badge-mid',
  bassa: 'badge-low',
};

// Limiti provvisori per astucci farmaceutici tuck-end (mm). Le soglie
// definitive per tipologia sono un problema aperto in PROJECT.md.
const LIMITS = {
  'tuck-end': { min: 10, max: 300 },
};

export function createPanel({ form, sourceEl, confidenceEl, warningsEl, onChange }) {
  function read() {
    const data = new FormData(form);
    const dims = {};
    for (const k of ['L', 'P', 'H']) {
      const v = Number(String(data.get(k)).replace(',', '.'));
      dims[k] = Number.isFinite(v) && v > 0 ? v : null;
    }
    return { dims, type: data.get('type') };
  }

  function check({ dims, type }) {
    const warnings = [];
    const lim = LIMITS[type];
    for (const [k, v] of Object.entries(dims)) {
      if (v == null) warnings.push(`${k}: inserisci un valore positivo in mm.`);
      else if (lim && (v < lim.min || v > lim.max)) {
        warnings.push(`${k} = ${v} mm è fuori dai valori tipici per questo astuccio (${lim.min}–${lim.max} mm).`);
      }
    }
    return warnings;
  }

  function setMeta({ source, confidence }) {
    sourceEl.textContent = source;
    confidenceEl.textContent = confidence;
    confidenceEl.className = `badge ${CONFIDENCE[confidence] ?? CONFIDENCE.bassa}`;
  }

  function showWarnings(list) {
    warningsEl.replaceChildren(
      ...list.map((text) => {
        const li = document.createElement('li');
        li.textContent = text;
        return li;
      }),
    );
  }

  function submit() {
    const state = read();
    const warnings = check(state);
    showWarnings(warnings);
    setMeta({ source: 'manuale', confidence: 'bassa' });
    if (Object.values(state.dims).every((v) => v != null)) onChange?.(state);
  }

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    submit();
  });

  return { submit, read, setMeta };
}
