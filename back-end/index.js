const express = require('express');
const cors = require('cors');
const { MongoClient, ObjectId } = require('mongodb');
const axios = require('axios');
const fs = require('fs');

const app = express();
const port = 3000;
const mongoURL = "mongodb+srv://admin:admin@cluster0.fczult8.mongodb.net/";
const dbName = "fastfood"; // Il nome del tuo database

app.use(cors());
app.use(express.json());

const client = new MongoClient(mongoURL);
let db;

// ---------------------------------------------------------
// FUNZIONI DI UTILITÀ (HELPERS)
// ---------------------------------------------------------

// Converte stringa in ID MongoDB in modo sicuro
const toObjectId = (id) => {
    try {
        return new ObjectId(id);
    } catch (error) {
        return null;
    }
};

// Ottiene coordinate GPS da un indirizzo
async function getCoordinates(address) {
    if (!address) return null;
    try {
        const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}`;
        const res = await axios.get(url, { headers: { 'User-Agent': 'FastFoodProject/1.0' } });
        
        if (res.data && res.data.length > 0) {
            return { 
                lat: parseFloat(res.data[0].lat), 
                lon: parseFloat(res.data[0].lon) 
            };
        }
    } catch (e) {
        console.error("Errore Geocoding:", e.message);
    }
    return null;
}

// Calcola la distanza in km (Formula matematica)
function calcolaDistanza(lat1, lon1, lat2, lon2) {
    const R = 6371; 
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLon/2) * Math.sin(dLon/2);
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}

// ---------------------------------------------------------
// AVVIO SERVER E SEEDING
// ---------------------------------------------------------

async function startServer() {
    try {
        await client.connect();
        db = client.db(dbName);
        console.log(`Connesso al database: ${dbName}`);

        // Controllo se il catalogo è vuoto per caricare i dati
        const catalogCollection = db.collection('catalog');
        const count = await catalogCollection.countDocuments();

        if (count === 0 && fs.existsSync('meals1.json')) {
            console.log("Caricamento dati iniziali...");
            const data = fs.readFileSync('meals1.json', 'utf8');
            const jsonData = JSON.parse(data);
            
            // Gestione del formato JSON
            let piattiDaInserire;
            if (Array.isArray(jsonData)) {
                piattiDaInserire = jsonData;
            } else {
                piattiDaInserire = jsonData.meals || [];
            }

            // Pulizia ID per evitare errori
            const piattiPuliti = piattiDaInserire.map(p => {
                const nuovoPiatto = { ...p };
                if (nuovoPiatto._id && nuovoPiatto._id.$oid) {
                    nuovoPiatto._id = new ObjectId(nuovoPiatto._id.$oid);
                }
                return nuovoPiatto;
            });

            if (piattiPuliti.length > 0) {
                await catalogCollection.insertMany(piattiPuliti);
                console.log(`Inseriti ${piattiPuliti.length} piatti nella collection 'catalog'.`);
            }
        }

        app.listen(port, () => {
            console.log(`Server avviato su http://localhost:${port}`);
        });

    } catch (err) {
        console.error("Errore di connessione:", err);
    }
}
startServer();


// ==========================================
// SEZIONE 1: CLIENTI
// ==========================================

app.post("/cliente", async (req, res) => {
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
    const id = req.params.id;
    try {
        const user = await db.collection('clienti').findOne({ _id: toObjectId(id) });
        if (user) {
            res.json(user);
        } else {
            res.status(404).json({});
        }
    } catch (error) {
        res.status(500).json({});
    }
});

app.put("/cliente/:id", async (req, res) => {
    const id = req.params.id;
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
    const id = req.params.id;
    try {
        await db.collection('clienti').deleteOne({ _id: toObjectId(id) });
        res.json({ message: "Eliminato" });
    } catch (error) {
        res.status(500).json({ message: "Errore" });
    }
});


// ==========================================
// SEZIONE 2: RISTORATORI
// ==========================================

app.post("/ristoratore", async (req, res) => {
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
        res.status(500).json({});
    }
});


// ==========================================
// SEZIONE 3: LOGIN
// ==========================================

