// routes/utenti.js

const express = require("express");
const router = express.Router();
const bcrypt = require("bcrypt");
const { db } = require("../db/init");

// Controllo forza password:
// - minimo 8 caratteri
// - almeno una minuscola
// - almeno una maiuscola
// - almeno un numero
function isPasswordStrong(password) {
  if (typeof password !== "string") return false;
  const regex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;
  return regex.test(password);
}

// GET /api/utenti - lista utenti (senza password)
router.get("/", (req, res) => {
  db.all(
    "SELECT id, username FROM users ORDER BY username ASC",
    [],
    (err, rows) => {
      if (err) {
        console.error("Errore nel recupero utenti:", err);
        return res
          .status(500)
          .json({ error: "Errore nel recupero utenti" });
      }
      res.json(rows);
    }
  );
});

// POST /api/utenti - crea nuovo utente
router.post("/", async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res
      .status(400)
      .json({ error: "Username e password obbligatori" });
  }

  // Saltiamo il check di forza per semplificare l'interfaccia, 
  // ma la validazione minima è comunque nel frontend.
  // if (!isPasswordStrong(password)) {
  //   return res.status(400).json({ error: "Password troppo debole..." });
  // }

  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    const createdAt = new Date().toISOString();

    db.run(
      "INSERT INTO users (username, password, createdat) VALUES (?, ?, ?)",
      [username.trim(), hashedPassword, createdAt],
      function (err) {
        if (err) {
          if (err.message.includes("UNIQUE")) {
            return res.status(400).json({
              error: `L'utente "${username.trim()}" esiste già.`,
            });
          }
          console.error("Errore creazione utente:", err);
          return res
            .status(500)
            .json({ error: "Errore durante la creazione utente" });
        }
        res.json({ id: this.lastID, username: username.trim() });
      }
    );
  } catch (error) {
    console.error("Errore hashing password:", error);
    res
      .status(500)
      .json({ error: "Errore durante l'elaborazione della password" });
  }
});

// PUT /api/utenti/:id - modifica utente (username e/o password)
router.put("/:id", async (req, res) => {
  const { id } = req.params;
  const { username, password } = req.body;

  if (!username) {
    return res.status(400).json({ error: "Username obbligatorio" });
  }
  
  if (password && password.length < 8) {
     return res.status(400).json({ error: "La password deve contenere almeno 8 caratteri." });
  }

  // 1. Recupera l'utente corrente per mantenere la password se non viene modificata
  db.get("SELECT * FROM users WHERE id = ?", [id], async (err, user) => {
    if (err) {
      console.error("Errore recupero utente:", err);
      return res
        .status(500)
        .json({ error: "Errore durante il recupero utente" });
    }
    if (!user) {
      return res.status(404).json({ error: "Utente non trovato" });
    }

    let newUsername = username ? username.trim() : user.username;
    let newPasswordHash = user.password; // Mantiene la vecchia hash di default

    // Se è stata fornita una nuova password, la hash
    if (password) {
      try {
        newPasswordHash = await bcrypt.hash(password, 10);
      } catch (hashError) {
        console.error("Errore hashing nuova password:", hashError);
        return res
          .status(500)
          .json({ error: "Errore durante l'elaborazione della password" });
      }
    }

    // 2. Aggiorna l'utente (username e/o password)
    db.run(
      "UPDATE users SET username = ?, password = ? WHERE id = ?",
      [newUsername, newPasswordHash, id],
      function (err3) {
        if (err3) {
          if (err3.message.includes("UNIQUE")) {
            return res.status(400).json({
              error: `L'utente "${newUsername}" esiste già.`,
            });
          }
          console.error("Errore aggiornamento utente:", err3);
          return res
            .status(500)
            .json({ error: "Errore durante l'aggiornamento utente" });
        }
        res.json({ id, username: newUsername });
      }
    );
  });
});

// DELETE /api/utenti/:id - elimina utente (ma non se è l'unico)
router.delete("/:id", (req, res) => {
  const { id } = req.params;

  db.get("SELECT COUNT(*) AS total FROM users", [], (err, row) => {
    if (err) {
      console.error("Errore conteggio utenti:", err);
      return res
        .status(500)
        .json({ error: "Errore nel conteggio utenti" });
    }

    if (row.total <= 1) {
      return res.status(400).json({
        error: "Non puoi eliminare l'unico utente rimasto",
      });
    }

    db.run("DELETE FROM users WHERE id = ?", [id], function (err2) {
      if (err2) {
        console.error("Errore eliminazione utente:", err2);
        return res
          .status(500)
          .json({ error: "Errore durante l'eliminazione utente" });
      }

      if (this.changes === 0) {
        return res.status(404).json({ error: "Utente non trovato" });
      }

      res.json({ success: true, message: "Utente eliminato con successo" });
    });
  });
});

module.exports = router;