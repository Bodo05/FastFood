const express = require('express');
const cors = require('cors');
const { MongoClient, ObjectId } = require('mongodb');
const axios = require('axios');
const fs = require('fs'); //utilizzato per la lettura dei file
const swaggerUi = require('swagger-ui-express');
const swaggerFile = require('./swagger_output.json');

const app = express();
app.use('/doc-swagger', swaggerUi.serve, swaggerUi.setup(swaggerFile));
const port = 3000;
const mongoURL = "mongodb+srv://admin:admin@cluster0.fczult8.mongodb.net/";
const dbName = "fastfood";

app.use(cors());
app.use(express.json());

const client = new MongoClient(mongoURL);
let db;

//converte stringa in ID MongoDB
const toObjectId = (id) => {
    try {
        return new ObjectId(id);
    } catch (error) {
        return null;
    }
};

//conversione indirizzo in formato testuale in coordinate (longitudine e latitudine)
async function getCoordinates(address) {
    if (!address) return null;
    try {
        const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}`;
        const res = await axios.get(url, { headers: { 'User-Agent': 'FastFoodProject/1.0' } });
        
        if (res.data && res.data.length > 0) {
            return { 
                lat: parseFloat(res.data[0].lat),   //da stringhe a numeri decimali
                lon: parseFloat(res.data[0].lon) 
            };
        }
    } catch (e) {
        console.error("Errore Geocoding:", e.message);
    }
    return null;
}

// calcola distanza in km
function calcolaDistanza(lat1, lon1, lat2, lon2) {
    const R = 6371; 
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLon/2) * Math.sin(dLon/2);
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}


// ==========================================
//             AVVIO SERVER
// ==========================================

async function startServer() {
    try {
        await client.connect();
        db = client.db(dbName);
        console.log(`Connesso al database: ${dbName}`);

        // controllo se il catalogo è vuoto per caricare i dati
        const catalogCollection = db.collection('catalog');
        const count = await catalogCollection.countDocuments();

        if (count === 0 && fs.existsSync('meals1.json')) {
            console.log("Caricamento dati iniziali...");
            const data = fs.readFileSync('meals1.json', 'utf8');
            const jsonData = JSON.parse(data);
            
            // gestione del formato JSON
            let piattiDaInserire;
            if (Array.isArray(jsonData)) {
                piattiDaInserire = jsonData;
            } else {
                piattiDaInserire = jsonData.meals || [];
            }

            // piatti puliti contiene la trasformazione id da stringa $oid del json a un odbjectId 
            const piattiPuliti = piattiDaInserire.map(p => {
                const nuovoPiatto = { ...p };
                if (nuovoPiatto._id && nuovoPiatto._id.$oid) {
                    nuovoPiatto._id = new ObjectId(nuovoPiatto._id.$oid);
                }
                return nuovoPiatto;
            });

            //inserimento nella collection catalog del database
            if (piattiPuliti.length > 0) {
                await catalogCollection.insertMany(piattiPuliti);
                console.log(`Inseriti ${piattiPuliti.length} piatti nella collection 'catalog'.`);
            }
        }

        // ascolto sulla porta specificata all'inzio del file dopo aver inizializzato il client
        app.listen(port, () => {
            console.log(`Server avviato su http://localhost:${port}`);
        });

    } catch (err) {
        console.error("Errore di connessione:", err);
    }
}
startServer();


// ==========================================
//                 CLIENTI
// ==========================================


app.post("/cliente", async (req, res) => {
    // #swagger.description = "Registrazione utente con i seguenti parametri: nome, cognome, email, password, preferenze e data registrazione"
    const nome = req.body.nome;
    const cognome = req.body.cognome;
    const email = req.body.email;
    const password = req.body.password;
    const preferenze = req.body.preferenze || [];

    if (!email || !password) {
        return res.status(400).json({ message: "Dati mancanti" });
    }

    try {
        const esiste = await db.collection('clienti').findOne({ email: email });
        if (esiste) {
            return res.status(409).json({ message: "Email già registrata" });
        }

        const nuovoCliente = {
            nome: nome,
            cognome: cognome,
            email: email,
            password: password,
            preferenze: preferenze,
            createdAt: new Date()
        };

        const result = await db.collection('clienti').insertOne(nuovoCliente);
        res.json({ _id: result.insertedId });

    } catch (error) {
        res.status(500).json({ message: "Errore server" });
    }
});

