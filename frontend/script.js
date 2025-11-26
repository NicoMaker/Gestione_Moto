let prodotti = [];
let dati = [];
let prodottoInModifica = null;
let prodottoDettaglio = null;

let utenti = [];
let utenteInModifica = null;

// ⭐ FUNZIONE DI RILEVAMENTO CARATTERI PROIBITI (SQL/XSS) ⭐
function containsForbiddenChars(input) {
  if (typeof input !== "string") return false;
  const forbiddenRegex = /['";\-<>]/;
  return forbiddenRegex.test(input);
}

// FUNZIONE DI SANIFICAZIONE MASSIMA
function sanitizeInputText(input) {
  if (typeof input !== "string") return "";
  return input.replace(/[^a-zA-Z0-9\s\-\_.,]+/g, "").trim();
}

// Helper numeri
function formatNumber(value) {
  if (value === null || typeof value === "undefined" || isNaN(value)) {
    return "0,00";
  }
  return value.toLocaleString("it-IT", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

// Data gg/mm/aaaa
function formatDate(dateString) {
  const date = new Date(dateString);
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
}

// Data odierna
function setInitialDate() {
  const today = new Date().toISOString().split("T")[0];
  const el = document.getElementById("dato-data");
  if (el) el.value = today;
}

// Logout
function logout() {
  if (confirm("Sei sicuro di voler uscire?")) {
    localStorage.removeItem("isLoggedIn");
    localStorage.removeItem("username");
    window.location.href = "/index.html";
  }
}

// Refresh di tutte le sezioni
async function refreshAllData() {
  console.log("Aggiornamento automatico di tutte le sezioni...");
  await caricaProdotti();
  caricaDati();
  caricaRiepilogo();
  caricaValoreMagazzino();
  caricaSelectProdotti();
  caricaUtenti();
}

// Cambio tab
function forceSwitchTab(tab) {
  document.querySelectorAll(".tab").forEach((t) => t.classList.remove("active"));
  document
    .querySelectorAll(".section")
    .forEach((s) => s.classList.remove("active"));

  const tabButton = document.querySelector(
    `.tab[onclick="switchTab('${tab}')"]`
  );
  if (tabButton) tabButton.classList.add("active");

  const section = document.getElementById(`${tab}-section`);
  if (section) section.classList.add("active");

  if (["prodotti", "dati", "riepilogo", "utenti"].includes(tab)) {
    refreshAllData();
  }
}

function checkUrlHashAndSwitch() {
  const hash = window.location.hash.substring(1);
  const validTabs = ["prodotti", "dati", "riepilogo", "utenti"];
  let targetTab = "prodotti";
  if (hash && validTabs.includes(hash)) targetTab = hash;
  forceSwitchTab(targetTab);
}

// Init
document.addEventListener("DOMContentLoaded", () => {
  setInitialDate();
  toggleCaricoFields();
  checkUrlHashAndSwitch();

  const username = localStorage.getItem("username");
  if (username) {
    const userInfo = document.createElement("div");
    userInfo.className = "user-info";
    userInfo.innerHTML = `👤 ${username} <button class="btn-logout" onclick="logout()">Esci</button>`;
    document.querySelector("header").appendChild(userInfo);
  }
});

function switchTab(tab) {
  if (window.location.hash !== `#${tab}`) {
    history.replaceState(null, null, `#${tab}`);
  }
  forceSwitchTab(tab);
}

// Toggle campi carico
function toggleCaricoFields() {
  const tipo = document.getElementById("dato-tipo").value;
  const prezzoGroup = document.getElementById("prezzo-group");
  const prezzoInput = document.getElementById("dato-prezzo");
  const fatturaGroup = document.getElementById("fattura-group");
  const fatturaInput = document.getElementById("dato-fattura");
  const fornitoreGroup = document.getElementById("fornitore-group");
  const fornitoreInput = document.getElementById("dato-fornitore");

  if (tipo === "scarico") {
    prezzoGroup.classList.add("hidden");
    prezzoInput.value = "";
    prezzoInput.removeAttribute("required");

    fatturaGroup.classList.add("hidden");
    fatturaInput.value = "";
    fatturaInput.removeAttribute("required");

    fornitoreGroup.classList.add("hidden");
    fornitoreInput.value = "";
    fornitoreInput.removeAttribute("required");
  } else if (tipo === "carico") {
    prezzoGroup.classList.remove("hidden");
    prezzoInput.setAttribute("required", "required");

    fatturaGroup.classList.remove("hidden");
    fatturaInput.setAttribute("required", "required");

    fornitoreGroup.classList.remove("hidden");
    fornitoreInput.setAttribute("required", "required");
  } else {
    prezzoGroup.classList.add("hidden");
    prezzoInput.value = "";
    prezzoInput.removeAttribute("required");

    fatturaGroup.classList.add("hidden");
    fatturaInput.value = "";
    fatturaInput.removeAttribute("required");

    fornitoreGroup.classList.add("hidden");
    fornitoreInput.value = "";
    fornitoreInput.removeAttribute("required");
  }
}

// Alert
function mostraAlert(tipo, messaggio, sezione) {
  const alertDiv = document.getElementById(`${sezione}-alert`);
  if (!alertDiv) return;
  alertDiv.innerHTML = `<div class="alert alert-${tipo}">${messaggio}</div>`;
  setTimeout(() => {
    alertDiv.innerHTML = "";
  }, 4000);
}

/* ===================== PRODOTTI ===================== */

async function caricaProdotti() {
  try {
    const res = await fetch("/api/prodotti");
    prodotti = await res.json();

    prodotti.sort((a, b) => a.nome.localeCompare(b.nome));

    const tbody = document.getElementById("prodotti-body");
    if (!prodotti.length) {
      tbody.innerHTML =
        '<tr><td colspan="3" class="empty-state">Nessun prodotto presente</td></tr>';
    } else {
      tbody.innerHTML = prodotti
        .map(
          (p) => `
        <tr>
          <td><strong>${p.nome}</strong></td>
          <td style="text-align:center">
            <span class="giacenza ${p.giacenza > 0 ? "positiva" : "zero"}">
              ${p.giacenza}
            </span>
          </td>
          <td style="text-align:center">
            <div class="actions">
              <button class="btn btn-warning btn-small" onclick="apriModificaProdotto(${p.id}, '${p.nome.replace(
                /'/g,
                "\\'"
              )}')">Modifica</button>
              <button class="btn btn-danger btn-small" onclick="eliminaProdotto(${p.id})">Elimina</button>
            </div>
          </td>
        </tr>`
        )
        .join("");
    }

    document.getElementById("totale-prodotti").textContent = prodotti.length;
    const giacenzaTotale = prodotti.reduce((sum, p) => sum + p.giacenza, 0);
    document.getElementById("giacenza-totale-magazzino").textContent =
      giacenzaTotale;
  } catch (err) {
    console.error("Errore caricamento prodotti", err);
    mostraAlert("error", "Errore nel caricamento prodotti", "prodotti");
  }
}

async function aggiungiProdotto() {
  const input = document.getElementById("nuovo-prodotto");
  const nomeRaw = input.value;

  if (containsForbiddenChars(nomeRaw)) {
    mostraAlert(
      "error",
      "Caratteri non validi rilevati. Rimuovi simboli come ', \", ;, <, >.",
      "prodotti"
    );
    return;
  }

  const nomeSanificato = sanitizeInputText(nomeRaw);
  if (!nomeSanificato) {
    mostraAlert(
      "error",
      "Inserisci il nome del prodotto (solo lettere, numeri e spazi).",
      "prodotti"
    );
    return;
  }

  try {
    const res = await fetch("/api/prodotti", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nome: nomeSanificato }),
    });
    const data = await res.json();
    if (!res.ok) {
      mostraAlert("error", data.error || "Errore durante l'aggiunta", "prodotti");
      return;
    }
    input.value = "";
    mostraAlert("success", "Prodotto aggiunto con successo", "prodotti");
    refreshAllData();
  } catch (err) {
    console.error(err);
    mostraAlert("error", "Errore durante l'aggiunta", "prodotti");
  }
}

