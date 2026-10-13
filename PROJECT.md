# Packaging 3D da fustella: istruzioni di progetto

## Obiettivo

Un MVP pubblico, online, che trasforma un file di fustella (PDF o immagine) in un modello 3D ruotabile del packaging finito.

Il principio guida: **l'utente carica un solo file**, senza altri input. Il sistema ricava da solo forma, pieghe, artwork e misure, e mostra il risultato con il suo livello di confidenza.

## Utenti

Persone che lavorano con packaging e hanno solo il file di stampa (la fustella), spesso senza le misure quotate. Non sono necessariamente tecnici.

## Input

- **Formato accettato:** PDF (raster o vettoriale) oppure immagine (PNG, JPG).
- **Unico file richiesto.** Nessun file aggiuntivo, nessun campo obbligatorio.
- **Campo opzionale:** misure manuali L × P × H, da usare solo se il sistema non le trova o se l'utente le vuole sovrascrivere.
- Elaborazione **nel browser**. Il file non viene caricato su un server.

## Ricerca delle misure (ordine di priorità)

1. **Testo dichiarato nel file.** Pattern tipo `75x25x105`, `Ast. 75 x 25 x 105`, `75 × 25 × 105`, cercato nel livello testo del PDF. Se trovato, è la fonte più affidabile.
   - Le annotazioni convertite in tracciati (testo non selezionabile) richiedono OCR: **rimandato** (vedi Problemi aperti).
2. **PDF vettoriale a 1:1.** Le misure si ricavano dalle coordinate delle linee di piega, convertite da punti PDF a mm (1 pt = 25,4/72 mm). Confidenza **alta** se le misure superano i controlli di plausibilità; altrimenti confidenza ridotta e segnalazione dell'anomalia.
3. **Misure inserite dall'utente.**

Se nessuna fonte affidabile è disponibile, il sistema lo dice chiaramente e chiede all'utente le misure.

### Codice a barre: solo controllo, non fonte di scala

Il codice a barre **non è una fonte di scala**: l'ingrandimento di stampa non è fisso (lo standard ammette 80–200%, e nei file di prova è perfino sotto l'80%). Si usa solo come **controllo incrociato, con confidenza bassa**: il sistema può riportare l'ingrandimento ricavato (larghezza misurata / 31,35 mm) come informazione, ma non scala il disegno su quella base.

- Riferimento EAN-13 al 100%: **37,29 mm** con quiet zone (11 moduli per lato); simbolo senza margini **95 moduli × 0,33 mm ≈ 31,35 mm**.
- Il codice a barre va localizzato per pattern (sequenza di 30 barre verticali alternate, con le cifre sotto), non per posizione fissa.

**Valori misurati sui file di prova** (2026-10-13):

| Test | Larghezza barre (senza quiet zone) | Modulo | Ingrandimento |
|------|-----------------------------------|--------|---------------|
| 2 – Prodotto B | **17,29 mm** (817 px a 1200 dpi) | 0,182 mm | **≈ 55%** |
| 1 – Prodotto A | **22,47 mm** (dai vettori, barre di guardia) | 0,237 mm | **≈ 72%** |

Metodo (test 2): rasterizzazione con PyMuPDF 1.26.5 della sola area del codice a barre, in scala di grigi, a 300 / 600 / 1200 dpi. Soglia a metà tra sfondo (212) e barre (66); scansione di 20 righe sopra le cifre; larghezza = distanza tra primo e ultimo pixel scuro. Risultati: 205 px a 300 dpi (17,36 mm), 408 px a 600 dpi (17,29 mm; ≈ 408,5 px con interpolazione sub-pixel), 817 px a 1200 dpi (17,29 mm). Ogni riga contiene 30 barre (EAN-13 completo). Verifica sui vettori: 49,04 pt = 17,30 mm, coerente con il raster.

Usando la regola "barcode al 100%" si otterrebbe circa 105 × 35 × 146 mm per il test 1 (invece di 75 × 25 × 105) e circa 61 × 61 × 229 mm per il test 2: per questo il metodo è stato declassato.