app.get("/cliente/:id", async (req, res) => {
    // #swagger.description = "Recupera dal database le informazioni di un cliente in base al suo id"
    const id = req.params.id;
    try {
        const user = await db.collection('clienti').findOne({ _id: toObjectId(id) });
        if (user) {
            res.json(user);
        } else {
            res.status(404).json({});
        }
    } catch (error) {
        res.status(500).json({ message: "Errore" });
    }
});

app.put("/cliente/:id", async (req, res) => {
    const id = req.params.id;
    // #swagger.description = "Aggiorna i dati di un cliente in base al suo id"
    try {
        await db.collection('clienti').updateOne(
            { _id: toObjectId(id) }, 
            { $set: req.body }
        );
        res.json({ message: "Aggiornato" });
    } catch (error) {
        res.status(500).json({ message: "Errore" });
    }
});

app.delete("/cliente/:id", async (req, res) => {
    // #swagger.description = "Cancellazione del cliente dal database utilizzando il suo id"
    const id = req.params.id;
    try {
        await db.collection('clienti').deleteOne({ _id: toObjectId(id) });
        res.json({ message: "Eliminato" });
    } catch (error) {
        res.status(500).json({ message: "Errore" });
    }
});


// ==========================================
//                RISTORATORI
// ==========================================

app.post("/ristoratore", async (req, res) => {
    // #swagger.description = "Registrazione ristoratore inserendo i seguenti parametri: nomeRistorante, email, password, indirizzo, p. iva, latitudine, longitudine, piatti e data registrazione"
    const nomeRistorante = req.body.nomeRistorante;
    const email = req.body.email;
    const password = req.body.password;
    const indirizzo = req.body.indirizzo;
    const piattiMenu = req.body.piatti;

    if (!email || !password || !nomeRistorante) {
        return res.status(400).json({ message: "Dati mancanti" });
    }

    try {
        const esiste = await db.collection('ristoratori').findOne({ email: email });
        if (esiste) {
            return res.status(409).json({ message: "Email già in uso" });
        }
         
        //uso funzione per passare da indirizzo testuale a coordinate lat e lon
        const coords = await getCoordinates(indirizzo);
        
        const nuovoRistoratore = {
            nomeRistorante: nomeRistorante,
            email: email,
            password: password,
            indirizzo: indirizzo,
            piva: req.body.piva,
            telefono: req.body.telefono,
            lat: coords ? coords.lat : null,
            lon: coords ? coords.lon : null,
            piatti: [],
            createdAt: new Date()
        };

        const result = await db.collection('ristoratori').insertOne(nuovoRistoratore);
        const rId = result.insertedId;

        // Se ci sono piatti iniziali, li salviamo nella collection 'piatti'
        if (piattiMenu && piattiMenu.length > 0) {
            const piattiDaSalvare = [];
            for(let i=0; i<piattiMenu.length; i++) {
                let p = piattiMenu[i];
                p.ristoranteId = rId;
                p.ristoranteNome = nomeRistorante;
                p.indirizzoRistorante = indirizzo;
                p.createdAt = new Date();
                piattiDaSalvare.push(p);
            }

            await db.collection('piatti').insertMany(piattiDaSalvare);
            await db.collection('ristoratori').updateOne(
                { _id: rId }, 
                { $set: { piatti: piattiDaSalvare } }
            );
        }

        res.json({ _id: rId });

    } catch (error) {
        res.status(500).json({ message: "Errore registrazione" });
    }
});

