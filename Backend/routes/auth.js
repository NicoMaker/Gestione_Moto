// routes/auth.js

const express = require("express");
const router = express.Router();
const bcrypt = require("bcrypt");
const { db } = require("../db/init");

// POST - Login
router.post("/login", async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: "Username e password obbligatori" });
  }

  db.get(
    "SELECT * FROM users WHERE username = ?",
    [username],
    async (err, user) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }

      if (!user) {
        return res.status(401).json({ error: "Credenziali non valide" });
      }

      try {
        const passwordMatch = await bcrypt.compare(password, user.password);

        if (!passwordMatch) {
          return res.status(401).json({ error: "Credenziali non valide" });
        }

        // Login riuscito - invia anche l'hash della password per verifica sessione
        res.json({
          success: true,
          message: "Login effettuato con successo",
          username: user.username,
          userId: user.id,
          sessionToken: user.password.substring(0, 20) // Primi 20 caratteri dell'hash come token
        });
      } catch (error) {
        res
          .status(500)
          .json({ error: "Errore durante la verifica della password" });
      }
    }
  );
});

// GET - Verifica sessione utente
router.get("/verify-session", (req, res) => {
  const { username, sessionToken } = req.query;

  if (!username || !sessionToken) {
    return res.status(400).json({ valid: false, error: "Dati mancanti" });
  }

  db.get(
    "SELECT id, username, password FROM users WHERE username = ?",
    [username],
    (err, user) => {
      if (err) {
        return res.status(500).json({ valid: false, error: err.message });
      }

      if (!user) {
        return res.json({ 
          valid: false, 
          reason: "user_deleted",
          message: "Utente non più esistente" 
        });
      }

      // Verifica se la password è stata cambiata
      const currentToken = user.password.substring(0, 20);
      if (currentToken !== sessionToken) {
        return res.json({ 
          valid: false, 
          reason: "password_changed",
          message: "Password modificata" 
        });
      }

      res.json({ 
        valid: true,
        userId: user.id,
        username: user.username
      });
    }
  );
});

module.exports = router;