## Regole di conferma

- Il sistema mostra **misure, fonte e confidenza** (alta / media / bassa) prima di generare il 3D.
- L'utente può correggere le misure e rigenerare.
- **Controlli di plausibilità:** se una dimensione supera i limiti tipici per la tipologia (es. altezza > 300 mm per un astuccio farmaceutico), il sistema segnala l'anomalia. Non deve mai presentare una misura come certa se non lo è.
- Mai mostrare precisione che il dato non supporta (niente decimali inutili su una stima da raster).

## Tipologie supportate

**MVP:**
- Astuccio con linguetta di chiusura (tuck-end): quattro pannelli verticali, chiusure superiore e inferiore a trapezio o arco.

**Fasi successive:**
- RSC (astuccio a due pezzi con incastro)
- Sleeve, blister, cilindri

Per ogni tipologia serve una regola geometrica di piegatura. Il sistema riconosce la tipologia dalla forma del contorno.

## Riconoscimento della fustella

Taglio e piega si riconoscono **per topologia, non per colore**:

- **Taglio:** il contorno chiuso esterno della fustella.
- **Piega (crease):** le linee interne al contorno.
- **Artwork:** tutto ciò che sta dentro il contorno ed è colorato. Il testo capovolto va ruotato in base al pannello.
- **Annotazioni tecniche:** elementi fuori dal contorno (es. "PINZA LATO STAMPA", il nome del formato). Vanno ignorate nel 3D; il loro testo può essere usato per le misure quando è nel livello testo.

Il colore serve solo come indizio per trovare le linee della fustella (tratti sottili, lunghi, rettilinei), con soglie regolabili per file. Nei file di prova:

- Test 1: taglio grigio scuro RGB(0,11; 0,11; 0,11), piega rossa RGB(0,89; 0,02; 0,08), entrambi 0,42 pt; annotazioni magenta in tracciati.
- Test 2: taglio e piega **dello stesso colore** (magenta RGB(0,90; 0; 0,49), 1 pt): la separazione per colore non funziona.

## Modello geometrico

1. Separare i pannelli lungo le pieghe.
2. Assegnare a ogni pannello una faccia del solido (fronte, retro, fianchi, chiusure, linguette di incollaggio).
3. Piegare i pannelli attorno alle pieghe fino a formare il solido con le dimensioni L × P × H.
4. Mappare l'artwork di ciascun pannello sulla faccia corrispondente, con l'orientamento corretto.

## Rendering 3D

- **Three.js** in HTML/JS puro, senza backend.
- Rotazione automatica, con possibilità di controllo col mouse; zoom.
- Sfondo neutro.
- Export di un'immagine o di un breve video/GIF.

## Sito

### Pagine

1. **Landing:** titolo e pulsante "Inizia", che porta all'upload.
2. **Upload:** caricamento del file (PDF, PNG, JPG).
3. **Analisi:** risultato del parser e conferma delle misure (misure, fonte, confidenza, eventuali anomalie).
4. **Vista 3D:** modello del packaging con i controlli.

### Vista di lavoro a tre colonne

| Sinistra | Centro | Destra |
|----------|--------|--------|
| Lista dei file caricati nella sessione | Anteprima del fustellato piatto con artwork | Pannello dati: misure, fonte, confidenza, campi modificabili, tipo di astuccio |

### Controlli 3D

- Reset della vista.
- X-ray (pannelli semitrasparenti, per vedere la struttura interna).
- Rotazione per asse: X, Y, Z, nei due versi.
- Rotazione automatica (attiva / disattiva).
- Schermo intero.
- Sfondo bianco o neutro.

### Vincoli

- **Nessun login:** sito pubblico, elaborazione interamente nel browser. I file non lasciano il dispositivo dell'utente.
- **Identità visiva propria:** non copiare nome, logo o layout di HelloPack.
- **Hosting statico:** piattaforma da decidere (GitHub Pages o simili, es. Netlify, Cloudflare Pages).

## Stack