app.get("/ristoratore/:id", async (req, res) => {
    // #swagger.description = "Recupera dal database le informazioni del ristoratore secondo il suo id"
    const id = req.params.id;
    try {
        const r = await db.collection('ristoratori').findOne({ _id: toObjectId(id) });
        if (r) {
            delete r.password;
            res.json(r);
        } else {
            res.json({});
        }
    } catch (error) {
        res.status(500).json({ message: "Errore" });
    }
});

app.put("/ristoratore/:id", async (req, res) => {
    // #swagger.description = "Aggiorna i dati del ristorante (nome, indirizzo, piva, ecc)."
    
    const id = req.params.id;
    try {
        await db.collection('ristoratori').updateOne(
            { _id: toObjectId(id) }, 
            { $set: req.body }
        );
        res.json({ message: "Dati aggiornati con successo" });
    } catch (error) {
        res.status(500).json({ message: "Errore aggiornamento" });
    }
});

app.delete("/ristoratore/:id", async (req, res) => {
    //#swagger.description = "Rimuove definitivamente il profilo del ristoratore dal sistema."
 
    const id = req.params.id;
    try {
        // Esegue la cancellazione nel database
        const result = await db.collection('ristoratori').deleteOne({ _id: toObjectId(id) });

        if (result.deletedCount === 1) {
            res.json({ message: "Profilo ristoratore eliminato correttamente." });
        } else {
            res.status(404).json({ message: "Ristoratore non trovato." });
        }
    } catch (error) {
        console.error("Errore cancellazione:", error);
        res.status(500).json({ message: "Errore interno del server." });
    } 
});


// ==========================================
//                  LOGIN
// ==========================================

app.post("/cliente/login", async (req, res) => {
    //#swagger.description = "Login cliente usando email e password"
    const email = req.body.email;
    const password = req.body.password;

    try {
        const user = await db.collection('clienti').findOne({ email: email, password: password });
        
        if (user) {
            res.json({ _id: user._id, type: 'cliente' });
        } else {
            res.status(401).json({ message: "Credenziali errate" });
        }
    } catch (error) {
        res.status(500).json({ message: "Errore login" });
    }
});

app.post("/ristoratore/login", async (req, res) => {
    //#swagger.description = "Login ristoratore secondo email e password"
    const email = req.body.email;
    const password = req.body.password;

    try {
        const user = await db.collection('ristoratori').findOne({ email: email, password: password });
        if (user) {
            res.json({ _id: user._id, type: 'ristoratore' });
        } else {
            res.status(401).json({ message: "Credenziali errate" });
        }
    } catch (error) {
        res.status(500).json({ message: "Errore login" });
    }
});


// ==========================================
//              MENU E CATALOGO
// ==========================================

app.get("/meals", async (req, res) => {
    // #swagger.description = "Restituisce la lista pubblica di tutti i piatti attualmente in vendita nei ristoranti."
    try {
        const result = await db.collection('piatti')
            .find({ ristoranteId: { $ne: null } })
            .limit(100)
            .toArray();
        res.json(result);
    } catch (error) {
        res.status(500).json({ message: "Errore" });
    }
});

app.get("/catalog", async (req, res) => {
    // #swagger.description = "Restituisce il catalogo globale dei piatti standard (da meal.json) per l'importazione."
    try {
        const result = await db.collection('catalog').find({}).toArray();
        res.json(result);
    } catch (error) {
        res.status(500).json({ message: "Errore" });
    }
});

app.get("/categorie-catalogo", async (req, res) => {
    // #swagger.description = "Restituisce l'elenco delle categorie di cibo disponibili nel catalogo globale."
    try {
        const result = await db.collection('catalog').distinct('strCategory');
        res.json(result);
    } catch (error) {
        res.status(500).json({ message: "Errore" });
    }
});