function apriModificaProdotto(id, nome) {
  prodottoInModifica = id;
  document.getElementById("modifica-nome").value = nome;
  document.getElementById("modal-modifica").classList.add("active");
}

function chiudiModal() {
  document.getElementById("modal-modifica").classList.remove("active");
  prodottoInModifica = null;
}

async function salvaNomeProdotto() {
  const nuovoNomeInput = document.getElementById("modifica-nome");
  const nuovoNomeRaw = nuovoNomeInput.value;

  if (containsForbiddenChars(nuovoNomeRaw)) {
    alert("Caratteri non validi rilevati. Rimuovi simboli come ', \", ;, <, >.");
    return;
  }

  const nuovoNomeSanificato = sanitizeInputText(nuovoNomeRaw);
  if (!nuovoNomeSanificato) {
    alert("Inserisci un nome valido (solo lettere, numeri e spazi).");
    return;
  }

  try {
    const res = await fetch(`/api/prodotti/${prodottoInModifica}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nome: nuovoNomeSanificato }),
    });
    const data = await res.json();
    if (!res.ok) {
      alert(data.error || "Errore durante la modifica");
      return;
    }
    chiudiModal();
    mostraAlert("success", "Nome prodotto modificato", "prodotti");
    refreshAllData();
  } catch (err) {
    alert("Errore durante la modifica");
  }
}

async function eliminaProdotto(id) {
  if (
    !confirm(
      "ATTENZIONE! L'eliminazione è consentita SOLO se la giacenza è zero. Verranno cancellati PERMANENTEMENTE tutti i movimenti e lotti associati. Sei sicuro?"
    )
  )
    return;

  try {
    const res = await fetch(`/api/prodotti/${id}`, {
      method: "DELETE",
    });
    const data = await res.json();
    if (!res.ok) {
      mostraAlert(
        "error",
        data.error || "Errore durante l'eliminazione",
        "prodotti"
      );
      return;
    }
    mostraAlert("success", "Prodotto e storico eliminati", "prodotti");
    refreshAllData();
  } catch (err) {
    mostraAlert("error", "Errore di rete durante l'eliminazione", "prodotti");
  }
}

/* ===================== DATI CARICO/SCARICO ===================== */

async function caricaDati() {
  try {
    const res = await fetch("/api/dati");
    dati = await res.json();
    renderDati();
  } catch (err) {
    console.error("Errore caricamento dati", err);
    const tbody = document.getElementById("dati-body");
    tbody.innerHTML =
      '<tr><td colspan="9" class="empty-state" style="color:#ef4444">Errore nel caricamento dei dati</td></tr>';
  }
}

function renderDati() {
  const tbody = document.getElementById("dati-body");
  if (!dati.length) {
    tbody.innerHTML =
      '<tr><td colspan="9" class="empty-state">Nessun movimento presente</td></tr>';
    document.getElementById("totale-dati").textContent = 0;
    return;
  }

  tbody.innerHTML = dati
    .map((d) => {
      const dataMovimentoFormatted = formatDate(d.datamovimento);
      let prezzoUnitarioDisplay = "-";
      let prezzoTotaleDisplay = "-";
      let prezzoTotaleClass = "";
      let deleteButton = "";
      let fatturaDisplay = d.fatturadoc || "-";
      let fornitoreDisplay = d.fornitoreclienteid || "-";

      if (d.tipo === "carico") {
        if (d.prezzo !== null) prezzoUnitarioDisplay = formatNumber(d.prezzo);
        if (d.prezzototale !== null)
          prezzoTotaleDisplay = formatNumber(d.prezzototale);
        prezzoTotaleClass = "tipo-carico";
        deleteButton = `<button class="btn btn-danger btn-small" onclick="eliminaDato(${d.id}, 'carico')">Elimina</button>`;
      } else if (d.tipo === "scarico") {
        if (d.prezzounitarioscarico !== null)
          prezzoUnitarioDisplay = formatNumber(d.prezzounitarioscarico);
        if (d.prezzototale !== null) {
          const costoScarico = -Math.abs(d.prezzototale);
          prezzoTotaleDisplay = formatNumber(costoScarico);
        }
        prezzoTotaleClass = "tipo-scarico";
        deleteButton = `<button class="btn btn-danger btn-small" onclick="eliminaDato(${d.id}, 'scarico')">Elimina</button>`;
        fatturaDisplay = "-";
        fornitoreDisplay = "-";
      }

      return `
        <tr>
          <td>${dataMovimentoFormatted}</td>
          <td><strong>${d.prodottonome}</strong></td>
          <td><span class="tipo-${d.tipo}">${d.tipo.toUpperCase()}</span></td>
          <td style="text-align:right"><strong>${d.quantita}</strong></td>
          <td style="text-align:right">${prezzoUnitarioDisplay}</td>
          <td style="text-align:right" class="${prezzoTotaleClass}">
            <strong>${prezzoTotaleDisplay}</strong>
          </td>
          <td style="text-align:center">${fatturaDisplay}</td>
          <td style="text-align:center">${fornitoreDisplay}</td>
          <td style="text-align:center">
            <div class="actions">${deleteButton}</div>
          </td>
        </tr>
      `;
    })
    .join("");

  document.getElementById("totale-dati").textContent = dati.length;
}

async function caricaValoreMagazzino() {
  try {
    const res = await fetch("/api/valore-magazzino");
    const data = await res.json();
    document.getElementById("valore-magazzino").textContent = formatNumber(
      data.valoretotale
    );
  } catch (err) {
    console.error("Errore caricamento valore", err);
  }
}

function caricaSelectProdotti() {
  const select = document.getElementById("dato-prodotto");
  const prodottiOrdinati = [...prodotti].sort((a, b) =>
    a.nome.localeCompare(b.nome)
  );

  select.innerHTML =
    '<option value="">Seleziona prodotto...</option>' +
    prodottiOrdinati
      .map(
        (p) =>
          `<option value="${p.id}">${p.nome} (Giacenza ${p.giacenza})</option>`
      )
      .join("");
}

async function aggiungiDato() {
  const prodottoid = document.getElementById("dato-prodotto").value;
  const tipo = document.getElementById("dato-tipo").value;
  const datamovimento = document.getElementById("dato-data").value;
  const quantita = document.getElementById("dato-quantita").value;
  const prezzo = document.getElementById("dato-prezzo").value;
  const fatturadocraw = document.getElementById("dato-fattura").value;
  const fornitoreclienteidraw =
    document.getElementById("dato-fornitore").value;

  if (!tipo) {
    mostraAlert("error", "Seleziona il tipo di operazione (Carico/Scarico)", "dati");
    return;
  }
  if (!prodottoid) {
    mostraAlert("error", "Seleziona un prodotto", "dati");
    return;
  }
  if (!datamovimento) {
    mostraAlert("error", "Inserisci la data del movimento", "dati");
    return;
  }
  if (!quantita || quantita <= 0) {
    mostraAlert("error", "Inserisci una quantità valida", "dati");
    return;
  }

  if (tipo === "carico") {
    const prezzoString = String(prezzo).trim();
    if (!prezzoString) {
      mostraAlert(
        "error",
        "Il prezzo è obbligatorio per il carico",
        "dati"
      );
      return;
    }
    const prezzoNumerico = parseFloat(prezzoString.replace(",", "."));
    if (isNaN(prezzoNumerico) || prezzoNumerico <= 0) {
      mostraAlert(
        "error",
        "Il prezzo deve essere un numero valido maggiore di zero",
        "dati"
      );
      return;
    }

    if (containsForbiddenChars(fatturadocraw)) {
      mostraAlert(
        "error",
        "La Fattura/Documento contiene caratteri non validi",
        "dati"
      );
      return;
    }
    if (containsForbiddenChars(fornitoreclienteidraw)) {
      mostraAlert(
        "error",
        "Il Fornitore/Cliente contiene caratteri non validi",
        "dati"
      );
      return;
    }

    const fatturadocsanitized = sanitizeInputText(fatturadocraw);
    const fornitoreclienteidsanitized =
      sanitizeInputText(fornitoreclienteidraw);

    if (!fatturadocsanitized) {
      mostraAlert(
        "error",
        "La fattura/documento è obbligatoria per il carico.",
        "dati"
      );
      return;
    }
    if (!fornitoreclienteidsanitized) {
      mostraAlert(
        "error",
        "Il fornitore/cliente è obbligatorio per il carico.",
        "dati"
      );
      return;
    }

    try {
      const res = await fetch("/api/dati", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prodottoid,
          tipo,
          quantita,
          prezzo: prezzoNumerico,
          datamovimento,
          fatturadoc: fatturadocsanitized,
          fornitoreclienteid: fornitoreclienteidsanitized,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        mostraAlert("error", data.error || "Errore durante l'aggiunta", "dati");
        return;
      }

      document.getElementById("dato-tipo").value = "";
      document.getElementById("dato-prodotto").value = "";
      document.getElementById("dato-quantita").value = "";
      document.getElementById("dato-prezzo").value = "";
      document.getElementById("dato-fattura").value = "";
      document.getElementById("dato-fornitore").value = "";
      setInitialDate();
      toggleCaricoFields();

      mostraAlert("success", "Movimento registrato con successo", "dati");
      await refreshAllData();
    } catch (err) {
      mostraAlert("error", "Errore durante l'aggiunta", "dati");
    }
  } else if (tipo === "scarico") {
    try {
      const res = await fetch("/api/dati", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prodottoid,
          tipo,
          quantita,
          prezzo: null,
          datamovimento,
          fatturadoc: null,
          fornitoreclienteid: null,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        mostraAlert("error", data.error || "Errore durante l'aggiunta", "dati");
        return;
      }

      document.getElementById("dato-tipo").value = "";
      document.getElementById("dato-prodotto").value = "";
      document.getElementById("dato-quantita").value = "";
      document.getElementById("dato-prezzo").value = "";
      document.getElementById("dato-fattura").value = "";
      document.getElementById("dato-fornitore").value = "";
      setInitialDate();
      toggleCaricoFields();

      mostraAlert("success", "Movimento registrato con successo", "dati");
      await refreshAllData();
    } catch (err) {
      mostraAlert("error", "Errore durante l'aggiunta", "dati");
    }
  }
}

async function eliminaDato(id, tipo) {
  let messaggioConferma;
  if (tipo === "carico") {
    messaggioConferma =
      "ATTENZIONE! Stai per eliminare un CARICO. L'eliminazione è consentita SOLO se il lotto non è stato utilizzato. Confermi?";
  } else if (tipo === "scarico") {
    messaggioConferma =
      "ATTENZIONE! Stai per annullare uno SCARICO. Verrà ripristinata la quantità ai lotti. Confermi?";
  } else {
    messaggioConferma = "Sei sicuro di voler eliminare questo movimento?";
  }

  if (!confirm(messaggioConferma)) return;

  try {
    const res = await fetch(`/api/dati/${id}`, {
      method: "DELETE",
    });
    const data = await res.json();
    if (!res.ok) {
      mostraAlert(
        "error",
        data.error || "Errore durante l'eliminazione",
        "dati"
      );
      return;
    }

    mostraAlert("success", data.message || "Movimento eliminato", "dati");
    refreshAllData();
  } catch (err) {
    mostraAlert("error", "Errore di rete durante l'eliminazione", "dati");
  }
}

/* ===================== RIEPILOGO / LOTTI ===================== */

async function caricaRiepilogo() {
  try {
    const res = await fetch("/api/riepilogo");
    const riepilogo = await res.json();

    const tbody = document.getElementById("riepilogo-body");
    if (!riepilogo.length) {
      tbody.innerHTML =
        '<tr><td colspan="4" class="empty-state">Nessun prodotto in magazzino</td></tr>';
      document.getElementById("valore-magazzino-riepilogo").textContent =
        "0,00";
      return;
    }

    let totaleGenerale = 0;
    tbody.innerHTML = riepilogo
      .map((r) => {
        totaleGenerale += r.valoretotale;
        return `
        <tr>
          <td><strong>${r.nome}</strong></td>
          <td style="text-align:center">
            <span class="giacenza ${r.giacenza > 0 ? "positiva" : "zero"}">
              ${r.giacenza}
            </span>
          </td>
          <td style="text-align:right"><strong>${formatNumber(
            r.valoretotale
          )}</strong></td>
          <td style="text-align:center">
            <button class="btn btn-primary btn-small" onclick="mostraDettaglioLotti(${r.id}, '${r.nome.replace(
              /'/g,
              "\\'"
            )}')">Lotti</button>
          </td>
        </tr>
      `;
      })
      .join("");

    document.getElementById("valore-magazzino-riepilogo").textContent =
      formatNumber(totaleGenerale);
  } catch (err) {
    console.error("Errore caricamento riepilogo", err);
  }
}

async function mostraDettaglioLotti(prodottoId, nomeProdotto) {
  prodottoDettaglio = prodottoId;
  document.getElementById("dettaglio-prodotto-nome").textContent =
    nomeProdotto;

  try {
    const res = await fetch(`/api/lotti/${prodottoId}`);
    const lotti = await res.json();
    renderDettaglioLotti(lotti);

    document
      .querySelectorAll(".section")
      .forEach((s) => s.classList.remove("active"));
    document
      .querySelectorAll(".tab")
      .forEach((t) => t.classList.remove("active"));

    document.getElementById("dettaglio-section").classList.add("active");
    history.replaceState(null, null, "#dettaglio");
  } catch (err) {
    console.error("Errore caricamento lotti", err);
  }
}

function renderDettaglioLotti(lotti) {
  const tbody = document.getElementById("dettaglio-body");
  if (!lotti.length) {
    tbody.innerHTML =
      '<tr><td colspan="6" class="empty-state">Nessun lotto disponibile</td></tr>';
    document.getElementById("totale-lotti").textContent = 0;
    return;
  }

  tbody.innerHTML = lotti
    .map((l) => {
      const dataFormatted = formatDate(l.datacarico);
      const valoreLotto = l.quantitarimanente * l.prezzo;
      const fatturaDisplay = l.fatturadoc || "-";
      const fornitoreDisplay = l.fornitoreclienteid || "-";

      return `
        <tr>
          <td>${dataFormatted}</td>
          <td style="text-align:center">${fatturaDisplay}</td>
          <td style="text-align:center">${fornitoreDisplay}</td>
          <td style="text-align:right">
            <span class="giacenza positiva">${l.quantitarimanente}</span>
          </td>
          <td style="text-align:right">${formatNumber(l.prezzo)}</td>
          <td style="text-align:right"><strong>${formatNumber(
            valoreLotto
          )}</strong></td>
        </tr>
      `;
    })
    .join("");

  document.getElementById("totale-lotti").textContent = lotti.length;
}

function tornaARiepilogo() {
  switchTab("riepilogo");
}

/* ===================== UTENTI ===================== */

async function caricaUtenti() {
  try {
    const res = await fetch("/api/utenti");
    if (!res.ok) throw new Error("Errore nel caricamento utenti");
    utenti = await res.json();

    const tbody = document.getElementById("utenti-body");

    if (!utenti || utenti.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="3" class="empty-state">Nessun utente presente</td>
        </tr>
      `;
      return;
    }

    tbody.innerHTML = utenti
      .map(
        (u) => `
        <tr>
          <td>${u.id}</td>
          <td><strong>${u.username}</strong></td>
          <td style="text-align:center">
            <div class="actions">
              <button class="btn btn-warning btn-small" onclick="apriModificaUtente(${u.id}, '${u.username.replace(
                /'/g,
                "\\'"
              )}')">Modifica</button>
              <button class="btn btn-danger btn-small" onclick="eliminaUtente(${u.id})">Elimina</button>
            </div>
          </td>
        </tr>
      `
      )
      .join("");
  } catch (err) {
    console.error(err);
    mostraAlert("error", "Errore nel caricamento utenti", "utenti");
  }
}

