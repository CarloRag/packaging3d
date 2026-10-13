# Packaging 3D

Web app statica che trasforma un file di fustella (PDF o immagine) in un modello 3D del packaging. Tutta l'elaborazione avviene nel browser: il file caricato non viene inviato a nessun server.

Specifiche e decisioni di progetto: [PROJECT.md](PROJECT.md).

## Avvio in locale

Serve un server HTTP statico qualsiasi (i moduli ES non funzionano aprendo `index.html` con `file://`). Dalla cartella del progetto:

```bash
python3 -m http.server 8000
```

Poi apri <http://localhost:8000>.

## Struttura

```
index.html        pagina unica: landing (#/) e area di lavoro (#/app)
styles/main.css   stile, layout a tre colonne → una colonna su mobile
src/main.js       routing e collegamento dei moduli
src/viewer.js     vista 3D (Three.js): solido L × P × H e controlli
src/panel.js      pannello dati: misure, fonte, confidenza, avvisi
src/files.js      file della sessione e anteprima piatta (pdf.js)
```

## Dipendenze

Caricate da CDN via importmap in `index.html`, con versioni esatte:

- Three.js 0.169.0
- pdf.js (pdfjs-dist) 4.7.76

Nessun passaggio di build, nessun backend: il sito gira su qualsiasi hosting statico (GitHub Pages, VPS, hosting condiviso).

## Dati di test

La cartella `samples/` contiene file di clienti reali ed è esclusa dal repository (`.gitignore`). Per test pubblici usare campioni anonimi o inventati.