app.post("/ristoratore/:id/piatti", async (req, res) => {
    // #swagger.description = "Aggiunge un nuovo piatto al menu del ristoratore specificato, copiandolo dal catalogo o creandolo."
    const idRistoratore = req.params.id;
    const datiPiatto = req.body.piatto;

    if (!toObjectId(idRistoratore)) {
        return res.status(400).json({ message: "ID non valido" });
    }

    try {
        const infoRist = await db.collection('ristoratori').findOne({ _id: toObjectId(idRistoratore) });
        
        const nuovoPiatto = {
            ...datiPiatto,
            ristoranteId: toObjectId(idRistoratore),
            ristoranteNome: infoRist.nomeRistorante,
            indirizzoRistorante: infoRist.indirizzo,
            createdAt: new Date()
        };

        const insertResult = await db.collection('piatti').insertOne(nuovoPiatto);
        
        await db.collection('ristoratori').updateOne(
            { _id: toObjectId(idRistoratore) },
            { $push: { piatti: { ...nuovoPiatto, _id: insertResult.insertedId } } }
        );

        res.json({ message: 'Piatto aggiunto', _id: insertResult.insertedId });
    } catch (error) {
        res.status(500).json({ message: "Errore salvataggio" });
    }
});

app.get("/ristoratore/:id/piatti", async (req, res) => {
    // #swagger.description = "Ottiene l'elenco completo dei piatti presenti nel menu del singolo ristoratore indicato."
    const id = req.params.id;
    try {
        const result = await db.collection('piatti').find({ ristoranteId: toObjectId(id) }).toArray();
        res.json(result);
    } catch (error) {
        res.status(500).json({ message: "Errore" });
    }
});

app.put("/ristoratore/:rId/piatti/:pId", async (req, res) => {
    // #swagger.description = "Aggiorna i dettagli (prezzo, ingredienti...) di un piatto specifico nel menu del ristorante."
    const rId = req.params.rId;
    const pId = req.params.pId;
    const dati = req.body.piatto;

    try {
        await db.collection('piatti').updateOne(
            { _id: toObjectId(pId) }, 
            { $set: dati }
        );
        await db.collection('ristoratori').updateOne(
            { _id: toObjectId(rId), "piatti._id": toObjectId(pId) },
            { $set: { "piatti.$": { ...dati, _id: toObjectId(pId) } } }
        );
        res.json({ message: "Aggiornato" });
    } catch (error) {
        res.status(500).json({ message: "Errore" });
    }
});


// ==========================================
//                RICERCA
// ==========================================

// 1. Ricerca Generale
app.get("/ricerca/generale", async (req, res) => {
    // #swagger.description = "Motore di ricerca globale: trova contemporaneamente piatti (per nome/categoria) e ristoranti (per nome/indirizzo)."
    const q = req.query.q || "";
    const regex = new RegExp(q, 'i'); 

    try {
        const piatti = await db.collection('piatti').find({ 
            ristoranteId: { $ne: null }, 
            $or: [{ nome: regex }, { categoria: regex }, { ingredienti: regex }] 
        }).toArray();

        const ristoranti = await db.collection('ristoratori').find({ 
            $or: [{ nomeRistorante: regex }, { indirizzo: regex }] 
        }).toArray();

        // Aggiungiamo etichette
        const resPiatti = piatti.map(p => { return { ...p, tipo: 'piatto' }; });
        const resRist = ristoranti.map(r => { return { ...r, tipo: 'ristorante' }; });

        res.json([...resPiatti, ...resRist]);
    } catch (error) {
        res.status(500).json({ message: "Errore" });
    }
});

// 2. Ricerca Ristorante (Fondamentale per "Vedi Menu")
app.get("/ricerca/ristorante", async (req, res) => {
    // #swagger.description = "Cerca un ristorante per nome e restituisce i dettagli inclusi tutti i piatti del suo menu (Join)."
    const q = req.query.q || "";
    try {
        // Uniamo Ristoratore e Piatti per mostrare il menu nella ricerca
        const risultati = await db.collection('ristoratori').aggregate([
            { 
                $match: { nomeRistorante: new RegExp(q, 'i') } 
            },
            { 
                $lookup: { 
                    from: 'piatti', // Nome della tua collection piatti
                    localField: '_id', 
                    foreignField: 'ristoranteId', 
                    as: 'piattiMenu' 
                } 
            }
        ]).toArray();

        const output = risultati.map(r => { return { ...r, tipo: 'ristorante' }; });
        res.json(output);
    } catch (error) {
        res.status(500).json({ message: "Errore" });
    }
});

