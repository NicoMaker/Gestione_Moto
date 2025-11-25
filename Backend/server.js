// Installazione: npm install express sqlite3 cors
const express = require('express');
const cors = require('cors');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const os = require('os');
const { exec } = require('child_process');

const PORT = 3000;
const app = express();
app.use(cors());
app.use(express.json());

// Database locale SQLite
const db = new sqlite3.Database('./magazzino.db');

// Creazione tabelle
db.serialize(() => {
  db.run(`CREATE TABLE IF NOT EXISTS prodotti (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nome TEXT UNIQUE NOT NULL
  )`);

  // AGGIUNTO: prezzo_totale_movimento per memorizzare il valore totale del carico/scarico (costo FIFO)
  db.run(`CREATE TABLE IF NOT EXISTS dati (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    prodotto_id INTEGER,
    tipo TEXT CHECK(tipo IN ('carico', 'scarico')),
    quantita INTEGER NOT NULL CHECK(quantita > 0),
    prezzo REAL, /* Prezzo unitario per il carico, NULL per lo scarico */
    prezzo_totale_movimento REAL, /* Valore totale del carico (Qta*Prezzo) o scarico (costo FIFO) */
    data TEXT NOT NULL,
    FOREIGN KEY(prodotto_id) REFERENCES prodotti(id)
  )`);

  // Tabella lotti per tracciare ogni carico con quantità rimanente
  db.run(`CREATE TABLE IF NOT EXISTS lotti (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    prodotto_id INTEGER,
    quantita_iniziale INTEGER NOT NULL,
    quantita_rimanente INTEGER NOT NULL,
    prezzo REAL NOT NULL,
    data_carico TEXT NOT NULL,
    FOREIGN KEY(prodotto_id) REFERENCES prodotti(id)
  )`);
});

app.use(express.static(path.join(__dirname, '../frontend')));