- HTML + JavaScript (ES modules) + Three.js.
- Parsing PDF: pdf.js. Per i PDF vettoriali si leggono direttamente tracciati e testo (operator list); la rasterizzazione serve per l'artwork e per i file raster.
- Analisi immagine: Canvas API e librerie di elaborazione leggere.
- Hosting statico, senza server.

## Casi di test

| # | File | Misure dichiarate | Fonte attesa | Stato | Note |
|---|------|-------------------|--------------|-------|------|
| 1 | Fustella Prodotto A | 75 × 25 × 105 (annotazione in tracciati, non nel livello testo) | PDF vettoriale 1:1 | **Verificato:** misura vettoriale delle pieghe 75,0 × 25,0 × 105,0 mm | Il testo dichiarato conferma la misura vettoriale; leggerlo automaticamente richiede OCR (rimandato). Codice a barre ≈ 72%. |
| 2 | Fustella Prodotto B | nessuna | PDF vettoriale 1:1 | **Da confermare:** stima 33,5 × 33,5 × 126,5 mm | Tuck-end. Nessuna misura nel file: il test più importante per il caso "solo file". Taglio e piega dello stesso colore. Codice a barre ≈ 55%. |

**Criterio di successo per il caso 1:** il parser produce dai vettori misure entro ±2 mm rispetto a 75 × 25 × 105, con fonte "PDF vettoriale 1:1" e confidenza alta.

**Criterio per il caso 2:** il sistema produce una stima con confidenza indicata e segnala se le proporzioni sono anomale. Valore atteso da confermare con il cliente o con il campione fisico: 33,5 × 33,5 × 126,5 mm.

## Problemi aperti

- **PNG/JPG non hanno ancora una fonte di scala affidabile:** il codice a barre non lo è e l'immagine non contiene misure fisiche. Per ora il sistema deve chiedere le misure all'utente.
- **OCR delle annotazioni rimandato:** le annotazioni convertite in tracciati (es. "Ast. 75x25x105" nel test 1) non vengono lette.
- I PDF di prova sono vettoriali: non abbiamo ancora campioni di PDF raster su cui testare la separazione dei colori, che in quel caso dipende dalla risoluzione.
- Vanno definite le soglie di plausibilità per tipologia.
- Da verificare: se il codice a barre è sempre presente sulle confezioni del settore o solo su alcune (ora conta solo per il controllo incrociato).
- Da confermare la misura del test 2 (33,5 × 33,5 × 126,5 mm) con una fonte indipendente.

## Convenzioni di lavoro

- Ogni modifica al parser o alle regole geometriche va testata sui casi della tabella.
- Il file `PROJECT.md` va aggiornato a ogni decisione di design.
- Le misure ricavate da raster sono sempre stime: niente testi che le presentano come dati precisi.
- **`samples/` contiene file di clienti reali e non va nel repo pubblico.** È esclusa tramite `.gitignore`, come `NOTES-PRIVATE.md` (corrispondenza tra Prodotto A/B e i file reali). In questo documento i casi di test sono anonimi. I test locali possono usarla; per i test online e le demo si usano campioni anonimi o inventati (da creare, es. in una cartella `fixtures/`).

## Stato

- [x] Definizione obiettivo e input
- [x] Ordine di ricerca delle misure (rivisto: testo → PDF vettoriale 1:1 → utente; codice a barre solo controllo)
- [x] Casi di test scelti
- [x] Misura in pixel del codice a barre (test 2: 817 px a 1200 dpi = 17,29 mm, ≈ 55%)
- [x] Verifica test 1 sui vettori (75 × 25 × 105)
- [ ] Conferma misura test 2 (stima 33,5 × 33,5 × 126,5 mm)
- [ ] Scheletro HTML + Three.js
- [ ] Parser fustella (estrazione vettori, taglio / piega per topologia)
- [ ] Ricostruzione geometrica tuck-end
- [ ] Mappatura artwork
- [ ] Interfaccia di conferma misure
- [ ] OCR annotazioni in tracciati (rimandato)
- [ ] Pubblicazione online