// 3. Ricerca Ingrediente
app.get("/ricerca/ingrediente", async (req, res) => {
    // #swagger.description = "Restituisce tutti i piatti che contengono l'ingrediente specificato (Requisito: ricerca piatti per ingredienti)."
    const q = req.query.q || "";
    try {
        const risultati = await db.collection('piatti').find({ 
            ristoranteId: { $ne: null }, 
            ingredienti: new RegExp(q, 'i') 
        }).toArray();
        res.json(risultati.map(p => { return { ...p, tipo: 'piatto' }; }));
    } catch (error) {
        res.status(500).json({ message: "Errore" });
    }
});

// 4. Ricerca Luogo
app.get("/ricerca/luogo", async (req, res) => {
    // #swagger.description = "Trova i ristoranti situati in una specifica via o città (Requisito: ricerca ristorante per luogo)."
    const q = req.query.q || "";
    try {
        const risultati = await db.collection('ristoratori').aggregate([
            { $match: { indirizzo: new RegExp(q, 'i') } },
            { $lookup: { from: 'piatti', localField: '_id', foreignField: 'ristoranteId', as: 'piattiMenu' } }
        ]).toArray();
        res.json(risultati.map(r => { return { ...r, tipo: 'ristorante' }; }));
    } catch (error) {
        res.status(500).json({ message: "Errore" });
    }
});

// 5. Ricerca Esclusione Allergeni
app.get("/ricerca/allergene", async (req, res) => {
    // #swagger.description = "Filtra i piatti escludendo quelli che contengono l'allergene specificato (Requisito: ricerca piatti per allergie)."
    const q = req.query.q || "";
    try {
        const risultati = await db.collection('piatti').find({ 
            ristoranteId: { $ne: null }, 
            ingredienti: { $not: new RegExp(q, 'i') } 
        }).toArray();
        res.json(risultati.map(p => { return { ...p, tipo: 'piatto' }; }));
    } catch (error) {
        res.status(500).json({ message: "Errore" });
    }
});

// 6. Ricerca Piatto-Ristorante
app.get("/ricerca/piatto-ristorante", async (req, res) => {
    // #swagger.description = "Cerca un piatto specifico e restituisce l'elenco dei ristoranti che lo servono (Requisito: ricerca ristorante per piatto)."
    const q = req.query.q || "";
    try {
        const risultati = await db.collection('piatti').aggregate([
            { $match: { nome: new RegExp(q, 'i'), ristoranteId: { $ne: null } } },
            { $group: { 
                _id: "$ristoranteId", 
                ristoranteNome: { $first: "$ristoranteNome" }, 
                indirizzo: { $first: "$indirizzoRistorante" }, 
                piatti: { $push: "$$ROOT" } 
            }},
            { $project: { 
                tipo: "ristorante", 
                nomeRistorante: "$ristoranteNome", 
                indirizzo: "$indirizzo", 
                piattiMenu: "$piatti" 
            }}
        ]).toArray();
        res.json(risultati);
    } catch (error) {
        res.status(500).json({ message: "Errore" });
    }
});


// ==========================================
//                  ORDINI
// ==========================================

