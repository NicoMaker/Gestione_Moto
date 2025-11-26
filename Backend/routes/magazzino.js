// routes/magazzino.js

const express = require("express");
const router = express.Router();
const { db } = require("../db/init");

// GET - Valore totale del magazzino (FIFO)
router.get("/valore-magazzino", (req, res) => {
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

// GET - Riepilogo per prodotto (Giacenza e Valore Totale FIFO)
router.get("/riepilogo", (req, res) => {
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

// GET - Dettaglio Lotti per prodotto (corrente)
router.get("/riepilogo/lotti/:prodottoId", (req, res) => {
  const { prodottoId } = req.params;

  const query = `
    SELECT id, quantita_rimanente, prezzo, data_registrazione
    FROM lotti 
    WHERE prodotto_id = ? AND quantita_rimanente > 0
    ORDER BY data_registrazione ASC
  `;

  db.all(query, [prodottoId], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

// ==========================================================
// ⭐ ROTTE STORICO (AGGIORNATE) ⭐
// ==========================================================

// GET - Giacenza netta e Valore Totale per prodotto fino a una certa data
router.get("/storico/giacenza", (req, res) => {
  const { data } = req.query; // data is YYYY-MM-DD
  
  if (!data) {
    return res.status(400).json({ error: "Data obbligatoria" });
  }

  // Nota: questa query assume che "prezzo_totale_movimento" negli scarichi 
  // sia il costo FIFO corretto registrato al momento del movimento.
  const query = `
    SELECT 
      p.id, 
      p.nome,
      -- Calcolo della giacenza netta (Carichi - Scarichi)
      COALESCE(SUM(CASE WHEN d.tipo = 'carico' THEN d.quantita ELSE -d.quantita END), 0) as giacenza_netta,
      -- Calcolo del Valore Totale (Costo Carichi - Costo Scarichi FIFO)
      COALESCE(SUM(CASE
        WHEN d.tipo = 'carico' THEN d.quantita * d.prezzo
        WHEN d.tipo = 'scarico' THEN -d.prezzo_totale_movimento
        ELSE 0
      END), 0) as valore_totale_storico
    FROM prodotti p
    LEFT JOIN dati d 
      ON p.id = d.prodotto_id 
      AND d.data_movimento <= ? -- Filtra i movimenti per data
    GROUP BY p.id, p.nome
    HAVING giacenza_netta != 0
    ORDER BY p.nome
  `;

  db.all(query, [data], (err, rows) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ error: err.message });
    }
    // Filtra per mostrare solo i prodotti che hanno giacenza_netta > 0
    const results = rows.filter(row => row.giacenza_netta > 0);
    res.json(results);
  });
});


// GET - Dettaglio Lotti Storico (simulazione FIFO)
router.get("/storico/lotti/:prodottoId", (req, res) => {
    const { prodottoId } = req.params;
    const { data } = req.query; // historical date (YYYY-MM-DD)

    if (!data) return res.status(400).json({ error: "Data obbligatoria" });

    // 1. Recupera tutti i movimenti di CARICO (che rappresentano i lotti) fino alla data
    // Usiamo dati.data_movimento come data del lotto per la coerenza FIFO
    const lottiQuery = `
        SELECT id, quantita, prezzo, data_movimento as data_carico, data_registrazione
        FROM dati 
        WHERE prodotto_id = ? AND tipo = 'carico' AND data_movimento <= ?
        ORDER BY data_movimento ASC, data_registrazione ASC
    `;

    db.all(lottiQuery, [prodottoId, data], (err, lottiStorici) => {
        if (err) return res.status(500).json({ error: "Errore nel recupero dei carichi storici: " + err.message });

        // 2. Recupera tutti i movimenti di SCARICO fino alla data
        const scarichiQuery = `
            SELECT quantita
            FROM dati 
            WHERE prodotto_id = ? AND tipo = 'scarico' AND data_movimento <= ?
        `;

        db.all(scarichiQuery, [prodottoId, data], (err, scarichi) => {
            if (err) return res.status(500).json({ error: "Errore nel recupero degli scarichi storici: " + err.message });

            let totalScarico = scarichi.reduce((sum, s) => sum + s.quantita, 0);

            // 3. Simula la consunzione FIFO dei lotti
            let remainingScarico = totalScarico;
            const finalLotti = [];

            for (const lotto of lottiStorici) {
                let quantitaIniziale = lotto.quantita;
                let quantitaVenduta = 0;
                let quantitaRimanente = 0;

                if (remainingScarico > 0) {
                    quantitaVenduta = Math.min(quantitaIniziale, remainingScarico);
                    quantitaRimanente = quantitaIniziale - quantitaVenduta;
                    remainingScarico -= quantitaVenduta;
                } else {
                    quantitaRimanente = quantitaIniziale;
                }
                
                // Restituisce solo i lotti che non sono stati totalmente consumati alla data O quelli che hanno avuto una vendita
                if (quantitaRimanente > 0 || quantitaVenduta > 0) {
                    finalLotti.push({
                        id: lotto.id,
                        data_carico: lotto.data_carico,
                        prezzo: lotto.prezzo,
                        quantita_iniziale: quantitaIniziale,
                        quantita_venduta: quantitaVenduta, // Quanti sono stati "venduti" da questo lotto fino a questa data
                        quantita_rimanente: quantitaRimanente, // Quanti ne sono rimasti
                    });
                }
            }
            
            res.json(finalLotti);
        });
    });
});

module.exports = router;