async function aggiungiUtente() {
  const usernameInput = document.getElementById("nuovo-username");
  const passwordInput = document.getElementById("nuova-password");
  const confermaInput = document.getElementById("conferma-password");

  const usernameRaw = usernameInput.value;
  const password = passwordInput.value;
  const conferma = confermaInput.value;

  if (!usernameRaw || !password || !conferma) {
    mostraAlert("error", "Compila tutti i campi", "utenti");
    return;
  }

  if (password !== conferma) {
    mostraAlert("error", "Le password non coincidono", "utenti");
    return;
  }

  if (containsForbiddenChars(usernameRaw)) {
    mostraAlert("error", "Username contiene caratteri non validi", "utenti");
    return;
  }

  const usernameSanificato = sanitizeInputText(usernameRaw);
  if (!usernameSanificato) {
    mostraAlert("error", "Inserisci un username valido", "utenti");
    return;
  }

  try {
    const res = await fetch("/api/utenti", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        username: usernameSanificato,
        password,
      }),
    });

    const data = await res.json();
    if (!res.ok) {
      mostraAlert("error", data.error || "Errore creazione utente", "utenti");
      return;
    }

    usernameInput.value = "";
    passwordInput.value = "";
    confermaInput.value = "";

    mostraAlert("success", "Utente creato con successo", "utenti");
    caricaUtenti();
  } catch (err) {
    console.error(err);
    mostraAlert("error", "Errore di rete durante la creazione", "utenti");
  }
}