// ===== PRODOTTI =====
app.get('/api/prodotti', (req, res) => {
  const query = `
    SELECT 
      p.id, 
      p.nome,
      COALESCE(SUM(l.quantita_rimanente), 0) as giacenza
    FROM prodotti p
    LEFT JOIN lotti l ON p.id = l.prodotto_id
    GROUP BY p.id, p.nome
    ORDER BY p.nome
  `;
  db.all(query, (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

app.post('/api/prodotti', (req, res) => {
  const { nome } = req.body;
  if (!nome || !nome.trim()) {
    return res.status(400).json({ error: 'Nome prodotto obbligatorio' });
  }

  db.run('INSERT INTO prodotti (nome) VALUES (?)', [nome.trim()], function(err) {
    if (err) {
      if (err.message.includes('UNIQUE')) {
        return res.status(400).json({ error: 'Prodotto già esistente' });
      }
      return res.status(500).json({ error: err.message });
    }
    res.json({ id: this.lastID, nome: nome.trim() });
  });
});

app.put('/api/prodotti/:id', (req, res) => {
  const { nome } = req.body;
  const { id } = req.params;
  
  if (!nome || !nome.trim()) {
    return res.status(400).json({ error: 'Nome prodotto obbligatorio' });
  }

  db.run('UPDATE prodotti SET nome = ? WHERE id = ?', [nome.trim(), id], function(err) {
    if (err) {
      if (err.message.includes('UNIQUE')) {
        return res.status(400).json({ error: 'Prodotto già esistente' });
      }
      return res.status(500).json({ error: err.message });
    }
    if (this.changes === 0) {
      return res.status(404).json({ error: 'Prodotto non trovato' });
    }
    res.json({ success: true });
  });
});

app.delete('/api/prodotti/:id', (req, res) => {
  const { id } = req.params;
  
  db.get('SELECT COUNT(*) as count FROM dati WHERE prodotto_id = ?', [id], (err, row) => {
    if (err) return res.status(500).json({ error: err.message });
    
    if (row.count > 0) {
      return res.status(400).json({ error: 'Impossibile eliminare: prodotto con movimenti' });
    }
    
    db.run('DELETE FROM prodotti WHERE id = ?', [id], function(err) {
      if (err) return res.status(500).json({ error: err.message });
      if (this.changes === 0) {
        return res.status(404).json({ error: 'Prodotto non trovato' });
      }
      res.json({ success: true });
    });
  });
});

// ===== DATI & MAGAZZINO =====

// GET Tutti i movimenti
app.get('/api/dati', (req, res) => {
  const query = `
    SELECT 
      d.id,
      d.prodotto_id,
      p.nome as prodotto_nome,
      d.tipo,
      d.quantita,
      d.prezzo,
      d.prezzo_totale_movimento as prezzo_totale,
      -- Calcolo del prezzo unitario di scarico (costo medio ponderato dello scarico)
      CASE WHEN d.tipo = 'scarico' AND d.prezzo_totale_movimento IS NOT NULL AND d.quantita > 0 THEN d.prezzo_totale_movimento / d.quantita ELSE NULL END as prezzo_unitario_scarico,
      d.data
    FROM dati d
    JOIN prodotti p ON d.prodotto_id = p.id
    ORDER BY d.data DESC, d.id DESC
  `;
  db.all(query, (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

// GET valore totale magazzino (FIFO)
app.get('/api/valore-magazzino', (req, res) => {
  const query = `
    SELECT COALESCE(SUM(quantita_rimanente * prezzo), 0) as valore_totale
    FROM lotti
    WHERE quantita_rimanente > 0
  `;
  
  db.get(query, (err, row) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ valore_totale: row.valore_totale || 0 });
  });
});

// GET riepilogo magazzino
app.get('/api/riepilogo', (req, res) => {
  const query = `
    SELECT 
      p.id,
      p.nome,
      COALESCE(SUM(l.quantita_rimanente), 0) as giacenza,
      COALESCE(SUM(l.quantita_rimanente * l.prezzo), 0) as valore_totale
    FROM prodotti p
    LEFT JOIN lotti l ON p.id = l.prodotto_id AND l.quantita_rimanente > 0
    GROUP BY p.id, p.nome
    HAVING giacenza >= 0
    ORDER BY p.nome
  `;
  
  db.all(query, (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

// GET dettaglio lotti per prodotto
app.get('/api/lotti/:prodotto_id', (req, res) => {
  const { prodotto_id } = req.params;
  const query = `
    SELECT 
      id,
      quantita_rimanente,
      prezzo,
      data_carico
    FROM lotti
    WHERE prodotto_id = ? AND quantita_rimanente > 0
    ORDER BY data_carico ASC
  `;
  
  db.all(query, [prodotto_id], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

// POST nuovo dato (carico/scarico)
app.post('/api/dati', (req, res) => {
  const { prodotto_id, tipo, quantita, prezzo } = req.body;
  
  if (!prodotto_id || !tipo || !quantita) {
    return res.status(400).json({ error: 'Prodotto, tipo e quantità sono obbligatori' });
  }
  
  const qty = parseInt(quantita);
  
  if (qty <= 0) {
    return res.status(400).json({ error: 'Quantità deve essere maggiore di 0' });
  }
  
  if (tipo === 'carico') {
    const prc = parseFloat(prezzo);
    if (isNaN(prc) || prc <= 0) {
      return res.status(400).json({ error: 'Prezzo obbligatorio e maggiore di 0 per il carico' });
    }
    
    // Calcolo richiesto: Prezzo Totale per parte (Carico)
    const prezzoTotale = prc * qty; 
    const data = new Date().toISOString();
    
    // Inserisci in dati
    db.run(
      'INSERT INTO dati (prodotto_id, tipo, quantita, prezzo, prezzo_totale_movimento, data) VALUES (?, ?, ?, ?, ?, ?)',
      [prodotto_id, tipo, qty, prc, prezzoTotale, data],
      function(err) {
        if (err) return res.status(500).json({ error: err.message });
        
        // Crea nuovo lotto
        db.run(
          'INSERT INTO lotti (prodotto_id, quantita_iniziale, quantita_rimanente, prezzo, data_carico) VALUES (?, ?, ?, ?, ?)',
          [prodotto_id, qty, qty, prc, data],
          function(err) {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ id: this.lastID });
          }
        );
      }
    );
  } else {
    // SCARICO - usa FIFO per scaricare dai lotti più vecchi
    db.all(
      'SELECT id, quantita_rimanente, prezzo FROM lotti WHERE prodotto_id = ? AND quantita_rimanente > 0 ORDER BY data_carico ASC',
      [prodotto_id],
      (err, lotti) => {
        if (err) return res.status(500).json({ error: err.message });
        
        const giacenzaTotale = lotti.reduce((sum, l) => sum + l.quantita_rimanente, 0);
        
        if (giacenzaTotale < qty) {
          return res.status(400).json({ error: `Giacenza insufficiente (disponibili: ${giacenzaTotale})` });
        }
        
        // Scarica dai lotti e calcola il costo totale FIFO
        let daScaricare = qty;
        let costoTotaleScarico = 0; // Il Prezzo Totale per lo Scarico (Costo FIFO)
        const updates = [];
        
        for (const lotto of lotti) {
          if (daScaricare <= 0) break;
          
          const qtaDaQuestoLotto = Math.min(daScaricare, lotto.quantita_rimanente);
          const nuovaQta = lotto.quantita_rimanente - qtaDaQuestoLotto;
          
          // Costo FIFO
          costoTotaleScarico += qtaDaQuestoLotto * lotto.prezzo; 
          
          updates.push({
            id: lotto.id,
            nuova_quantita: nuovaQta
          });
          
          daScaricare -= qtaDaQuestoLotto;
        }
        
        // Esegui gli aggiornamenti
        db.serialize(() => {
          const data = new Date().toISOString();
          
          // Inserisci in dati con il costo FIFO calcolato come prezzo_totale_movimento
          db.run(
            'INSERT INTO dati (prodotto_id, tipo, quantita, prezzo, prezzo_totale_movimento, data) VALUES (?, ?, ?, ?, ?, ?)',
            [prodotto_id, tipo, qty, null, costoTotaleScarico, data],
            function(err) {
              if (err) return res.status(500).json({ error: err.message });
            }
          );
          
          updates.forEach(u => {
            db.run('UPDATE lotti SET quantita_rimanente = ? WHERE id = ?', [u.nuova_quantita, u.id]);
          });
          
          res.json({ success: true, costo_totale_scarico: costoTotaleScarico });
        });
      }
    );
  }
});

// DELETE dato (bloccato)
app.delete('/api/dati/:id', (req, res) => {
  const { id } = req.params;
  
  res.status(400).json({ 
    error: 'Non è possibile eliminare movimenti dopo la registrazione. Questo comprometterebbe il calcolo dei lotti.' 
  });
});

// Avvio server e apertura browser
app.listen(PORT, () => {
  console.log(`Backend avviato su http://localhost:${PORT}`);
  const url = `http://localhost:${PORT}/`;

  let cmd;
  switch (os.platform()) {
    case 'win32': cmd = `start ${url}`; break;
    case 'darwin': cmd = `open ${url}`; break;
    default: cmd = `xdg-open ${url}`; // Linux
  }
  exec(cmd, (err) => {
    if (err) console.warn('Non è stato possibile aprire automaticamente il browser:', err);
  });
});