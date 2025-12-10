const express = require('express');
const cors = require('cors');
const { MongoClient, ObjectId } = require('mongodb');
const axios = require('axios');
const fs = require('fs'); // Modulo per leggere i file

const app = express();
const port = 3000;
// Inserisci qui la tua stringa di connessione corretta
const mongoURL = "mongodb+srv://admin:admin@cluster0.fczult8.mongodb.net/"; 
const dbName = "fastfood";

app.use(cors());
app.use(express.json());

const client = new MongoClient(mongoURL);
let db;

// --- FUNZIONE DI SETUP INIZIALE (SEEDING) ---
async function setupDatabase() {
    try {
        const catalogCollection = db.collection('catalog');
        
        // 1. Controlliamo se la collezione 'catalog' è vuota
        const count = await catalogCollection.countDocuments();
        
        if (count === 0) {
            console.log("⚠️ La collezione 'catalog' è vuota. Avvio importazione da meals1.json...");
            
            // 2. Leggiamo il file meals1.json
            if (fs.existsSync('meals1.json')) {
                const data = fs.readFileSync('meals1.json', 'utf8');
                const jsonData = JSON.parse(data);
                
                // 3. Gestiamo la struttura del JSON
                // A volte il JSON è un array diretto [...], a volte è un oggetto { "meals": [...] }
                let piattiDaInserire = [];
                if (Array.isArray(jsonData)) {
                    piattiDaInserire = jsonData;
                } else if (jsonData.meals && Array.isArray(jsonData.meals)) {
                    piattiDaInserire = jsonData.meals;
                } else {
                    console.error("❌ Formato JSON non riconosciuto. Assicurati che sia un array o contenga 'meals'.");
                    return;
                }

                // 4. Inseriamo i dati nel database
                if (piattiDaInserire.length > 0) {
                    await catalogCollection.insertMany(piattiDaInserire);
                    console.log(`✅ Importazione completata! Inseriti ${piattiDaInserire.length} piatti in 'catalog'.`);
                } else {
                    console.log("⚠️ Il file meals1.json non contiene piatti validi.");
                }
            } else {
                console.error("❌ ERRORE: File 'meals1.json' non trovato nella cartella del server.");
            }
        } else {
            console.log(`✅ Database già inizializzato. La collezione 'catalog' contiene ${count} elementi.`);
        }
    } catch (error) {
        console.error("Errore durante il setup del database:", error);
    }
}

async function startServer() {
    try {
        await client.connect();
        db = client.db(dbName);
        console.log(`Connesso a MongoDB: ${dbName}`);
        
        // ESEGUI IL SETUP DEI DATI
        await setupDatabase();

        app.listen(port, () => {
            console.log(`Server in ascolto su http://localhost:${port}`);
        });
    } catch (err) {
        console.error("Errore di connessione al database:", err);
    }
}
startServer();

const toObjectId = (id) => { 
    try { return new ObjectId(id); } catch { return null; } 
};