app.post("/ordine", async (req, res) => {
    // #swagger.description = "Salva l'ordine, calcola i tempi (preparazione + viaggio) e il costo di consegna basato sulla distanza (OpenStreetMap)."
    const clienteId = req.body.clienteId;
    const ristoranteId = req.body.ristoranteId;
    const piatti = req.body.piatti;
    const totale = req.body.totale;
    const tipoConsegna = req.body.tipoConsegna;
    const indirizzoConsegna = req.body.indirizzoConsegna;

    if (!toObjectId(clienteId) || !toObjectId(ristoranteId)) {
        return res.status(400).json({ message: "ID non validi" });
    }

    try {
        const rId = toObjectId(ristoranteId);
        
        // Calcoli Server
        let tempoPrep = 15;
        let tempoViaggio = 0;
        let costoConsegna = 0;

        if (piatti && piatti.length > 0) {
            tempoPrep = Math.max(...piatti.map(p => parseInt(p.tempo) || 15));
        }

        if (tipoConsegna === 'domicilio' && indirizzoConsegna) {
            const infoRist = await db.collection('ristoratori').findOne({ _id: rId });
            const coordsC = await getCoordinates(indirizzoConsegna);
            
            if (infoRist && infoRist.lat && coordsC) {
                const dist = calcolaDistanza(infoRist.lat, infoRist.lon, coordsC.lat, coordsC.lon);
                const distReale = dist * 1.4;
                tempoViaggio = Math.ceil(distReale * 2) + 5;
                costoConsegna = Math.max(2, Math.round(distReale * 1));
            } else {
                tempoViaggio = 15;
                costoConsegna = 5;
            }
        }

        const totaleFinale = parseFloat(totale) + costoConsegna;
        const durataMs = (tempoPrep + tempoViaggio) * 1000;

        // Coda Ordini
        const rData = await db.collection('ristoratori').findOne({ _id: rId });
        const now = new Date();
        let inizio = now;
        
        if (rData.prossimoSlotLibero && new Date(rData.prossimoSlotLibero) > now) {
            inizio = new Date(rData.prossimoSlotLibero);
        }
        const fine = new Date(inizio.getTime() + durataMs);

        await db.collection('ristoratori').updateOne(
            { _id: rId }, 
            { $set: { prossimoSlotLibero: fine } }
        );

        const ordine = {
            clienteId: toObjectId(clienteId),
            ristoranteId: rId,
            piatti: piatti,
            totale: totaleFinale,
            costoConsegna: costoConsegna,
            tempoPreparazione: tempoPrep,
            tempoViaggio: tempoViaggio,
            tipoConsegna: tipoConsegna,
            indirizzoConsegna: indirizzoConsegna,
            orarioInizio: inizio,
            orarioFine: fine,
            stato: 'in_coda',
            dataCreazione: now
        };

        const result = await db.collection('ordini').insertOne(ordine);
        
        res.json({ 
            _id: result.insertedId, 
            costoConsegna, tempoPreparazione: tempoPrep, tempoViaggio, 
            orarioInizio: inizio, orarioFine: fine, totaleFinale 
        });

    } catch (error) {
        res.status(500).json({ message: "Errore ordine" });
    }
});