app.post("/auth/login", async (req, res) => {
    const email = req.body.email;
    const password = req.body.password;
    const type = req.body.type;

    let collectionName = 'clienti';
    if (type === 'ristoratore') {
        collectionName = 'ristoratori';
    }

    try {
        const user = await db.collection(collectionName).findOne({ email: email, password: password });
        
        if (user) {
            res.json({ _id: user._id, type: type || 'cliente' });
        } else {
            res.status(401).json({ message: "Credenziali errate" });
        }
    } catch (error) {
        res.status(500).json({ message: "Errore login" });
    }
});

app.post("/ristoratore/login", async (req, res) => {
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
// SEZIONE 4: MENU E CATALOGO
// ==========================================

app.get("/meals", async (req, res) => {
    try {
        const result = await db.collection('piatti')
            .find({ ristoranteId: { $ne: null } })
            .limit(100)
            .toArray();
        res.json(result);
    } catch (error) {
        res.status(500).json([]);
    }
});

app.get("/catalog", async (req, res) => {
    try {
        const result = await db.collection('catalog').find({}).toArray();
        res.json(result);
    } catch (error) {
        res.status(500).json([]);
    }
});

app.get("/categorie-catalogo", async (req, res) => {
    try {
        const result = await db.collection('catalog').distinct('strCategory');
        res.json(result);
    } catch (error) {
        res.status(500).json([]);
    }
});

// Aggiungi Piatto
app.post("/ristoratore/:id/piatti", async (req, res) => {
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
    const id = req.params.id;
    try {
        const result = await db.collection('piatti').find({ ristoranteId: toObjectId(id) }).toArray();
        res.json(result);
    } catch (error) {
        res.status(500).json([]);
    }
});

app.put("/ristoratore/:rId/piatti/:pId", async (req, res) => {
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
// SEZIONE 5: RICERCA (Fix Vedi Menu)
// ==========================================

// 1. Ricerca Generale
app.get("/ricerca/generale", async (req, res) => {
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
        res.status(500).json([]);
    }
});

// 2. Ricerca Ristorante (Fondamentale per "Vedi Menu")
app.get("/ricerca/ristorante", async (req, res) => {
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
        res.status(500).json([]);
    }
});

// 3. Ricerca Ingrediente
app.get("/ricerca/ingrediente", async (req, res) => {
    const q = req.query.q || "";
    try {
        const risultati = await db.collection('piatti').find({ 
            ristoranteId: { $ne: null }, 
            ingredienti: new RegExp(q, 'i') 
        }).toArray();
        res.json(risultati.map(p => { return { ...p, tipo: 'piatto' }; }));
    } catch (error) {
        res.status(500).json([]);
    }
});

// 4. Ricerca Luogo
app.get("/ricerca/luogo", async (req, res) => {
    const q = req.query.q || "";
    try {
        const risultati = await db.collection('ristoratori').aggregate([
            { $match: { indirizzo: new RegExp(q, 'i') } },
            { $lookup: { from: 'piatti', localField: '_id', foreignField: 'ristoranteId', as: 'piattiMenu' } }
        ]).toArray();
        res.json(risultati.map(r => { return { ...r, tipo: 'ristorante' }; }));
    } catch (error) {
        res.status(500).json([]);
    }
});

// 5. Ricerca Esclusione Allergeni
app.get("/ricerca/allergene", async (req, res) => {
    const q = req.query.q || "";
    try {
        const risultati = await db.collection('piatti').find({ 
            ristoranteId: { $ne: null }, 
            ingredienti: { $not: new RegExp(q, 'i') } 
        }).toArray();
        res.json(risultati.map(p => { return { ...p, tipo: 'piatto' }; }));
    } catch (error) {
        res.status(500).json([]);
    }
});

// 6. Ricerca Piatto-Ristorante
app.get("/ricerca/piatto-ristorante", async (req, res) => {
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
        res.status(500).json([]);
    }
});


// ==========================================
// SEZIONE 6: ORDINI
// ==========================================

app.post("/ordine", async (req, res) => {
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
        res.status(500).json([]);
    }
});

app.get("/ristoratore/:id/ordini", async (req, res) => {
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
        res.status(500).json([]);
    }
});

app.get("/ristoratore/:id/statistiche", async (req, res) => {
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
        res.status(500).json({});
    }
});

app.post('/utils/geocode', async (req, res) => {
    const c = await getCoordinates(req.body.indirizzo);
    if(c) {
        res.json(c);
    } else {
        res.status(404).json({});
    }
});