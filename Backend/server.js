// server.js

// Installazione: npm install express sqlite3 cors bcrypt

const express = require("express");
const cors = require("cors");
const path = require("path");
const os = require("os");
const { exec } = require("child_process");
const { initDatabase } = require("./db/init");

const authRoutes = require("./routes/auth");
const prodottiRoutes = require("./routes/prodotti");
const datiRoutes = require("./routes/dati");
const magazzinoRoutes = require("./routes/magazzino");
const utentiRoutes = require("./routes/utenti"); 

const PORT = 3000;
const app = express();

app.use(cors());
app.use(express.json());
// Assumendo che i file frontend siano nella cartella ../frontend
app.use(express.static(path.join(__dirname, "../frontend")));

// Inizializza database
initDatabase();

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/prodotti", prodottiRoutes);
app.use("/api/dati", datiRoutes);
app.use("/api", magazzinoRoutes); // Rotte /api/valore-magazzino e /api/riepilogo + Storico
app.use("/api/utenti", utentiRoutes); 

// Fallback per la pagina principale
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

// Fallback per la pagina home dopo login
app.get('/home.html', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/home.html'));
});


// Funzione per aprire il browser automaticamente
const openBrowser = (url) => {
  let command;
  switch (os.platform()) {
    case 'darwin': // macOS
      command = `open ${url}`;
      break;
    case 'win32': // Windows
      command = `start ${url}`;
      break;
    default: // Linux
      command = `xdg-open ${url}`;
      break;
  }
  exec(command, (error) => {
    if (error) {
      console.error(`Errore nell'apertura del browser: ${error.message}`);
    }
  });
};

function checkAuthentication(req, res, next) {
    // Implementazione semplificata:
    // Se non ci sono token o sessioni, assumiamo che l'utente non sia autenticato.
    
    // ⚠️ Se hai implementato un sistema di sessioni o JWT, DEVI sostituire questo
    // con la vera logica di verifica del token.
    
    // Per ora, mandiamo un JSON 401 per risolvere l'errore frontend.
    return res.status(401).json({ error: "Accesso non autorizzato. La sessione è scaduta o non è valida." });
    
    // Esempio di come dovrebbe essere in un'app con sessioni/JWT:
    // if (req.session.userId || req.headers['authorization']) {
    //     next(); // Utente autenticato, prosegui
    // } else {
    //     return res.status(401).json({ error: "Accesso non autorizzato." });
    // }
}

// Avvio server e apertura browser
app.listen(PORT, () => {
  const url = `http://localhost:${PORT}`;
  console.log(`Backend avviato su ${url}`);
  // Rimuovi o commenta la riga seguente se non vuoi l'apertura automatica del browser
  // openBrowser(url); 
});