// routes/magazzino.js - VERSIONE DEFINITIVA E ROBUSTA

const express = require("express");
const router = express.Router();
const { db } = require("../db/init");

// 🎯 FUNZIONE HELPER PER FORMATTARE I DECIMALI A 2 CIFRE
// Utilizza Math.round per l'arrotondamento a 2 cifre, prevenendo errori di floating point.
function formatDecimal(value) {
  if (value === null || value === undefined) return 0;
  const num = parseFloat(value);
  if (isNaN(num)) return 0;
  // Metodo robusto per l'arrotondamento a 2 decimali (gestisce 1.235 -> 1.24)
  return parseFloat(Math.round(num * 100) / 100);
}

// GET - Valore totale del magazzino (FIFO)
router.get("/valore-magazzino", (req, res) => {
  const query = `
    SELECT COALESCE(SUM(quantita_rimanente * prezzo), 0) as valore_totale
    FROM lotti
    WHERE quantita_rimanente > 0
  `;

  db.get(query, (err, row) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ valore_totale: formatDecimal(row.valore_totale) });
  });
});

// GET - Riepilogo per prodotto con marca e descrizione (Stato Attuale)
router.get("/riepilogo", (req, res) => {
  const query = `
    SELECT 
      p.id,
      p.nome,
      m.nome as marca_nome,
      p.descrizione,
      COALESCE(SUM(l.quantita_rimanente), 0) as giacenza,
      COALESCE(SUM(l.quantita_rimanente * l.prezzo), 0) as valore_totale
    FROM prodotti p
    LEFT JOIN marche m ON p.marca_id = m.id
    LEFT JOIN lotti l ON p.id = l.prodotto_id AND l.quantita_rimanente > 0
    GROUP BY p.id, p.nome, m.nome, p.descrizione
    HAVING giacenza >= 0
    ORDER BY p.nome
  `;

  db.all(query, (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });

    const queryLotti = `
      SELECT 
        l.prodotto_id,
        l.id,
        l.quantita_rimanente,
        l.prezzo,
        l.data_carico,
        l.fattura_doc,
        l.fornitore
      FROM lotti l
      WHERE l.quantita_rimanente > 0
      ORDER BY l.data_carico ASC, l.id ASC
    `;

    db.all(queryLotti, (errLotti, lotti) => {
      if (errLotti) return res.status(500).json({ error: errLotti.message });

      const lottiPerProdotto = {};
      lotti.forEach((lotto) => {
        if (!lottiPerProdotto[lotto.prodotto_id]) {
          lottiPerProdotto[lotto.prodotto_id] = [];
        }
        // FORMATTA DECIMALI NEI LOTTI PRIMA DI AGGIUNGERLI
        lottiPerProdotto[lotto.prodotto_id].push({
          ...lotto,
          quantita_rimanente: formatDecimal(lotto.quantita_rimanente),
          prezzo: formatDecimal(lotto.prezzo),
        });
      });

      // FORMATTA DECIMALI NEL RIEPILOGO e calcola Prezzo Medio Ponderato
      const riepilogo = rows.map((row) => {
        // *** CORREZIONE: Formatta i totali subito dopo averli recuperati da SQL ***
        const giacenza = formatDecimal(row.giacenza);
        const valore_totale = formatDecimal(row.valore_totale);

        let prezzo_medio = 0;
        if (giacenza > 0) {
          // Calcolo Prezzo Medio Ponderato Corrente, formattando anche il risultato
          prezzo_medio = formatDecimal(valore_totale / giacenza);
        }

        return {
          ...row,
          giacenza: giacenza,
          valore_totale: valore_totale,
          prezzo_medio: prezzo_medio,
          lotti: lottiPerProdotto[row.id] || [],
        };
      });

      // Calcola il Valore Totale Globale
      const valoreTotale = riepilogo.reduce(
        (sum, r) => formatDecimal(sum + r.valore_totale),
        0
      );

      res.json({
        riepilogo: riepilogo,
        valore_totale: formatDecimal(valoreTotale),
      });
    });
  });
});

// GET - Dettaglio Lotti per Prodotto
router.get("/riepilogo/:prodottoId", (req, res) => {
  const { prodottoId } = req.params;

  const query = `
    SELECT
      id,
      quantita_rimanente,
      prezzo,
      data_carico,
      fattura_doc,
      fornitore
    FROM lotti
    WHERE prodotto_id = ? AND quantita_rimanente > 0
    ORDER BY data_carico ASC, id ASC
  `;

  db.all(query, [prodottoId], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });

    // FORMATTA DECIMALI
    const formattedRows = rows.map((row) => ({
      ...row,
      quantita_rimanente: formatDecimal(row.quantita_rimanente),
      prezzo: formatDecimal(row.prezzo),
    }));

    res.json(formattedRows);
  });
});

