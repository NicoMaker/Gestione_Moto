let prodotti = [];
let dati = [];
let riepilogo = [];
let utenti = [];
let storicoGiacenza = []; 
let storicoMovimenti = []; 
let storicoDataSelezionata = null; 

let prodottoInModifica = null;
let utenteInModifica = null;
let prodottoDettaglioLotti = null; 

// =========================================================================
// ⭐ FUNZIONI DI SICUREZZA, FORMATTAZIONE E UTILITY ⭐
// =========================================================================

function containsForbiddenChars(input) {
  if (typeof input !== "string") return false;
  const forbiddenRegex = /['";<>\\-]/; 
  return forbiddenRegex.test(input);
}

function sanitizeInputText(input) {
  if (typeof input !== "string") return "";
  return input.replace(/[^a-zA-Z0-9\s\-\\_.,]+/g, "").trim();
}

function formatNumber(value) {
  if (value === null || typeof value === "undefined" || isNaN(value)) {
    return "0,00";
  }
  return value.toLocaleString("it-IT", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function formatCurrency(value) {
    return `€ ${formatNumber(value)}`;
}

function formatDate(dateString) {
  if (!dateString) return "";
  const date = new Date(dateString);
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
}

function mostraAlert(type, message, section) {
  const container = document.getElementById(`${section}-alert`);
  let icon;
  let cssClass;

  switch (type) {
    case "success":
      icon = "✅";
      cssClass = "alert-success";
      break;
    case "error":
      icon = "❌";
      cssClass = "alert-error";
      break;
    case "warning":
      icon = "⚠️";
      cssClass = "alert-warning";
      break;
    default:
      icon = "ℹ️";
      cssClass = "alert-info";
      break;
  }

  container.innerHTML = `<div class="alert ${cssClass}">${icon} ${message}</div>`;
  setTimeout(() => {
    container.innerHTML = "";
  }, 5000);
}

function setInitialDate() {
  const today = new Date().toISOString().split("T")[0];
  const dateInput = document.getElementById("dato-data");
  if (dateInput) {
    dateInput.value = today;
  }
}

function setInitialStoricoDate() {
    const today = new Date().toISOString().split("T")[0];
    const dateInput = document.getElementById("storico-data");
    
    if (dateInput) {
        dateInput.value = today;
    }
    
    if (document.getElementById("storico-giacenza-body").innerHTML === "") {
        caricaDatiStorici(today);
    }
}


// =========================================================================
// 🔄 GESTIONE INTERFACCIA E REFRESH DATI 
// =========================================================================

function switchTab(tabId) {
  document.querySelectorAll(".section").forEach((section) => {
    section.classList.remove("active");
  });
  document.querySelectorAll(".tabs button").forEach((tab) => {
    tab.classList.remove("active");
  });

  document.getElementById(`${tabId}-section`).classList.add("active");
  document
    .querySelector(`.tabs button[onclick="switchTab('${tabId}')"]`)
    .classList.add("active");

  if (tabId === "prodotti") caricaProdotti();
  if (tabId === "dati") caricaDati();
  if (tabId === "riepilogo") caricaRiepilogo(true); 
  if (tabId === "storico") setInitialStoricoDate(); 
  if (tabId === "utenti") caricaUtenti();
}

async function refreshAllData() {
  await caricaProdotti(true); 
  caricaSelectProdotti(); 
  await caricaDati(); 
  await caricaRiepilogo(true); 
  // Non forzo l'aggiornamento dello storico, l'utente deve cliccare 'Visualizza Storico'
}


// =========================================================================
// 🏍️ GESTIONE PRODOTTI
// =========================================================================

async function caricaProdotti(drawTable = true) {
  try {
    const res = await fetch("/api/prodotti");
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Errore nel caricamento prodotti");
    prodotti = data;
    if (drawTable) disegnaTabellaProdotti();
    caricaSelectProdotti(); 
  } catch (err) {
    console.error(err);
    mostraAlert("error", "Errore nel caricamento prodotti: " + err.message, "prodotti");
  }
}

function disegnaTabellaProdotti() {
  const tbody = document.getElementById("prodotti-body");
  tbody.innerHTML = prodotti
    .map(
      (p) => `
      <tr>
        <td>${p.nome}</td>
        <td style="text-align:right">${p.giacenza}</td>
        <td class="actions">
          <button class="btn btn-secondary btn-sm" onclick="apriModalModificaProdotto(${p.id}, '${p.nome}')">Modifica</button>
          <button class="btn btn-danger btn-sm" onclick="eliminaProdotto(${p.id}, '${p.nome}', ${p.giacenza})">Elimina</button>
        </td>
      </tr>
    `
    )
    .join("");
}

async function aggiungiProdotto() {
  const nome = document.getElementById("prodotto-nome").value;
  const sanitizedNome = sanitizeInputText(nome);

  if (!sanitizedNome) {
    mostraAlert("error", "Il nome del prodotto è obbligatorio.", "prodotti");
    return;
  }
  if (containsForbiddenChars(nome)) {
    mostraAlert("error", "Caratteri non validi nel nome del prodotto.", "prodotti");
    return;
  }

  try {
    const res = await fetch("/api/prodotti", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nome: sanitizedNome }),
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Errore nell'aggiunta del prodotto");

    document.getElementById("prodotto-nome").value = "";
    mostraAlert("success", `Prodotto "${sanitizedNome}" aggiunto con successo.`, "prodotti");
    await refreshAllData(); 
  } catch (err) {
    console.error(err);
    mostraAlert("error", "Errore di rete o prodotto già esistente: " + err.message, "prodotti");
  }
}

async function eliminaProdotto(id, nome, giacenza) {
  if (giacenza > 0) {
    mostraAlert("error", `Impossibile eliminare "${nome}": la giacenza è ${giacenza}. Annulla prima tutti i carichi/scarichi.`, "prodotti");
    return;
  }
  if (!confirm(`Sei sicuro di voler eliminare il prodotto "${nome}"? Saranno eliminati anche tutti i movimenti (dati) e lotti associati.`)) {
    return;
  }
  try {
    const res = await fetch(`/api/prodotti/${id}`, { method: "DELETE" });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Errore nell'eliminazione del prodotto");

    mostraAlert("success", `Prodotto "${nome}" eliminato con successo.`, "prodotti");
    await refreshAllData();
  } catch (err) {
    console.error(err);
    mostraAlert("error", "Errore di rete durante l'eliminazione: " + err.message, "prodotti");
  }
}

// MODAL PRODOTTO (Modifica)
function apriModalModificaProdotto(id, nome) {
  prodottoInModifica = id;
  document.getElementById("modifica-prodotto-id").textContent = id;
  document.getElementById("modifica-prodotto-nome").value = nome;
  document.getElementById("modal-modifica-prodotto").style.display = "flex";
}

function chiudiModalProdotto() {
  document.getElementById("modal-modifica-prodotto").style.display = "none";
  prodottoInModifica = null;
}

async function salvaModificaProdotto() {
  const id = prodottoInModifica;
  const nuovoNome = document.getElementById("modifica-prodotto-nome").value;
  const sanitizedNome = sanitizeInputText(nuovoNome);

  if (!sanitizedNome) {
    mostraAlert("error", "Il nome del prodotto è obbligatorio.", "prodotti");
    return;
  }

  try {
    const res = await fetch(`/api/prodotti/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nome: sanitizedNome }),
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Errore nella modifica del prodotto");

    mostraAlert("success", `Prodotto ID ${id} modificato in "${sanitizedNome}".`, "prodotti");
    chiudiModalProdotto();
    await refreshAllData();
  } catch (err) {
    console.error(err);
    mostraAlert("error", "Errore di rete o nome già esistente: " + err.message, "prodotti");
  }
}


// =========================================================================
// 📥 GESTIONE MOVIMENTI (DATI)
// =========================================================================

function caricaSelectProdotti() {
  const select = document.getElementById("dato-prodotto");
  select.innerHTML = '<option value="">Seleziona prodotto...</option>';
  prodotti.forEach((p) => {
    const option = document.createElement("option");
    option.value = p.id;
    option.textContent = p.nome;
    select.appendChild(option);
  });
}

function toggleCaricoFields() {
  const tipo = document.getElementById("dato-tipo").value;
  const prezzoGroup = document.getElementById("prezzo-group");
  const fatturaGroup = document.getElementById("fattura-group");
  const fornitoreGroup = document.getElementById("fornitore-group");

  if (tipo === "carico") {
    prezzoGroup.classList.remove("hidden");
    fatturaGroup.classList.remove("hidden");
    fornitoreGroup.classList.remove("hidden");
    document.getElementById("dato-prezzo").required = true;
    document.getElementById("dato-fattura").required = true;
    document.getElementById("dato-fornitore").required = true;
  } else {
    prezzoGroup.classList.add("hidden");
    fatturaGroup.classList.add("hidden");
    fornitoreGroup.classList.add("hidden");
    document.getElementById("dato-prezzo").required = false;
    document.getElementById("dato-fattura").required = false;
    document.getElementById("dato-fornitore").required = false;
  }
}

async function caricaDati() {
  try {
    const res = await fetch("/api/dati");
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Errore nel caricamento movimenti");
    dati = data;
    disegnaTabellaDati();
  } catch (err) {
    console.error(err);
    mostraAlert("error", "Errore nel caricamento movimenti: " + err.message, "dati");
  }
}

function disegnaTabellaDati() {
  const tbody = document.getElementById("dati-body");
  tbody.innerHTML = dati
    .map((d) => {
      const tipoClass = d.tipo === "carico" ? "text-success" : "text-danger";
      // Se è uno scarico, mostra il prezzo medio FIFO calcolato
      const prezzoUnitario = d.tipo === "scarico" && d.prezzo_unitario_scarico !== null
        ? formatCurrency(d.prezzo_unitario_scarico) // Prezzo FIFO calcolato
        : d.tipo === "carico" && d.prezzo !== null
        ? formatCurrency(d.prezzo) // Prezzo di carico inserito
        : "—";

      // Se è uno scarico, mostra il costo totale FIFO calcolato
      const costoTotale = d.tipo === "scarico" && d.prezzo_totale !== null
        ? formatCurrency(d.prezzo_totale)
        : d.tipo === "carico" && d.prezzo_totale !== null
        ? formatCurrency(d.quantita * d.prezzo) // Calcola il costo totale da mostrare
        : "—";

      return `
        <tr>
          <td>${formatDate(d.data_movimento)}</td>
          <td>${d.prodotto_nome}</td>
          <td class="${tipoClass}">${d.tipo.toUpperCase()}</td>
          <td style="text-align:right">${d.quantita}</td>
          <td style="text-align:right">${prezzoUnitario}</td>
          <td style="text-align:right">${costoTotale}</td>
          <td>${d.fattura_doc || "—"}</td>
          <td>${d.fornitore_cliente_id || "—"}</td>
          <td class="actions">
            <button class="btn btn-danger btn-sm" onclick="eliminaDato(${d.id}, '${d.tipo}', '${d.prodotto_nome}', ${d.quantita})">Annulla</button>
          </td>
        </tr>
      `;
    })
    .join("");
}

async function aggiungiDato() {
  const prodotto_id = document.getElementById("dato-prodotto").value;
  const tipo = document.getElementById("dato-tipo").value;
  const data_movimento = document.getElementById("dato-data").value;
  const quantita = parseInt(document.getElementById("dato-quantita").value);
  const prezzoInput = document.getElementById("dato-prezzo").value.replace(",", "."); // Sostituisci virgola con punto
  const prezzo = tipo === "carico" ? parseFloat(prezzoInput) : null;
  const fattura_doc = tipo === "carico" ? sanitizeInputText(document.getElementById("dato-fattura").value) : null;
  const fornitore_cliente_id = tipo === "carico" ? sanitizeInputText(document.getElementById("dato-fornitore").value) : null;

  if (!prodotto_id || !tipo || !data_movimento || isNaN(quantita) || quantita <= 0) {
    mostraAlert("error", "Compila tutti i campi obbligatori (Prodotto, Tipo, Data, Quantità).", "dati");
    return;
  }

  if (tipo === "carico" && (isNaN(prezzo) || prezzo < 0)) {
    mostraAlert("error", "Il prezzo unitario di carico non è valido.", "dati");
    return;
  }

  if (tipo === "carico" && (!fattura_doc || !fornitore_cliente_id)) {
     mostraAlert("error", "Per un CARICO, Fattura/Documento e Fornitore sono obbligatori.", "dati");
     return;
  }


  try {
    const res = await fetch("/api/dati", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        prodotto_id: parseInt(prodotto_id),
        tipo,
        quantita,
        prezzo, 
        data_movimento,
        fattura_doc,
        fornitore_cliente_id
      }),
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Errore durante l'aggiunta del movimento");

    // Reset campi
    document.getElementById("dato-quantita").value = "";
    document.getElementById("dato-prezzo").value = "";
    document.getElementById("dato-fattura").value = "";
    document.getElementById("dato-fornitore").value = "";
    // Lascia Data e Prodotto selezionati per comodità
    
    mostraAlert("success", `Movimento di ${tipo.toUpperCase()} registrato con successo`, "dati");
    await refreshAllData(); 
  } catch (err) {
    console.error("Errore durante l'aggiunta", err);
    mostraAlert("error", "Errore: " + err.message, "dati");
  }
}

async function eliminaDato(id, tipo, nomeProdotto, quantita) {
    const azione = tipo === 'carico' ? 'annullare il carico' : 'annullare lo scarico';
    if (!confirm(`Sei sicuro di voler ${azione} di ${quantita} unità per il prodotto "${nomeProdotto}"? Questa operazione potrebbe alterare i costi FIFO successivi.`)) {
        return;
    }

    try {
        const res = await fetch(`/api/dati/${id}`, { method: 'DELETE' });
        const data = await res.json();

        if (!res.ok) {
            // Se lo scarico fallisce per giacenza insufficiente (post-movimenti annullati)
            if (res.status === 400 && data.error.includes("giacenza insufficiente")) {
                 throw new Error(data.error);
            }
            throw new Error(data.error || 'Errore nell\'annullamento del movimento');
        }

        mostraAlert('success', `Movimento ID ${id} annullato con successo.`, 'dati');
        await refreshAllData();
    } catch (err) {
        console.error(err);
        mostraAlert('error', "Errore: " + err.message, 'dati');
    }
}

// =========================================================================
// 📊 GESTIONE RIEPILOGO
// =========================================================================

async function caricaRiepilogo(drawTable = false) {
  try {
    const res = await fetch("/api/riepilogo");
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Errore nel caricamento riepilogo");
    riepilogo = data;
    if (document.getElementById("riepilogo-section").classList.contains("active") || drawTable) {
      disegnaTabellaRiepilogo();
    }
    await caricaValoreMagazzino();
  } catch (err) {
    console.error(err);
    mostraAlert("error", "Errore nel caricamento riepilogo: " + err.message, "riepilogo");
  }
}

async function caricaValoreMagazzino() {
    try {
        const res = await fetch("/api/valore-magazzino");
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Errore nel calcolo valore");
        
        document.getElementById("valore-magazzino").textContent = formatCurrency(data.valore_totale);
    } catch (err) {
        document.getElementById("valore-magazzino").textContent = "Errore";
    }
}


function disegnaTabellaRiepilogo() {
  const tbody = document.getElementById("riepilogo-body");
  tbody.innerHTML = riepilogo
    .map(
      (r) => `
      <tr>
        <td>${r.nome}</td>
        <td style="text-align:right">${r.giacenza}</td>
        <td style="text-align:right" class="text-success">${formatCurrency(r.valore_totale)}</td>
        <td class="actions">
          ${r.giacenza > 0 ? `<button class="btn btn-secondary btn-sm" onclick="apriModalDettaglioLotti(${r.id}, '${r.nome}')">Dettaglio Lotti</button>` : "—"}
        </td>
      </tr>
    `
    )
    .join("");
}

// MODAL DETTAGLIO LOTTI (Corrente)
function apriModalDettaglioLotti(prodottoId, nomeProdotto) {
    document.getElementById("dettaglio-prodotto-nome").textContent = `Dettaglio Lotti: ${nomeProdotto}`;
    caricaDettaglioLotti(prodottoId);
    document.getElementById("modal-dettaglio-lotti").style.display = "flex";
}

function chiudiModalDettaglioLotti() {
    document.getElementById("modal-dettaglio-lotti").style.display = "none";
    document.getElementById("lotti-body").innerHTML = ""; 
}

async function caricaDettaglioLotti(prodottoId) {
    const tbody = document.getElementById("lotti-body");
    tbody.innerHTML = '<tr><td colspan="4" style="text-align:center">Caricamento lotti...</td></tr>';
    
    try {
        const res = await fetch(`/api/riepilogo/lotti/${prodottoId}`);
        const lotti = await res.json();
        
        if (!res.ok) throw new Error(lotti.error || "Errore nel caricamento dei lotti");

        if (lotti.length === 0) {
            tbody.innerHTML = '<tr><td colspan="4" style="text-align:center">Nessun lotto attivo (Giacenza zero).</td></tr>';
            return;
        }

        tbody.innerHTML = lotti
            .map(l => `
                <tr>
                    <td>${l.id}</td>
                    <td>${formatDate(l.data_registrazione)}</td>
                    <td style="text-align:right">${l.quantita_rimanente}</td>
                    <td style="text-align:right">${formatCurrency(l.prezzo)}</td>
                </tr>
            `)
            .join('');

    } catch (err) {
        console.error(err);
        tbody.innerHTML = `<tr><td colspan="4" style="text-align:center" class="text-danger">Errore: ${err.message}</td></tr>`;
    }
}


// =========================================================================
// 🏛️ GESTIONE STORICO (AGGIORNATO: Valore Totale e Dettaglio Lotti)
// =========================================================================

async function caricaDatiStorici(initialDate = null) {
  const dataInput = document.getElementById("storico-data");
  const dataSelezionata = initialDate || dataInput.value;
  storicoDataSelezionata = dataSelezionata; // Memorizza la data per il dettaglio lotti

  if (!dataSelezionata) {
    mostraAlert("error", "Seleziona una data per visualizzare lo storico.", "storico");
    return;
  }
  
  const dataFormatted = formatDate(dataSelezionata) || "N/D";
  document.getElementById("storico-display-data").textContent = dataFormatted;
  document.getElementById("storico-movimenti-data").textContent = dataFormatted;
  document.getElementById("valore-magazzino-storico").textContent = "Calcolo...";

  document.getElementById("storico-giacenza-body").innerHTML = '<tr><td colspan="4" style="text-align:center">Caricamento Giacenza...</td></tr>';
  document.getElementById("storico-dati-body").innerHTML = '<tr><td colspan="8" style="text-align:center">Caricamento Movimenti...</td></tr>';


  try {
    // 1. Carica Giacenza Netta e Valore Storico (API /api/storico/giacenza)
    const resGiacenza = await fetch(`/api/storico/giacenza?data=${dataSelezionata}`);
    const dataGiacenza = await resGiacenza.json();
    if (!resGiacenza.ok) throw new Error(dataGiacenza.error || "Errore caricamento giacenza storica");
    storicoGiacenza = dataGiacenza;
    disegnaTabellaStoricoGiacenza();

    // Aggiorna il Valore Totale Storico (somma dei valori per prodotto)
    const totaleValoreStorico = storicoGiacenza.reduce((sum, p) => sum + p.valore_totale_storico, 0);
    document.getElementById("valore-magazzino-storico").textContent = formatCurrency(totaleValoreStorico);


    // 2. Carica Movimenti Storici (API /api/dati/storico)
    const resMovimenti = await fetch(`/api/dati/storico?data=${dataSelezionata}`);
    const dataMovimenti = await resMovimenti.json();
    if (!resMovimenti.ok) throw new Error(dataMovimenti.error || "Errore caricamento movimenti storici");
    storicoMovimenti = dataMovimenti;
    disegnaTabellaStoricoMovimenti(); 

    mostraAlert("success", `Dati storici aggiornati al ${dataFormatted}`, "storico");

  } catch (err) {
    console.error(err);
    mostraAlert("error", "Errore nel caricamento dati storici: " + err.message, "storico");
    document.getElementById("storico-giacenza-body").innerHTML = '<tr><td colspan="4" style="text-align:center">Errore nel caricamento dei dati.</td></tr>';
    document.getElementById("storico-dati-body").innerHTML = '<tr><td colspan="8" style="text-align:center">Errore nel caricamento dei dati.</td></tr>';
    document.getElementById("valore-magazzino-storico").textContent = formatCurrency(0);
  }
}

// NUOVA: Disegna Tabella Giacenza Storica (AGGIORNATA con Valore Totale e Azioni)
function disegnaTabellaStoricoGiacenza() {
  const tbody = document.getElementById("storico-giacenza-body");
  if (storicoGiacenza.length === 0) {
    tbody.innerHTML = '<tr><td colspan="4" style="text-align:center">Nessuna giacenza netta trovata alla data.</td></tr>';
    return;
  }
  
  tbody.innerHTML = storicoGiacenza
    .filter(p => p.giacenza_netta > 0) // Mostra solo prodotti con giacenza > 0
    .map(
      (p) => `
      <tr>
        <td>${p.nome}</td>
        <td style="text-align:right">${p.giacenza_netta}</td>
        <td style="text-align:right" class="text-success">${formatCurrency(p.valore_totale_storico)}</td>
        <td class="actions">
          <button class="btn btn-secondary btn-sm" onclick="apriModalDettaglioLottiStorico(${p.id}, '${p.nome}')">Dettaglio Lotti</button>
        </td>
      </tr>
    `
    )
    .join("");
}

// NUOVA: Disegna Tabella Movimenti Storici
function disegnaTabellaStoricoMovimenti() {
  const tbody = document.getElementById("storico-dati-body");
  tbody.innerHTML = storicoMovimenti
    .map((d) => {
      const tipoClass = d.tipo === "carico" ? "text-success" : "text-danger";
      // Se è uno scarico, mostra il prezzo medio FIFO calcolato
      const prezzoUnitario = d.tipo === "scarico" && d.prezzo_unitario_scarico !== null
        ? formatCurrency(d.prezzo_unitario_scarico) // Prezzo FIFO calcolato
        : d.tipo === "carico" && d.prezzo !== null
        ? formatCurrency(d.prezzo) // Prezzo di carico inserito
        : "—";

      // Se è uno scarico, mostra il costo totale FIFO calcolato
      const costoTotale = d.tipo === "scarico" && d.prezzo_totale !== null
        ? formatCurrency(d.prezzo_totale)
        : d.tipo === "carico" && d.prezzo_totale !== null
        ? formatCurrency(d.quantita * d.prezzo) // Calcola il costo totale da mostrare
        : "—";

      return `
        <tr>
          <td>${formatDate(d.data_movimento)}</td>
          <td>${d.prodotto_nome}</td>
          <td class="${tipoClass}">${d.tipo.toUpperCase()}</td>
          <td style="text-align:right">${d.quantita}</td>
          <td style="text-align:right">${prezzoUnitario}</td>
          <td style="text-align:right">${costoTotale}</td>
          <td>${d.fattura_doc || "—"}</td>
          <td>${d.fornitore_cliente_id || "—"}</td>
        </tr>
      `;
    })
    .join("");
}


// NUOVO: Gestione Dettaglio Lotti Storico
function apriModalDettaglioLottiStorico(prodottoId, nomeProdotto) {
    if (!storicoDataSelezionata) {
        mostraAlert('error', 'Seleziona prima una data nello storico.', 'storico');
        return;
    }
    document.getElementById("dettaglio-prodotto-nome-storico").textContent = `Dettaglio Lotti: ${nomeProdotto}`;
    document.getElementById("storico-lotti-data-display").textContent = formatDate(storicoDataSelezionata);
    caricaDettaglioLottiStorico(prodottoId, storicoDataSelezionata);
    document.getElementById("modal-dettaglio-lotti-storico").style.display = "flex";
}

function chiudiModalDettaglioLottiStorico() {
    document.getElementById("modal-dettaglio-lotti-storico").style.display = "none";
    document.getElementById("lotti-storico-body").innerHTML = ""; 
}

async function caricaDettaglioLottiStorico(prodottoId, dataStorico) {
    const tbody = document.getElementById("lotti-storico-body");
    tbody.innerHTML = '<tr><td colspan="7" style="text-align:center">Caricamento lotti storici...</td></tr>';
    
    try {
        const res = await fetch(`/api/storico/lotti/${prodottoId}?data=${dataStorico}`);
        const lotti = await res.json();
        
        if (!res.ok) throw new Error(lotti.error || "Errore nel caricamento dei lotti storici");

        if (lotti.length === 0) {
            tbody.innerHTML = '<tr><td colspan="7" style="text-align:center">Nessun lotto attivo o consumato alla data.</td></tr>';
            return;
        }

        tbody.innerHTML = lotti
            .map(l => {
                const valoreRimanente = l.quantita_rimanente * l.prezzo;
                return `
                    <tr>
                        <td>${l.id}</td>
                        <td>${formatDate(l.data_carico)}</td>
                        <td style="text-align:right">${l.quantita_iniziale}</td>
                        <td style="text-align:right" class="text-danger">${l.quantita_venduta}</td>
                        <td style="text-align:right" class="text-success">${l.quantita_rimanente}</td>
                        <td style="text-align:right">${formatCurrency(l.prezzo)}</td>
                        <td style="text-align:right">${formatCurrency(valoreRimanente)}</td>
                    </tr>
                `;
            })
            .join('');

    } catch (err) {
        console.error(err);
        tbody.innerHTML = `<tr><td colspan="7" style="text-align:center" class="text-danger">Errore: ${err.message}</td></tr>`;
    }
}


// =========================================================================
// 👤 GESTIONE UTENTI
// =========================================================================

async function caricaUtenti() {
    try {
        const res = await fetch("/api/utenti");
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Errore nel caricamento utenti");
        utenti = data;
        disegnaTabellaUtenti();
    } catch (err) {
        console.error(err);
        mostraAlert("error", "Errore nel caricamento utenti: " + err.message, "utenti");
    }
}

function disegnaTabellaUtenti() {
    const tbody = document.getElementById("utenti-body");
    tbody.innerHTML = utenti
        .map(
            (u) => `
            <tr>
              <td>${u.username}</td>
              <td class="actions">
                <button class="btn btn-secondary btn-sm" onclick="apriModalModificaUtente(${u.id}, '${u.username}')">Modifica</button>
                <button class="btn btn-danger btn-sm" onclick="eliminaUtente(${u.id}, '${u.username}')">Elimina</button>
              </td>
            </tr>
          `
        )
        .join("");
}

async function aggiungiUtente() {
    const username = document.getElementById("nuovo-username").value;
    const password = document.getElementById("nuova-password").value;
    const sanitizedUsername = sanitizeInputText(username);

    if (!sanitizedUsername || !password) {
        mostraAlert("error", "Username e Password sono obbligatori.", "utenti");
        return;
    }
    if (containsForbiddenChars(username)) {
        mostraAlert("error", "Caratteri non validi nell'Username.", "utenti");
        return;
    }
    if (password.length < 8) {
        mostraAlert("error", "La password deve contenere almeno 8 caratteri.", "utenti");
        return;
    }

    try {
        const res = await fetch("/api/utenti", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ username: sanitizedUsername, password }),
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Errore nell'aggiunta dell'utente");

        document.getElementById("nuovo-username").value = "";
        document.getElementById("nuova-password").value = "";
        mostraAlert("success", `Utente "${sanitizedUsername}" creato con successo.`, "utenti");
        caricaUtenti();
    } catch (err) {
        console.error(err);
        mostraAlert("error", "Errore di rete o utente già esistente: " + err.message, "utenti");
    }
}

async function eliminaUtente(id, username) {
    if (!confirm(`Sei sicuro di voler eliminare l'utente "${username}"?`)) {
        return;
    }

    try {
        const res = await fetch(`/api/utenti/${id}`, { method: "DELETE" });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Errore nell'eliminazione dell'utente");

        mostraAlert("success", `Utente "${username}" eliminato con successo.`, "utenti");
        caricaUtenti();
    } catch (err) {
        console.error(err);
        mostraAlert("error", "Errore: " + err.message, "utenti");
    }
}

// MODAL UTENTE (Modifica)
function apriModalModificaUtente(id, username) {
  utenteInModifica = id;
  document.getElementById("modifica-utente-id").textContent = id;
  document.getElementById("modifica-username").value = username;
  document.getElementById("modifica-password").value = "";
  document.getElementById("modal-modifica-utente").style.display = "flex";
}

function chiudiModalUtente() {
  document.getElementById("modal-modifica-utente").style.display = "none";
  utenteInModifica = null;
}

async function salvaModificaUtente() {
  const id = utenteInModifica;
  const nuovoUsername = document.getElementById("modifica-username").value;
  const nuovaPassword = document.getElementById("modifica-password").value;
  const sanitizedUsername = sanitizeInputText(nuovoUsername);

  if (!sanitizedUsername) {
    mostraAlert("error", "L'Username è obbligatorio.", "utenti");
    return;
  }
  if (nuovaPassword && nuovaPassword.length < 8) {
    mostraAlert("error", "La nuova password, se specificata, deve contenere almeno 8 caratteri.", "utenti");
    return;
  }

  try {
    const res = await fetch(`/api/utenti/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: sanitizedUsername, password: nuovaPassword || null }),
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Errore nella modifica dell'utente");

    mostraAlert("success", `Utente ID ${id} modificato in "${sanitizedUsername}".`, "utenti");
    chiudiModalUtente();
    caricaUtenti();
    
    // Aggiorna display utente se si modifica l'utente corrente
    const loggedInUsername = localStorage.getItem("username");
    if (loggedInUsername === utenti.find(u => u.id === id)?.username) {
        localStorage.setItem("username", sanitizedUsername);
        document.getElementById("user-display").textContent = `Utente: ${sanitizedUsername}`;
    }

  } catch (err) {
    console.error(err);
    mostraAlert("error", "Errore di rete o username già esistente: " + err.message, "utenti");
  }
}


// =========================================================================
// 🚀 INIZIALIZZAZIONE E LOGOUT
// =========================================================================

function logout() {
    localStorage.removeItem("isLoggedIn"); 
    localStorage.removeItem("username"); 
    window.location.href = "/index.html";
}

document.addEventListener("DOMContentLoaded", () => {
    if (localStorage.getItem("isLoggedIn") !== "true") {
         window.location.href = "/index.html";
         return;
    }
    
    const loggedInUsername = localStorage.getItem("username");
    if(loggedInUsername) {
        document.getElementById("user-display").textContent = `Utente: ${loggedInUsername}`;
    }

    setInitialDate();
    document.getElementById("dato-tipo").value = "scarico";
    toggleCaricoFields();
    
    // Inizializzazione dati
    refreshAllData(); 
});