function apriModificaUtente(id, username) {
  utenteInModifica = id;
  document.getElementById("modifica-username").value = username;
  document.getElementById("modifica-password").value = "";
  document.getElementById("modal-modifica-utente").classList.add("active");
}

function chiudiModalUtente() {
  document.getElementById("modal-modifica-utente").classList.remove("active");
  utenteInModifica = null;
}

async function salvaUtente() {
  if (!utenteInModifica) return;

  const usernameRaw = document.getElementById("modifica-username").value;
  const nuovaPassword = document.getElementById("modifica-password").value;

  if (!usernameRaw && !nuovaPassword) {
    mostraAlert("error", "Nessun dato da aggiornare", "utenti");
    return;
  }

  if (usernameRaw && containsForbiddenChars(usernameRaw)) {
    mostraAlert("error", "Username contiene caratteri non validi", "utenti");
    return;
  }

  const usernameSanificato = usernameRaw
    ? sanitizeInputText(usernameRaw)
    : undefined;

  try {
    const body = {};
    if (usernameSanificato) body.username = usernameSanificato;
    if (nuovaPassword && nuovaPassword.trim() !== "") {
      body.password = nuovaPassword;
    }

    const res = await fetch(`/api/utenti/${utenteInModifica}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    const data = await res.json();
    if (!res.ok) {
      mostraAlert(
        "error",
        data.error || "Errore aggiornamento utente",
        "utenti"
      );
      return;
    }

    mostraAlert("success", "Utente aggiornato con successo", "utenti");
    chiudiModalUtente();
    caricaUtenti();
  } catch (err) {
    console.error(err);
    mostraAlert("error", "Errore di rete durante l'aggiornamento", "utenti");
  }
}

async function eliminaUtente(id) {
  if (!confirm("Sei sicuro di voler eliminare questo utente?")) return;

  try {
    const res = await fetch(`/api/utenti/${id}`, {
      method: "DELETE",
    });

    const data = await res.json();
    if (!res.ok) {
      mostraAlert(
        "error",
        data.error || "Errore durante l'eliminazione",
        "utenti"
      );
      return;
    }

    mostraAlert("success", "Utente eliminato con successo", "utenti");
    caricaUtenti();
  } catch (err) {
    console.error(err);
    mostraAlert("error", "Errore di rete durante l'eliminazione", "utenti");
  }
}
