const sqlite3 = require("sqlite3").verbose();
const path = require("path");
const fs = require("fs");

// Crea la cartella database se non esiste
const dbDir = path.join(__dirname);
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

// Crea il database nella cartella database
const dbPath = path.join(dbDir, "magazzino.db");
const db = new sqlite3.Database(dbPath);

function initDatabase() {
  db.serialize(() => {
    db.run(`CREATE TABLE IF NOT EXISTS prodotti (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nome TEXT UNIQUE NOT NULL
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS dati (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      prodotto_id INTEGER,
      tipo TEXT CHECK(tipo IN ('carico', 'scarico')),
      quantita INTEGER NOT NULL CHECK(quantita > 0),
      prezzo REAL,
      prezzo_totale_movimento REAL,
      data_movimento TEXT NOT NULL,
      data_registrazione TEXT NOT NULL,
      fattura_doc TEXT,
      fornitore_cliente_id TEXT,
      FOREIGN KEY(prodotto_id) REFERENCES prodotti(id)
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS lotti (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      prodotto_id INTEGER,
      quantita_iniziale INTEGER NOT NULL,
      quantita_rimanente INTEGER NOT NULL,
      prezzo REAL NOT NULL,
      data_carico TEXT NOT NULL,
      data_registrazione TEXT NOT NULL,
      fattura_doc TEXT,
      fornitore_cliente_id TEXT,
      FOREIGN KEY(prodotto_id) REFERENCES prodotti(id)
    )`);
  });
}

module.exports = { db, initDatabase };