// --- FUNZIONI UTILI ---
async function getCoordinates(address) {
    try {
        const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}`;
        const res = await axios.get(url, { headers: { 'User-Agent': 'FastFoodProject/1.0' } });
        if (res.data && res.data.length > 0) {
            return { lat: parseFloat(res.data[0].lat), lon: parseFloat(res.data[0].lon) };
        }
    } catch (e) { console.error(e.message); }
    return null;
}

function calcolaDistanza(lat1, lon1, lat2, lon2) {
    const R = 6371; 
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLon/2) * Math.sin(dLon/2);
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}

async function calcolaDettagliOrdine(piatti, tipoConsegna, indirizzoConsegna, rId) {
    let tempoPreparazione = Math.max(...piatti.map(p => parseInt(p.tempo) || 15));
    let tempoViaggio = 0;
    let costoConsegna = 0;
    let distKm = 0;

    if (tipoConsegna === 'domicilio' && indirizzoConsegna) {
        const rist = await db.collection('ristoratori').findOne({ _id: toObjectId(rId) });
        const coordsC = await getCoordinates(indirizzoConsegna);
        
        if (rist?.lat && coordsC) {
            const distLinea = calcolaDistanza(rist.lat, rist.lon, coordsC.lat, coordsC.lon);
            distKm = distLinea * 1.4; 
            tempoViaggio = Math.ceil(distKm * 2) + 5; 
            costoConsegna = Math.max(2, Math.round(distKm * 1)); 
        } else {
            tempoViaggio = 15; 
            costoConsegna = 5;
        }
    }
    return { tempoPreparazione, tempoViaggio, costoConsegna, distKm };
}

// ==========================================
// API ROUTES
// ==========================================

// Login Generico / Cliente
app.post('/auth/login', async (req, res) => {
    const { email, password, type } = req.body;
    const collection = type === 'ristoratore' ? 'ristoratori' : 'clienti';
    try {
        const user = await db.collection(collection).findOne({ email, password });
        if (!user) return res.status(401).json({ message: 'Credenziali errate' });
        res.json({ _id: user._id, type: type || 'cliente' });
    } catch (err) { 
        res.status(500).json({ message: 'Errore interno del server' }); 
    }
});

// Login Ristoratore
app.post('/ristoratore/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        const r = await db.collection('ristoratori').findOne({ email, password });
        if (!r) return res.status(401).json({ message: 'Credenziali errate' });
        res.json({ _id: r._id, type: 'ristoratore' });
    } catch (err) {
        res.status(500).json({ message: 'Errore server' });
    }
});

// Registrazione Cliente
app.post('/cliente', async (req, res) => {
    try {
        const { nome, cognome, email, password, preferenze } = req.body;
        const exists = await db.collection('clienti').findOne({ email });
        if (exists) return res.status(400).json({ message: 'Email già registrata' });

        const result = await db.collection('clienti').insertOne({
            nome, cognome, email, password, preferenze: preferenze || [], createdAt: new Date()
        });
        res.json({ _id: result.insertedId });
    } catch (err) { 
        res.status(500).json({ message: 'Errore registrazione' }); 
    }
});

// Registrazione Ristoratore
app.post('/ristoratore', async (req, res) => {
    try {
        const { nomeRistorante, piva, telefono, indirizzo, email, password, piatti } = req.body;
        
        if (await db.collection('ristoratori').findOne({ email })) {
            return res.status(400).json({ message: 'Email già registrata' });
        }

        const coords = await getCoordinates(indirizzo);
        
        const nuovoRistoratore = { 
            nomeRistorante, piva, telefono, indirizzo, 
            lat: coords ? coords.lat : null, 
            lon: coords ? coords.lon : null,
            email, password, piatti: [], createdAt: new Date() 
        };

        const result = await db.collection('ristoratori').insertOne(nuovoRistoratore);
        const rId = result.insertedId;

        if (piatti && piatti.length > 0) {
            const piattiGlobali = piatti.map(p => ({
                ...p, ristoranteId: rId, ristoranteNome: nomeRistorante, 
                indirizzoRistorante: indirizzo, createdAt: new Date()
            }));
            
            await db.collection('piatti').insertMany(piattiGlobali);
            await db.collection('ristoratori').updateOne({ _id: rId }, { $set: { piatti: piattiGlobali } });
        }

        res.json({ _id: rId });
    } catch (err) { 
        res.status(500).json({ message: 'Errore registrazione' }); 
    }
});

// Gestione Profili
app.get('/cliente/:id', async (req, res) => {
    try { res.json(await db.collection('clienti').findOne({ _id: toObjectId(req.params.id) }) || {}); } catch(e){ res.status(500).json({}); }
});
app.put('/cliente/:id', async (req, res) => {
    try { await db.collection('clienti').updateOne({ _id: toObjectId(req.params.id) }, { $set: req.body }); res.json({ message: 'Ok' }); } catch(e) { res.status(500).json({}); }
});
app.delete('/cliente/:id', async (req, res) => {
    await db.collection('clienti').deleteOne({ _id: toObjectId(req.params.id) }); res.json({ message: 'Deleted' });
});
app.get('/ristoratore/:id', async (req, res) => {
    try { res.json(await db.collection('ristoratori').findOne({ _id: toObjectId(req.params.id) }) || {}); } catch(e) { res.status(500).json({}); }
});
app.put('/ristoratore/:id', async (req, res) => {
    try {
        const { indirizzo } = req.body;
        let update = { ...req.body };
        if(indirizzo) {
            const coords = await getCoordinates(indirizzo);
            if(coords) { update.lat = coords.lat; update.lon = coords.lon; }
        }
        await db.collection('ristoratori').updateOne({ _id: toObjectId(req.params.id) }, { $set: update });
        res.json({ message: 'Ok' });
    } catch(e) { res.status(500).json({}); }
});

// RICERCA
app.get('/ricerca/generale', async (req, res) => {
    const { q } = req.query;
    if (!q) return res.json([]);
    const regex = new RegExp(q, 'i');
    try {
        const piatti = await db.collection('piatti').find({ ristoranteId: { $ne: null }, $or: [{ nome: regex }, { categoria: regex }, { ingredienti: regex }] }).toArray();
        const ristoranti = await db.collection('ristoratori').find({ $or: [{ nomeRistorante: regex }, { indirizzo: regex }] }).toArray();
        res.json([...piatti.map(p => ({ ...p, tipo: 'piatto' })), ...ristoranti.map(r => ({ ...r, tipo: 'ristorante' }))]);
    } catch (e) { res.status(500).json([]); }
});

app.get('/ricerca/ingrediente', async (req, res) => {
    const { q } = req.query;
    if (!q) return res.json([]);
    try { res.json(await db.collection('piatti').find({ ristoranteId: { $ne: null }, ingredienti: new RegExp(q, 'i') }).toArray()); } catch(e) { res.status(500).json([]); }
});

app.get('/ricerca/ristorante', async (req, res) => {
    const { q } = req.query;
    if (!q) return res.json([]);
    try { res.json(await db.collection('ristoratori').aggregate([{ $match: { nomeRistorante: new RegExp(q, 'i') } }, { $lookup: { from: 'piatti', localField: '_id', foreignField: 'ristoranteId', as: 'piattiMenu' } }]).toArray()); } catch(e) { res.status(500).json([]); }
});

app.get('/ricerca/luogo', async (req, res) => {
    const { q } = req.query;
    if (!q) return res.json([]);
    try { res.json(await db.collection('ristoratori').aggregate([{ $match: { indirizzo: new RegExp(q, 'i') } }, { $lookup: { from: 'piatti', localField: '_id', foreignField: 'ristoranteId', as: 'piattiMenu' } }]).toArray()); } catch(e) { res.status(500).json([]); }
});

app.get('/ricerca/allergene', async (req, res) => {
    const { q } = req.query;
    if (!q) return res.json([]);
    try { res.json(await db.collection('piatti').find({ ristoranteId: { $ne: null }, ingredienti: { $not: new RegExp(q, 'i') } }).toArray()); } catch(e) { res.status(500).json([]); }
});

app.get('/ricerca/piatto-ristorante', async (req, res) => {
    const { q } = req.query;
    if (!q) return res.json([]);
    try {
        res.json(await db.collection('piatti').aggregate([
            { $match: { nome: new RegExp(q, 'i'), ristoranteId: { $ne: null } } },
            { $group: { _id: "$ristoranteId", ristoranteNome: { $first: "$ristoranteNome" }, indirizzo: { $first: "$indirizzoRistorante" }, piatti: { $push: "$$ROOT" } } },
            { $project: { ristorante: { nomeRistorante: "$ristoranteNome", indirizzo: "$indirizzo" }, piatti: 1 } }
        ]).toArray());
    } catch (err) { res.status(500).json([]); }
});

// CRUD PIATTI E CATALOGO
app.put('/ristoratore/:rId/piatti/:pId', async (req, res) => {
    const rId = toObjectId(req.params.rId);
    const pId = toObjectId(req.params.pId);
    const updatedPiattoData = req.body.piatto; 
    try {
        const updateGlobal = await db.collection('piatti').updateOne({ _id: pId, ristoranteId: rId }, { $set: { ...updatedPiattoData, dataAggiornamento: new Date() } });
        if (updateGlobal.matchedCount === 0) return res.status(404).json({ message: 'Piatto non trovato' });
        await db.collection('ristoratori').updateOne({ _id: rId, "piatti._id": pId }, { $set: { "piatti.$": { ...updatedPiattoData, _id: pId } } });
        res.json({ message: 'Piatto aggiornato' });
    } catch (err) { res.status(500).json({ message: 'Errore' }); }
});

app.get('/ristoratore/:id/piatti', async (req, res) => {
    try { res.json(await db.collection('piatti').find({ ristoranteId: toObjectId(req.params.id) }).toArray()); } catch(e) { res.status(500).json([]); }
});

app.post('/ristoratore/:id/piatti', async (req, res) => {
    const id = toObjectId(req.params.id);
    const { piatto } = req.body;
    try {
        const rist = await db.collection('ristoratori').findOne({_id: id});
        if(!rist) return res.status(404).json({});
        const p = { ...piatto, ristoranteId: id, ristoranteNome: rist.nomeRistorante, indirizzoRistorante: rist.indirizzo, createdAt: new Date() };
        const ins = await db.collection('piatti').insertOne(p);
        await db.collection('ristoratori').updateOne({_id: id}, { $push: { piatti: {...piatto, _id: ins.insertedId} }});
        res.json({message:'Ok'});
    } catch(e) { res.status(500).json({}); }
});

app.get('/meals', async (req, res) => {
    try { res.json(await db.collection('piatti').find({ ristoranteId: { $ne: null } }).limit(100).toArray()); } catch(e) { res.status(500).json([]); }
});

// API per il CATALOGO (quello popolato da meals1.json)
app.get('/catalog', async (req, res) => { 
    try { 
        res.json(await db.collection('catalog').find({}).toArray()); 
    } catch(e) { 
        res.status(500).json([]); 
    } 
});

app.get('/categorie-catalogo', async (req, res) => { 
    try { 
        res.json(await db.collection('catalog').distinct('strCategory')); 
    } catch(e) { 
        res.status(500).json([]); 
    } 
});

// ORDINI
app.post('/ordine/preventivo', async (req, res) => {
    const { piatti, tipoConsegna, indirizzoConsegna, ristoranteId } = req.body;
    try { res.json(await calcolaDettagliOrdine(piatti, tipoConsegna, indirizzoConsegna, ristoranteId)); } catch(e) { res.status(500).json({ error: e.message }); }
});

app.post('/ordine', async (req, res) => {
    const { clienteId, ristoranteId, piatti, totale, tipoConsegna, indirizzoConsegna } = req.body;
    const rId = toObjectId(ristoranteId);
    try {
        const dettagli = await calcolaDettagliOrdine(piatti, tipoConsegna, indirizzoConsegna, rId);
        const minutiTotali = dettagli.tempoPreparazione + dettagli.tempoViaggio;
        const durataMs = minutiTotali * 1000; 

        let totaleFinale = parseFloat(totale) + dettagli.costoConsegna;

        const ristData = await db.collection('ristoratori').findOne({ _id: rId });
        const adesso = new Date();
        let orarioInizio = adesso;
        if (ristData.prossimoSlotLibero && new Date(ristData.prossimoSlotLibero) > adesso) {
            orarioInizio = new Date(ristData.prossimoSlotLibero);
        }
        const orarioFine = new Date(orarioInizio.getTime() + durataMs);

        await db.collection('ristoratori').updateOne({ _id: rId }, { $set: { prossimoSlotLibero: orarioFine } });

        const ordine = {
            clienteId: toObjectId(clienteId), ristoranteId: rId, piatti, 
            totale: totaleFinale, costoConsegna: dettagli.costoConsegna,
            tempoPreparazione: dettagli.tempoPreparazione, tempoViaggio: dettagli.tempoViaggio,
            tipoConsegna, indirizzoConsegna, orarioInizio, orarioFine, dataCreazione: adesso, stato: 'in_coda'
        };
        const result = await db.collection('ordini').insertOne(ordine);
        res.json({ _id: result.insertedId, ...dettagli, orarioInizio, orarioFine, totaleFinale });
    } catch(e) { res.status(500).json({}); }
});

app.get('/ristoratore/:id/ordini', async (req, res) => {
    try {
        const ordini = await db.collection('ordini').aggregate([{ $match: { ristoranteId: toObjectId(req.params.id) } }, { $sort: { orarioInizio: 1 } }, { $lookup: { from: 'clienti', localField: 'clienteId', foreignField: '_id', as: 'clienteInfo' } }, { $unwind: '$clienteInfo' }]).toArray();
        const now = new Date();
        res.json(ordini.map(o => {
            let st = 'in_coda'; if(now >= new Date(o.orarioFine)) st = 'consegnato'; else if(now >= new Date(o.orarioInizio)) st = 'in_preparazione';
            return { ...o, stato: st };
        }));
    } catch(e) { res.status(500).json([]); }
});

app.get('/cliente/:id/ordini', async (req, res) => {
    try {
        const ordini = await db.collection('ordini').find({ clienteId: toObjectId(req.params.id) }).sort({dataCreazione:-1}).toArray();
        const now = new Date(); const out = [];
        for(let o of ordini) {
            const r = await db.collection('ristoratori').findOne({_id: o.ristoranteId});
            let st = 'in_coda'; if(now >= new Date(o.orarioFine)) st = 'consegnato'; else if(now >= new Date(o.orarioInizio)) st = 'in_preparazione';
            out.push({ ...o, stato: st, ristoranteNome: r ? r.nomeRistorante : 'Ristorante' });
        }
        res.json(out);
    } catch(e) { res.status(500).json([]); }
});

app.get('/ristoratore/:id/statistiche', async (req, res) => {
    try {
        const ordini = await db.collection('ordini').find({ ristoranteId: toObjectId(req.params.id) }).toArray();
        const now = new Date(); let tot = 0, num = 0, pMap = {};
        ordini.forEach(o => { if (o.stato === 'consegnato' || (o.orarioFine && now >= new Date(o.orarioFine))) { tot += (o.totale || 0); num++; if(o.piatti) o.piatti.forEach(p => { const nm = p.nome || p.strMeal; pMap[nm] = (pMap[nm] || 0) + (p.quantita || 1); }); } });
        const classifica = Object.entries(pMap).sort(([,a], [,b]) => b - a).slice(0, 5).map(([n, q]) => ({ nome: n, quantita: q }));
        res.json({ totaleGuadagni: tot, numeroOrdini: num, classificaPiatti: classifica });
    } catch(e) { res.status(500).json({}); }
});

app.post('/utils/geocode', async (req, res) => {
    const coords = await getCoordinates(req.body.indirizzo);
    if(coords) res.json(coords); else res.status(404).json({});
});