// GET - Storico giacenza alla data con marca e descrizione
router.get("/storico-giacenza/:date", (req, res) => {
  const historicalDate = req.params.date;

  if (!/^\d{4}-\d{2}-\d{2}$/.test(historicalDate)) {
    return res
      .status(400)
      .json({ error: "Formato data non valido (YYYY-MM-DD)" });
  }

  db.all(
    `SELECT p.id, p.nome, m.nome as marca_nome, p.descrizione 
     FROM prodotti p 
     LEFT JOIN marche m ON p.marca_id = m.id 
     ORDER BY p.nome`,
    (err, prodotti) => {
      if (err)
        return res.status(500).json({ error: "Errore nel recupero prodotti" });

      const results = [];
      let totalValue = 0;
      let productsProcessed = 0;

      if (prodotti.length === 0)
        return res.json({ riepilogo: [], valore_totale: formatDecimal(0) });

      prodotti.forEach((prodotto) => {
        // Query che recupera carichi (lotti) e scarichi (dati) fino alla data specificata
        const query = `
          SELECT 
            'lotto' as tipo_movimento,
            id,
            quantita_iniziale as quantita,
            prezzo,
            data_carico,
            fattura_doc,
            fornitore,
            data_registrazione
          FROM lotti 
          WHERE prodotto_id = ? AND DATE(data_carico) <= ?
          UNION ALL
          SELECT 
            'scarico' as tipo_movimento,
            id,
            quantita,
            NULL as prezzo,
            data_movimento as data_carico,
            NULL as fattura_doc,
            NULL as fornitore,
            data_registrazione
          FROM dati 
          WHERE prodotto_id = ? AND tipo = 'scarico' AND DATE(data_movimento) <= ?
          ORDER BY data_registrazione ASC, id ASC
        `;

        db.all(
          query,
          [prodotto.id, historicalDate, prodotto.id, historicalDate],
          (err, movimenti) => {
            if (err) {
              console.error(
                `Errore storico prodotto ${prodotto.id}: ${err.message}`
              );
              productsProcessed++;
              if (productsProcessed === prodotti.length) {
                return res.json({
                  riepilogo: results,
                  valore_totale: formatDecimal(totalValue),
                });
              }
              return;
            }

            const lottiAttivi = [];
            let totaleGiacenza = 0;
            let totaleValore = 0;

            movimenti.forEach((mov) => {
              if (mov.tipo_movimento === "lotto") {
                // Carico: Aggiunge un lotto iniziale
                lottiAttivi.push({
                  id: mov.id,
                  qty_iniziale: formatDecimal(mov.quantita),
                  qty_rimanente: formatDecimal(mov.quantita),
                  prezzo: formatDecimal(mov.prezzo),
                  data_carico: mov.data_carico,
                  fattura_doc: mov.fattura_doc,
                  fornitore: mov.fornitore,
                });
              } else if (mov.tipo_movimento === "scarico") {
                // Scarico: Applica FIFO ai lotti attivi
                let qtaDaScaricare = formatDecimal(mov.quantita);

                // Itera sui lotti in ordine FIFO
                for (let i = 0; i < lottiAttivi.length; i++) {
                  if (qtaDaScaricare <= 0.001) break;

                  const lotto = lottiAttivi[i];
                  if (lotto.qty_rimanente <= 0.001) continue;

                  const qtaPrelevata = Math.min(
                    qtaDaScaricare,
                    lotto.qty_rimanente
                  );

                  // ** ARITMETICA SU INTERI PER PRECISIONE FLOAT **
                  const rimanente_int = Math.round(lotto.qty_rimanente * 100);
                  const prelevata_int = Math.round(qtaPrelevata * 100);

                  const nuova_qty_int = rimanente_int - prelevata_int;

                  lotto.qty_rimanente = formatDecimal(nuova_qty_int / 100);

                  qtaDaScaricare = formatDecimal(qtaDaScaricare - qtaPrelevata);
                }
              }
            });

            const lottiRimanenti = lottiAttivi.filter(
              (l) => l.qty_rimanente > 0.001
            );

            lottiRimanenti.forEach((l) => {
              // I calcoli di giacenza e valore sono formattati per prevenire discrepanze
              totaleGiacenza = formatDecimal(totaleGiacenza + l.qty_rimanente);
              totaleValore = formatDecimal(
                totaleValore + formatDecimal(l.qty_rimanente * l.prezzo)
              );
            });

            // Calcolo Prezzo Medio Ponderato per lo storico
            let prezzo_medio_storico = 0;
            if (totaleGiacenza > 0) {
              prezzo_medio_storico = formatDecimal(
                totaleValore / totaleGiacenza
              );
            }

            totalValue = formatDecimal(totalValue + totaleValore);

            results.push({
              id: prodotto.id,
              nome: prodotto.nome,
              marca_nome: prodotto.marca_nome,
              descrizione: prodotto.descrizione,
              giacenza: formatDecimal(totaleGiacenza),
              valore_totale: formatDecimal(totaleValore),
              prezzo_medio: prezzo_medio_storico,
              lotti: lottiRimanenti.map((l) => ({
                id: l.id,
                quantita_rimanente: formatDecimal(l.qty_rimanente),
                prezzo: formatDecimal(l.prezzo),
                data_carico: l.data_carico,
                fattura_doc: l.fattura_doc,
                fornitore: l.fornitore,
              })),
            });

            productsProcessed++;
            if (productsProcessed === prodotti.length) {
              res.json({
                riepilogo: results,
                valore_totale: formatDecimal(totalValue),
              });
            }
          }
        );
      });
    }
  );
});

module.exports = router;
