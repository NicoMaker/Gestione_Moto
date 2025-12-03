const { initDatabase } = require("./init");
const sqlite3 = require("sqlite3").verbose();
const bcrypt = require("bcrypt");
const path = require("path");

const dbPath = path.join(__dirname, "magazzino.db");
const db = new sqlite3.Database(dbPath);

// Funzione helper per promisificare db.run
function runQuery(query, params = []) {
  return new Promise((resolve, reject) => {
    db.run(query, params, function (err) {
      if (err) reject(err);
      else resolve(this);
    });
  });
}

// Funzione helper per promisificare db.get
function getQuery(query, params = []) {
  return new Promise((resolve, reject) => {
    db.get(query, params, (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
}

async function seedDatabase() {
  console.log("🌱 Inizio popolamento database...\n");

  try {
    console.log("🏗️  Verifica e creazione tabelle...\n");
    await new Promise((resolve, reject) => {
      initDatabase();
      // Aspetto un attimo per essere sicuro che le tabelle siano create
      setTimeout(resolve, 1000);
    });
    console.log("✅ Tabelle verificate!\n");

    // 1. CREAZIONE UTENTI
    console.log("👤 Creazione utenti...");
    const users = [
      { username: "Admin", password: "Admin123!" },
      { username: "Mario", password: "Mario123!" },
      { username: "Lucia", password: "Lucia123!" },
      { username: "Giovanni", password: "Giovanni123!" },
      { username: "Sara", password: "Sara123!" },
      { username: "Roberto", password: "Roberto123!" },
      { username: "Chiara", password: "Chiara123!" },
      { username: "Marco", password: "Marco123!" },
    ];

    for (const user of users) {
      const existing = await getQuery(
        "SELECT id FROM users WHERE username = ?",
        [user.username]
      );

      if (!existing) {
        const hashedPassword = await bcrypt.hash(user.password, 10);
        const createdAt = new Date().toISOString();
        await runQuery(
          "INSERT INTO users (username, password, createdat) VALUES (?, ?, ?)",
          [user.username, hashedPassword, createdAt]
        );
        console.log(
          `  ✅ Utente creato: ${user.username} (password: ${user.password})`
        );
      } else {
        console.log(`  ⏭️  Utente già esistente: ${user.username}`);
      }
    }

    // 2. CREAZIONE MARCHE
    console.log("\n🏷️  Creazione marche...");
    const marche = [
      "Samsung",
      "Apple",
      "LG",
      "Sony",
      "Philips",
      "Bosch",
      "Whirlpool",
      "Electrolux",
      "HP",
      "Dell",
      "Asus",
      "Lenovo",
      "Canon",
      "Nikon",
      "JBL",
      "Bose",
      "Dyson",
      "Xiaomi",
    ];

    const marcheIds = {};
    for (const marca of marche) {
      const existing = await getQuery("SELECT id FROM marche WHERE nome = ?", [
        marca,
      ]);

      if (!existing) {
        const dataCreazione = new Date().toISOString();
        const result = await runQuery(
          "INSERT INTO marche (nome, data_creazione) VALUES (?, ?)",
          [marca, dataCreazione]
        );
        marcheIds[marca] = result.lastID;
        console.log(`  ✅ Marca creata: ${marca}`);
      } else {
        marcheIds[marca] = existing.id;
        console.log(`  ⏭️  Marca già esistente: ${marca}`);
      }
    }

    // 3. CREAZIONE PRODOTTI
    console.log("\n📦 Creazione prodotti...");
    const prodotti = [
      {
        nome: 'TV LED 55"',
        marca: "Samsung",
        descrizione: "Smart TV 4K UHD con HDR",
      },
      { nome: "iPhone 15", marca: "Apple", descrizione: "Smartphone 128GB" },
      {
        nome: "Frigorifero 350L",
        marca: "LG",
        descrizione: "Frigorifero combinato No Frost",
      },
      {
        nome: "Cuffie Wireless",
        marca: "Sony",
        descrizione: "Cuffie Bluetooth con noise cancelling",
      },
      {
        nome: "Lavatrice 8kg",
        marca: "Bosch",
        descrizione: "Lavatrice a carica frontale A+++",
      },
      {
        nome: "Microonde 25L",
        marca: "Whirlpool",
        descrizione: "Forno a microonde con grill",
      },
      {
        nome: "Aspirapolvere Robot",
        marca: "Philips",
        descrizione: "Robot aspirapolvere con mappatura",
      },
      {
        nome: "Asciugatrice 9kg",
        marca: "Electrolux",
        descrizione: "Asciugatrice a pompa di calore",
      },
      {
        nome: "Soundbar",
        marca: "Samsung",
        descrizione: "Soundbar 2.1 con subwoofer wireless",
      },
      {
        nome: "MacBook Air",
        marca: "Apple",
        descrizione: 'Laptop 13" M2 256GB',
      },
      { nome: 'Monitor 27"', marca: "Dell", descrizione: "Monitor 4K IPS" },
      {
        nome: "Stampante Laser",
        marca: "HP",
        descrizione: "Stampante laser a colori WiFi",
      },
      {
        nome: "Mouse Wireless",
        marca: "Logitech",
        descrizione: "Mouse ergonomico wireless",
      },
      {
        nome: "Tastiera Meccanica",
        marca: "Asus",
        descrizione: "Tastiera gaming RGB",
      },
      {
        nome: "Webcam HD",
        marca: "Logitech",
        descrizione: "Webcam 1080p con microfono",
      },
      { nome: "SSD 1TB", marca: "Samsung", descrizione: "SSD NVMe M.2" },
      {
        nome: "Router WiFi 6",
        marca: "Asus",
        descrizione: "Router dual band WiFi 6",
      },
      {
        nome: 'Tablet 10"',
        marca: "Samsung",
        descrizione: "Tablet Android 64GB",
      },
      {
        nome: "Smart Watch",
        marca: "Apple",
        descrizione: "Apple Watch Series 9",
      },
      {
        nome: "Fotocamera Mirrorless",
        marca: "Canon",
        descrizione: "Fotocamera 24MP con kit 18-55mm",
      },
      {
        nome: "Obiettivo 50mm",
        marca: "Nikon",
        descrizione: "Obiettivo f/1.8 full frame",
      },
      {
        nome: "Speaker Bluetooth",
        marca: "JBL",
        descrizione: "Cassa portatile waterproof",
      },
      {
        nome: "Cuffie Gaming",
        marca: "Razer",
        descrizione: "Cuffie gaming 7.1 surround",
      },
      {
        nome: "Laptop Gaming",
        marca: "Lenovo",
        descrizione: "Gaming laptop RTX 4060 16GB RAM",
      },
      {
        nome: "Forno Elettrico",
        marca: "Bosch",
        descrizione: "Forno ventilato 65L",
      },
      {
        nome: "Piano Cottura",
        marca: "Electrolux",
        descrizione: "Piano cottura a induzione 4 zone",
      },
      {
        nome: "Lavastoviglie",
        marca: "Whirlpool",
        descrizione: "Lavastoviglie 14 coperti A++",
      },
      {
        nome: "Condizionatore 12000",
        marca: "LG",
        descrizione: "Climatizzatore inverter",
      },
      {
        nome: "Scopa Elettrica",
        marca: "Dyson",
        descrizione: "Aspirapolvere senza fili V15",
      },
      {
        nome: "Purificatore Aria",
        marca: "Xiaomi",
        descrizione: "Purificatore d'aria HEPA",
      },
    ];

    const prodottiIds = {};
    for (const prodotto of prodotti) {
      const existing = await getQuery(
        "SELECT id FROM prodotti WHERE nome = ?",
        [prodotto.nome]
      );

      if (!existing) {
        const dataCreazione = new Date().toISOString();
        const result = await runQuery(
          "INSERT INTO prodotti (nome, marca_id, descrizione, data_creazione) VALUES (?, ?, ?, ?)",
          [
            prodotto.nome,
            marcheIds[prodotto.marca],
            prodotto.descrizione,
            dataCreazione,
          ]
        );
        prodottiIds[prodotto.nome] = result.lastID;
        console.log(
          `  ✅ Prodotto creato: ${prodotto.nome} (${prodotto.marca})`
        );
      } else {
        prodottiIds[prodotto.nome] = existing.id;
        console.log(`  ⏭️  Prodotto già esistente: ${prodotto.nome}`);
      }
    }

    // 4. CREAZIONE MOVIMENTI DI CARICO E LOTTI
    console.log("\n📥 Creazione carichi e lotti...");
    const oggi = new Date();
    const getDataPassata = (giorniIndietro) => {
      const data = new Date(oggi);
      data.setDate(data.getDate() - giorniIndietro);
      return data.toISOString().split("T")[0];
    };

    const carichi = [
      // TV e Monitor
      {
        prodotto: 'TV LED 55"',
        quantita: 20,
        prezzo: 450.0,
        fornitore: "Fornitore Tech SRL",
        fattura: "FT-2024-001",
        dataMovimento: getDataPassata(90),
      },
      {
        prodotto: 'TV LED 55"',
        quantita: 15,
        prezzo: 455.0,
        fornitore: "Fornitore Tech SRL",
        fattura: "FT-2024-035",
        dataMovimento: getDataPassata(45),
      },
      {
        prodotto: 'Monitor 27"',
        quantita: 25,
        prezzo: 280.0,
        fornitore: "Dell Italia",
        fattura: "FT-2024-020",
        dataMovimento: getDataPassata(60),
      },
      {
        prodotto: 'Monitor 27"',
        quantita: 20,
        prezzo: 275.0,
        fornitore: "Dell Italia",
        fattura: "FT-2024-045",
        dataMovimento: getDataPassata(25),
      },

      // Smartphone e Tablet
      {
        prodotto: "iPhone 15",
        quantita: 30,
        prezzo: 800.0,
        fornitore: "Apple Distributor",
        fattura: "FT-2024-002",
        dataMovimento: getDataPassata(85),
      },
      {
        prodotto: "iPhone 15",
        quantita: 25,
        prezzo: 790.0,
        fornitore: "Apple Distributor",
        fattura: "FT-2024-040",
        dataMovimento: getDataPassata(35),
      },
      {
        prodotto: 'Tablet 10"',
        quantita: 40,
        prezzo: 250.0,
        fornitore: "Samsung Italia",
        fattura: "FT-2024-018",
        dataMovimento: getDataPassata(55),
      },
      {
        prodotto: "Smart Watch",
        quantita: 35,
        prezzo: 380.0,
        fornitore: "Apple Distributor",
        fattura: "FT-2024-025",
        dataMovimento: getDataPassata(50),
      },

      // Elettrodomestici grandi
      {
        prodotto: "Frigorifero 350L",
        quantita: 15,
        prezzo: 550.0,
        fornitore: "Elettrodomestici Italia",
        fattura: "FT-2024-003",
        dataMovimento: getDataPassata(80),
      },
      {
        prodotto: "Lavatrice 8kg",
        quantita: 12,
        prezzo: 400.0,
        fornitore: "Bosch Italia",
        fattura: "FT-2024-005",
        dataMovimento: getDataPassata(75),
      },
      {
        prodotto: "Lavatrice 8kg",
        quantita: 10,
        prezzo: 395.0,
        fornitore: "Bosch Italia",
        fattura: "FT-2024-038",
        dataMovimento: getDataPassata(40),
      },
      {
        prodotto: "Asciugatrice 9kg",
        quantita: 10,
        prezzo: 600.0,
        fornitore: "Electrolux Distributor",
        fattura: "FT-2024-008",
        dataMovimento: getDataPassata(70),
      },
      {
        prodotto: "Lavastoviglie",
        quantita: 14,
        prezzo: 480.0,
        fornitore: "Whirlpool SPA",
        fattura: "FT-2024-027",
        dataMovimento: getDataPassata(65),
      },
      {
        prodotto: "Condizionatore 12000",
        quantita: 18,
        prezzo: 520.0,
        fornitore: "LG Italia",
        fattura: "FT-2024-030",
        dataMovimento: getDataPassata(60),
      },
      {
        prodotto: "Forno Elettrico",
        quantita: 12,
        prezzo: 380.0,
        fornitore: "Bosch Italia",
        fattura: "FT-2024-032",
        dataMovimento: getDataPassata(55),
      },
      {
        prodotto: "Piano Cottura",
        quantita: 10,
        prezzo: 420.0,
        fornitore: "Electrolux Distributor",
        fattura: "FT-2024-033",
        dataMovimento: getDataPassata(50),
      },

      // Elettrodomestici piccoli
      {
        prodotto: "Microonde 25L",
        quantita: 25,
        prezzo: 150.0,
        fornitore: "Whirlpool SPA",
        fattura: "FT-2024-006",
        dataMovimento: getDataPassata(72),
      },
      {
        prodotto: "Microonde 25L",
        quantita: 20,
        prezzo: 145.0,
        fornitore: "Whirlpool SPA",
        fattura: "FT-2024-042",
        dataMovimento: getDataPassata(30),
      },
      {
        prodotto: "Aspirapolvere Robot",
        quantita: 18,
        prezzo: 350.0,
        fornitore: "Home Tech",
        fattura: "FT-2024-007",
        dataMovimento: getDataPassata(68),
      },
      {
        prodotto: "Scopa Elettrica",
        quantita: 22,
        prezzo: 450.0,
        fornitore: "Dyson Italia",
        fattura: "FT-2024-029",
        dataMovimento: getDataPassata(48),
      },
      {
        prodotto: "Purificatore Aria",
        quantita: 30,
        prezzo: 180.0,
        fornitore: "Xiaomi Store",
        fattura: "FT-2024-034",
        dataMovimento: getDataPassata(42),
      },

      // Audio
      {
        prodotto: "Cuffie Wireless",
        quantita: 50,
        prezzo: 120.0,
        fornitore: "Audio Tech",
        fattura: "FT-2024-004",
        dataMovimento: getDataPassata(78),
      },
      {
        prodotto: "Cuffie Wireless",
        quantita: 40,
        prezzo: 115.0,
        fornitore: "Audio Tech",
        fattura: "FT-2024-044",
        dataMovimento: getDataPassata(28),
      },
      {
        prodotto: "Soundbar",
        quantita: 22,
        prezzo: 200.0,
        fornitore: "Samsung Italia",
        fattura: "FT-2024-009",
        dataMovimento: getDataPassata(65),
      },
      {
        prodotto: "Speaker Bluetooth",
        quantita: 45,
        prezzo: 80.0,
        fornitore: "JBL Italia",
        fattura: "FT-2024-022",
        dataMovimento: getDataPassata(52),
      },
      {
        prodotto: "Cuffie Gaming",
        quantita: 35,
        prezzo: 95.0,
        fornitore: "Gaming Store",
        fattura: "FT-2024-024",
        dataMovimento: getDataPassata(46),
      },

      // Computer e Accessori
      {
        prodotto: "MacBook Air",
        quantita: 15,
        prezzo: 1100.0,
        fornitore: "Apple Distributor",
        fattura: "FT-2024-010",
        dataMovimento: getDataPassata(62),
      },
      {
        prodotto: "Laptop Gaming",
        quantita: 12,
        prezzo: 1350.0,
        fornitore: "Lenovo Italia",
        fattura: "FT-2024-023",
        dataMovimento: getDataPassata(50),
      },
      {
        prodotto: "Stampante Laser",
        quantita: 20,
        prezzo: 220.0,
        fornitore: "HP Italia",
        fattura: "FT-2024-012",
        dataMovimento: getDataPassata(58),
      },
      {
        prodotto: "Mouse Wireless",
        quantita: 60,
        prezzo: 35.0,
        fornitore: "Tech Accessories",
        fattura: "FT-2024-013",
        dataMovimento: getDataPassata(56),
      },
      {
        prodotto: "Mouse Wireless",
        quantita: 50,
        prezzo: 32.0,
        fornitore: "Tech Accessories",
        fattura: "FT-2024-046",
        dataMovimento: getDataPassata(22),
      },
      {
        prodotto: "Tastiera Meccanica",
        quantita: 45,
        prezzo: 85.0,
        fornitore: "Gaming Store",
        fattura: "FT-2024-014",
        dataMovimento: getDataPassata(54),
      },
      {
        prodotto: "Webcam HD",
        quantita: 35,
        prezzo: 65.0,
        fornitore: "Tech Accessories",
        fattura: "FT-2024-015",
        dataMovimento: getDataPassata(52),
      },
      {
        prodotto: "SSD 1TB",
        quantita: 50,
        prezzo: 95.0,
        fornitore: "Samsung Italia",
        fattura: "FT-2024-016",
        dataMovimento: getDataPassata(50),
      },
      {
        prodotto: "SSD 1TB",
        quantita: 40,
        prezzo: 90.0,
        fornitore: "Samsung Italia",
        fattura: "FT-2024-048",
        dataMovimento: getDataPassata(18),
      },
      {
        prodotto: "Router WiFi 6",
        quantita: 28,
        prezzo: 120.0,
        fornitore: "Asus Italia",
        fattura: "FT-2024-017",
        dataMovimento: getDataPassata(48),
      },

      // Fotografia
      {
        prodotto: "Fotocamera Mirrorless",
        quantita: 10,
        prezzo: 850.0,
        fornitore: "Canon Italia",
        fattura: "FT-2024-019",
        dataMovimento: getDataPassata(44),
      },
      {
        prodotto: "Obiettivo 50mm",
        quantita: 15,
        prezzo: 320.0,
        fornitore: "Nikon Italia",
        fattura: "FT-2024-021",
        dataMovimento: getDataPassata(40),
      },

      // Riordini recenti
      {
        prodotto: "iPhone 15",
        quantita: 20,
        prezzo: 795.0,
        fornitore: "Apple Distributor",
        fattura: "FT-2024-050",
        dataMovimento: getDataPassata(15),
      },
      {
        prodotto: "Cuffie Wireless",
        quantita: 30,
        prezzo: 118.0,
        fornitore: "Audio Tech",
        fattura: "FT-2024-051",
        dataMovimento: getDataPassata(12),
      },
      {
        prodotto: 'Monitor 27"',
        quantita: 18,
        prezzo: 270.0,
        fornitore: "Dell Italia",
        fattura: "FT-2024-052",
        dataMovimento: getDataPassata(10),
      },
      {
        prodotto: "Aspirapolvere Robot",
        quantita: 15,
        prezzo: 345.0,
        fornitore: "Home Tech",
        fattura: "FT-2024-053",
        dataMovimento: getDataPassata(8),
      },
      {
        prodotto: "Soundbar",
        quantita: 18,
        prezzo: 195.0,
        fornitore: "Samsung Italia",
        fattura: "FT-2024-054",
        dataMovimento: getDataPassata(5),
      },
      {
        prodotto: 'Tablet 10"',
        quantita: 25,
        prezzo: 245.0,
        fornitore: "Samsung Italia",
        fattura: "FT-2024-055",
        dataMovimento: getDataPassata(3),
      },
    ];

    for (const carico of carichi) {
      const dataRegistrazione = new Date().toISOString();
      const prezzoTotale = carico.quantita * carico.prezzo;

      // Inserisci movimento di carico
      const movimentoResult = await runQuery(
        `INSERT INTO dati (prodotto_id, tipo, quantita, prezzo, prezzo_totale_movimento, 
         data_movimento, data_registrazione, fattura_doc, fornitore_cliente_id) 
         VALUES (?, 'carico', ?, ?, ?, ?, ?, ?, ?)`,
        [
          prodottiIds[carico.prodotto],
          carico.quantita,
          carico.prezzo,
          prezzoTotale,
          carico.dataMovimento,
          dataRegistrazione,
          carico.fattura,
          carico.fornitore,
        ]
      );

      // Inserisci lotto corrispondente
      await runQuery(
        `INSERT INTO lotti (prodotto_id, quantita_iniziale, quantita_rimanente, 
         prezzo, data_carico, data_registrazione, fattura_doc, fornitore, dati_id) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          prodottiIds[carico.prodotto],
          carico.quantita,
          carico.quantita,
          carico.prezzo,
          carico.dataMovimento,
          dataRegistrazione,
          carico.fattura,
          carico.fornitore,
          movimentoResult.lastID,
        ]
      );

      console.log(
        `  ✅ Carico: ${carico.quantita}x ${carico.prodotto} @ €${carico.prezzo}`
      );
    }

    // 5. CREAZIONE MOVIMENTI DI SCARICO
    console.log("\n📤 Creazione scarichi...");
    const scarichi = [
      // Scarichi recenti e progressivi
      {
        prodotto: 'TV LED 55"',
        quantita: 5,
        cliente: "Cliente Retail 001",
        fattura: "FS-2024-001",
        dataMovimento: getDataPassata(30),
      },
      {
        prodotto: 'TV LED 55"',
        quantita: 8,
        cliente: "Cliente Online 015",
        fattura: "FS-2024-025",
        dataMovimento: getDataPassata(15),
      },
      {
        prodotto: 'TV LED 55"',
        quantita: 6,
        cliente: "Cliente Business 003",
        fattura: "FS-2024-040",
        dataMovimento: getDataPassata(2),
      },

      {
        prodotto: "iPhone 15",
        quantita: 10,
        cliente: "Cliente Retail 002",
        fattura: "FS-2024-002",
        dataMovimento: getDataPassata(28),
      },
      {
        prodotto: "iPhone 15",
        quantita: 12,
        cliente: "Cliente Online 008",
        fattura: "FS-2024-018",
        dataMovimento: getDataPassata(18),
      },
      {
        prodotto: "iPhone 15",
        quantita: 15,
        cliente: "Cliente Business 001",
        fattura: "FS-2024-035",
        dataMovimento: getDataPassata(8),
      },
      {
        prodotto: "iPhone 15",
        quantita: 8,
        cliente: "Cliente Retail 020",
        fattura: "FS-2024-042",
        dataMovimento: getDataPassata(1),
      },

      {
        prodotto: "Cuffie Wireless",
        quantita: 15,
        cliente: "Cliente Retail 003",
        fattura: "FS-2024-003",
        dataMovimento: getDataPassata(27),
      },
      {
        prodotto: "Cuffie Wireless",
        quantita: 20,
        cliente: "Cliente Online 005",
        fattura: "FS-2024-015",
        dataMovimento: getDataPassata(20),
      },
      {
        prodotto: "Cuffie Wireless",
        quantita: 18,
        cliente: "Cliente Business 002",
        fattura: "FS-2024-030",
        dataMovimento: getDataPassata(12),
      },
      {
        prodotto: "Cuffie Wireless",
        quantita: 12,
        cliente: "Cliente Online 018",
        fattura: "FS-2024-044",
        dataMovimento: oggi.toISOString().split("T")[0],
      },

      {
        prodotto: 'Monitor 27"',
        quantita: 10,
        cliente: "Cliente Business 004",
        fattura: "FS-2024-008",
        dataMovimento: getDataPassata(25),
      },
      {
        prodotto: 'Monitor 27"',
        quantita: 8,
        cliente: "Cliente Online 012",
        fattura: "FS-2024-022",
        dataMovimento: getDataPassata(16),
      },
      {
        prodotto: 'Monitor 27"',
        quantita: 12,
        cliente: "Cliente Retail 015",
        fattura: "FS-2024-038",
        dataMovimento: getDataPassata(4),
      },

      {
        prodotto: "Microonde 25L",
        quantita: 8,
        cliente: "Cliente Retail 004",
        fattura: "FS-2024-004",
        dataMovimento: getDataPassata(26),
      },
      {
        prodotto: "Microonde 25L",
        quantita: 10,
        cliente: "Cliente Online 009",
        fattura: "FS-2024-020",
        dataMovimento: getDataPassata(14),
      },
      {
        prodotto: "Microonde 25L",
        quantita: 7,
        cliente: "Cliente Retail 018",
        fattura: "FS-2024-041",
        dataMovimento: getDataPassata(3),
      },

      {
        prodotto: "Soundbar",
        quantita: 7,
        cliente: "Cliente Retail 005",
        fattura: "FS-2024-005",
        dataMovimento: getDataPassata(24),
      },
      {
        prodotto: "Soundbar",
        quantita: 9,
        cliente: "Cliente Online 011",
        fattura: "FS-2024-023",
        dataMovimento: getDataPassata(13),
      },
      {
        prodotto: "Soundbar",
        quantita: 6,
        cliente: "Cliente Retail 019",
        fattura: "FS-2024-045",
        dataMovimento: oggi.toISOString().split("T")[0],
      },

      {
        prodotto: "Lavatrice 8kg",
        quantita: 5,
        cliente: "Cliente Retail 006",
        fattura: "FS-2024-006",
        dataMovimento: getDataPassata(23),
      },
      {
        prodotto: "Lavatrice 8kg",
        quantita: 4,
        cliente: "Cliente Online 014",
        fattura: "FS-2024-028",
        dataMovimento: getDataPassata(10),
      },

      {
        prodotto: "Mouse Wireless",
        quantita: 25,
        cliente: "Cliente Business 005",
        fattura: "FS-2024-009",
        dataMovimento: getDataPassata(22),
      },
      {
        prodotto: "Mouse Wireless",
        quantita: 20,
        cliente: "Cliente Online 016",
        fattura: "FS-2024-032",
        dataMovimento: getDataPassata(11),
      },
      {
        prodotto: "Mouse Wireless",
        quantita: 18,
        cliente: "Cliente Retail 021",
        fattura: "FS-2024-043",
        dataMovimento: getDataPassata(2),
      },

      {
        prodotto: "Tastiera Meccanica",
        quantita: 15,
        cliente: "Cliente Online 006",
        fattura: "FS-2024-012",
        dataMovimento: getDataPassata(21),
      },
      {
        prodotto: "Tastiera Meccanica",
        quantita: 12,
        cliente: "Cliente Business 006",
        fattura: "FS-2024-027",
        dataMovimento: getDataPassata(9),
      },

      {
        prodotto: "SSD 1TB",
        quantita: 20,
        cliente: "Cliente Online 007",
        fattura: "FS-2024-013",
        dataMovimento: getDataPassata(19),
      },
      {
        prodotto: "SSD 1TB",
        quantita: 18,
        cliente: "Cliente Business 007",
        fattura: "FS-2024-033",
        dataMovimento: getDataPassata(7),
      },

      {
        prodotto: 'Tablet 10"',
        quantita: 12,
        cliente: "Cliente Retail 010",
        fattura: "FS-2024-016",
        dataMovimento: getDataPassata(17),
      },
      {
        prodotto: 'Tablet 10"',
        quantita: 15,
        cliente: "Cliente Online 017",
        fattura: "FS-2024-036",
        dataMovimento: getDataPassata(5),
      },

      {
        prodotto: "Speaker Bluetooth",
        quantita: 18,
        cliente: "Cliente Online 010",
        fattura: "FS-2024-019",
        dataMovimento: getDataPassata(15),
      },
      {
        prodotto: "Speaker Bluetooth",
        quantita: 14,
        cliente: "Cliente Retail 016",
        fattura: "FS-2024-037",
        dataMovimento: getDataPassata(6),
      },

      {
        prodotto: "Aspirapolvere Robot",
        quantita: 6,
        cliente: "Cliente Retail 011",
        fattura: "FS-2024-021",
        dataMovimento: getDataPassata(14),
      },
      {
        prodotto: "Aspirapolvere Robot",
        quantita: 8,
        cliente: "Cliente Online 019",
        fattura: "FS-2024-039",
        dataMovimento: getDataPassata(3),
      },

      {
        prodotto: "Smart Watch",
        quantita: 10,
        cliente: "Cliente Online 013",
        fattura: "FS-2024-024",
        dataMovimento: getDataPassata(12),
      },
      {
        prodotto: "Smart Watch",
        quantita: 12,
        cliente: "Cliente Retail 017",
        fattura: "FS-2024-034",
        dataMovimento: getDataPassata(5),
      },

      {
        prodotto: "Router WiFi 6",
        quantita: 8,
        cliente: "Cliente Business 008",
        fattura: "FS-2024-026",
        dataMovimento: getDataPassata(10),
      },

      {
        prodotto: "Webcam HD",
        quantita: 12,
        cliente: "Cliente Business 009",
        fattura: "FS-2024-029",
        dataMovimento: getDataPassata(9),
      },

      {
        prodotto: "Purificatore Aria",
        quantita: 10,
        cliente: "Cliente Retail 012",
        fattura: "FS-2024-031",
        dataMovimento: getDataPassata(8),
      },

      {
        prodotto: "MacBook Air",
        quantita: 5,
        cliente: "Cliente Business 010",
        fattura: "FS-2024-007",
        dataMovimento: getDataPassata(20),
      },
      {
        prodotto: "MacBook Air",
        quantita: 4,
        cliente: "Cliente Online 020",
        fattura: "FS-2024-014",
        dataMovimento: getDataPassata(6),
      },

      {
        prodotto: "Frigorifero 350L",
        quantita: 6,
        cliente: "Cliente Retail 013",
        fattura: "FS-2024-010",
        dataMovimento: getDataPassata(18),
      },

      {
        prodotto: "Lavastoviglie",
        quantita: 5,
        cliente: "Cliente Retail 014",
        fattura: "FS-2024-011",
        dataMovimento: getDataPassata(16),
      },

      {
        prodotto: "Condizionatore 12000",
        quantita: 7,
        cliente: "Cliente Retail 007",
        fattura: "FS-2024-017",
        dataMovimento: getDataPassata(11),
      },
    ];

    for (const scarico of scarichi) {
      const dataRegistrazione = new Date().toISOString();

      // Prendi il lotto FIFO per calcolare il prezzo
      const lotto = await getQuery(
        `SELECT prezzo FROM lotti 
         WHERE prodotto_id = ? AND quantita_rimanente > 0 
         ORDER BY data_carico ASC LIMIT 1`,
        [prodottiIds[scarico.prodotto]]
      );

      const prezzo = lotto ? lotto.prezzo : 0;
      const prezzoTotale = scarico.quantita * prezzo;

      // Inserisci movimento di scarico
      await runQuery(
        `INSERT INTO dati (prodotto_id, tipo, quantita, prezzo, prezzo_totale_movimento, 
         data_movimento, data_registrazione, fattura_doc, fornitore_cliente_id) 
         VALUES (?, 'scarico', ?, ?, ?, ?, ?, ?, ?)`,
        [
          prodottiIds[scarico.prodotto],
          scarico.quantita,
          prezzo,
          prezzoTotale,
          scarico.dataMovimento,
          dataRegistrazione,
          scarico.fattura,
          scarico.cliente,
        ]
      );

      // Aggiorna i lotti (FIFO)
      let quantitaDaScaricare = scarico.quantita;
      while (quantitaDaScaricare > 0) {
        const lottoFifo = await getQuery(
          `SELECT id, quantita_rimanente FROM lotti 
           WHERE prodotto_id = ? AND quantita_rimanente > 0 
           ORDER BY data_carico ASC LIMIT 1`,
          [prodottiIds[scarico.prodotto]]
        );

        if (!lottoFifo) break;

        const quantitaDaPrelevare = Math.min(
          quantitaDaScaricare,
          lottoFifo.quantita_rimanente
        );
        const nuovaQuantita =
          lottoFifo.quantita_rimanente - quantitaDaPrelevare;

        await runQuery("UPDATE lotti SET quantita_rimanente = ? WHERE id = ?", [
          nuovaQuantita,
          lottoFifo.id,
        ]);

        quantitaDaScaricare -= quantitaDaPrelevare;
      }

      console.log(
        `  ✅ Scarico: ${scarico.quantita}x ${scarico.prodotto} @ €${prezzo}`
      );
    }

    console.log("\n✅ Database popolato con successo!");
    console.log("\n📊 Riepilogo:");
    console.log(`   • ${users.length} utenti`);
    console.log(`   • ${marche.length} marche`);
    console.log(`   • ${prodotti.length} prodotti`);
    console.log(`   • ${carichi.length} carichi`);
    console.log(`   • ${scarichi.length} scarichi`);
    console.log(`   • Total movimenti: ${carichi.length + scarichi.length}`);
  } catch (error) {
    console.error("❌ Errore durante il popolamento:", error);
  } finally {
    db.close(() => {
      console.log("\n🔒 Connessione al database chiusa.");
    });
  }
}

// Esegui il seeding
seedDatabase();