app.post("/ordine/preventivo", async (req, res) => {
    // #swagger.description = "Calcola un preventivo di tempi e costi di consegna senza salvare l'ordine (utile per il carrello)."
    try {
        const piatti = req.body.piatti;
        const rId = req.body.ristoranteId;
        const indirizzo = req.body.indirizzoConsegna;
        const tipo = req.body.tipoConsegna;

        let tempoPrep = 15;
        let tempoViaggio = 0;
        let costo = 0;

        if (piatti) {
            tempoPrep = Math.max(...piatti.map(p => parseInt(p.tempo) || 15));
        }

        if (tipo === 'domicilio' && indirizzo) {
            const r = await db.collection('ristoratori').findOne({ _id: toObjectId(rId) });
            const c = await getCoordinates(indirizzo);
            if (r && r.lat && c) {
                const dist = calcolaDistanza(r.lat, r.lon, c.lat, c.lon) * 1.4;
                tempoViaggio = Math.ceil(dist * 2) + 5;
                costo = Math.max(2, Math.round(dist));
            } else {
                tempoViaggio = 20; costo = 5;
            }
        }

        res.json({ tempoPreparazione: tempoPrep, tempoViaggio, costoConsegna: costo });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

app.get("/cliente/:id/ordini", async (req, res) => {
    // #swagger.description = "Restituisce lo storico degli acquisti passati e lo stato degli ordini in corso per un cliente."
    const id = req.params.id;
    try {
        const ordini = await db.collection('ordini')
            .find({ clienteId: toObjectId(id) })
            .sort({ dataCreazione: -1 })
            .toArray();
        
        const now = new Date();
        const output = [];

        for (let i = 0; i < ordini.length; i++) {
            let o = ordini[i];
            const r = await db.collection('ristoratori').findOne({ _id: o.ristoranteId });
            
            let st = 'in_coda';
            if (now >= new Date(o.orarioFine)) st = 'consegnato';
            else if (now >= new Date(o.orarioInizio)) st = 'in_preparazione';
            
            o.stato = st;
            o.ristoranteNome = r ? r.nomeRistorante : 'Ristorante';
            output.push(o);
        }
        res.json(output);
    } catch (error) {
        res.status(500).json({ message: "Errore" });
    }
});

app.get("/ristoratore/:id/ordini", async (req, res) => {
    // #swagger.description = "Visualizza la coda di preparazione: lista degli ordini ricevuti dal ristorante ordinati per priorità."
    const id = req.params.id;
    try {
        const ordini = await db.collection('ordini').aggregate([
            { $match: { ristoranteId: toObjectId(id) } },
            { $sort: { orarioInizio: 1 } },
            { 
                $lookup: { 
                    from: 'clienti', 
                    localField: 'clienteId', 
                    foreignField: '_id', 
                    as: 'clienteInfo' 
                } 
            },
            { $unwind: '$clienteInfo' }
        ]).toArray();

        const now = new Date();
        const output = ordini.map(o => {
            let st = 'in_coda';
            if (now >= new Date(o.orarioFine)) st = 'consegnato';
            else if (now >= new Date(o.orarioInizio)) st = 'in_preparazione';
            return { ...o, stato: st };
        });

        res.json(output);
    } catch (error) {
        res.status(500).json({ message: "Errore" });
    }
});

app.get("/ristoratore/:id/statistiche", async (req, res) => {
    // #swagger.description = "Calcola il totale guadagni e genera la classifica dei 5 piatti più venduti del ristorante."
    const id = req.params.id;
    try {
        const ordini = await db.collection('ordini')
            .find({ ristoranteId: toObjectId(id) })
            .toArray();
        
        const now = new Date();
        let tot = 0;
        let num = 0;
        let mappaPiatti = {};

        ordini.forEach(o => {
            if (o.stato === 'consegnato' || (o.orarioFine && now >= new Date(o.orarioFine))) {
                tot += (o.totale || 0);
                num++;
                if (o.piatti) {
                    o.piatti.forEach(p => {
                        const nm = p.nome || p.strMeal;
                        if (!mappaPiatti[nm]) mappaPiatti[nm] = 0;
                        mappaPiatti[nm] += (p.quantita || 1);
                    });
                }
            }
        });

        const classifica = [];
        for (let nome in mappaPiatti) {
            classifica.push({ nome: nome, quantita: mappaPiatti[nome] });
        }
        classifica.sort((a, b) => b.quantita - a.quantita);

        res.json({ 
            totaleGuadagni: tot, 
            numeroOrdini: num, 
            classificaPiatti: classifica.slice(0, 5) 
        });

    } catch (error) {
        res.status(500).json({ message: "Errore" });
    }
});

app.post('/utils/geocode', async (req, res) => {
    // #swagger.description = "Servizio interno per convertire un indirizzo in coordinate Lat/Lon usando API OpenStreetMap."
    const c = await getCoordinates(req.body.indirizzo);
    if(c) {
        res.json(c);
    } else {
        res.status(404).json({ message: "Errore" });
    }
});