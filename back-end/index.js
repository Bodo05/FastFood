const express = require('express');
const cors = require('cors');
const { MongoClient, ObjectId } = require('mongodb');
const axios = require('axios');

const app = express();
const port = 3000;
const mongoURL = "mongodb+srv://admin:admin@cluster0.fczult8.mongodb.net/";
const dbName = "fastfood";

app.use(cors());
app.use(express.json());

const client = new MongoClient(mongoURL);
let db;

async function startServer() {
    try {
        await client.connect();
        db = client.db(dbName);
        console.log(`Connesso a MongoDB: ${dbName}`);
        app.listen(port, () => {
            console.log(`Server in ascolto su http://localhost:${port}`);
        });
    } catch (err) {
        console.error("Errore DB:", err);
    }
}
startServer();

const toObjectId = (id) => { 
    try { return new ObjectId(id); } catch { return null; } 
};

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

// --- FUNZIONE HELPER CALCOLO COSTI/TEMPI ---
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

// ---------------------------------------------------------
// ROTTE DI RICERCA (SPECIFICHE)
// ---------------------------------------------------------

app.get('/ricerca/generale', async (req, res) => {
    const { q } = req.query;
    if (!q) return res.json([]);
    const regex = new RegExp(q, 'i');
    try {
        const piatti = await db.collection('piatti').find({
            ristoranteId: { $ne: null },
            $or: [{ nome: regex }, { categoria: regex }, { ingredienti: regex }]
        }).toArray();
        const ristoranti = await db.collection('ristoratori').find({
            $or: [{ nomeRistorante: regex }, { indirizzo: regex }]
        }).toArray();
        res.json([...piatti.map(p => ({ ...p, tipo: 'piatto' })), ...ristoranti.map(r => ({ ...r, tipo: 'ristorante' }))]);
    } catch (e) { res.status(500).json([]); }
});

app.get('/ricerca/ingrediente', async (req, res) => {
    const { q } = req.query;
    if (!q) return res.json([]);
    try {
        const results = await db.collection('piatti').find({
            ristoranteId: { $ne: null },
            ingredienti: new RegExp(q, 'i')
        }).toArray();
        res.json(results);
    } catch (e) { res.status(500).json([]); }
});

app.get('/ricerca/ristorante', async (req, res) => {
    const { q } = req.query;
    if (!q) return res.json([]);
    try {
        const results = await db.collection('ristoratori').aggregate([
            { $match: { nomeRistorante: new RegExp(q, 'i') } },
            { $lookup: { from: 'piatti', localField: '_id', foreignField: 'ristoranteId', as: 'piattiMenu' } }
        ]).toArray();
        res.json(results);
    } catch (e) { res.status(500).json([]); }
});

app.get('/ricerca/luogo', async (req, res) => {
    const { q } = req.query;
    if (!q) return res.json([]);
    try {
        const results = await db.collection('ristoratori').aggregate([
            { $match: { indirizzo: new RegExp(q, 'i') } },
            { $lookup: { from: 'piatti', localField: '_id', foreignField: 'ristoranteId', as: 'piattiMenu' } }
        ]).toArray();
        res.json(results);
    } catch (e) { res.status(500).json([]); }
});

app.get('/ricerca/allergene', async (req, res) => {
    const { q } = req.query;
    if (!q) return res.json([]);
    try {
        const results = await db.collection('piatti').find({
            ristoranteId: { $ne: null },
            ingredienti: { $not: new RegExp(q, 'i') }
        }).toArray();
        res.json(results);
    } catch (e) { res.status(500).json([]); }
});

app.get('/ricerca/piatto-ristorante', async (req, res) => {
    const { q } = req.query;
    if (!q) return res.json([]);
    try {
        const risultati = await db.collection('piatti').aggregate([
            { $match: { nome: new RegExp(q, 'i'), ristoranteId: { $ne: null } } },
            { 
                $group: { 
                    _id: "$ristoranteId", 
                    ristoranteNome: { $first: "$ristoranteNome" }, 
                    indirizzo: { $first: "$indirizzoRistorante" }, 
                    piatti: { $push: "$$ROOT" } 
                } 
            },
            { 
                $project: { 
                    ristorante: { nomeRistorante: "$ristoranteNome", indirizzo: "$indirizzo" }, piatti: 1 
                } 
            }
        ]).toArray();
        res.json(risultati);
    } catch (err) { res.status(500).json([]); }
});

// ---------------------------------------------------------
// RISTORATORI E PIATTI (CRUD)
// ---------------------------------------------------------

app.put('/ristoratore/:rId/piatti/:pId', async (req, res) => {
    const rId = toObjectId(req.params.rId);
    const pId = toObjectId(req.params.pId);
    const updatedPiattoData = req.body.piatto; 

    try {
        const updateGlobal = await db.collection('piatti').updateOne(
            { _id: pId, ristoranteId: rId },
            { $set: { ...updatedPiattoData, dataAggiornamento: new Date() } }
        );

        if (updateGlobal.matchedCount === 0) {
            return res.status(404).json({ message: 'Piatto non trovato' });
        }

        await db.collection('ristoratori').updateOne(
            { _id: rId, "piatti._id": pId }, 
            { $set: { "piatti.$": { ...updatedPiattoData, _id: pId } } }
        );
        
        res.json({ message: 'Piatto aggiornato con successo' });

    } catch (err) {
        res.status(500).json({ message: 'Errore durante l\'aggiornamento' });
    }
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
        await db.collection('ristoratori').updateOne({_id: id}, { $push: { piatti: {...piatto, _id: ins.insertedId} }}); // Salviamo _id in array
        res.json({message:'Ok'});
    } catch(e) { res.status(500).json({}); }
});

// ---------------------------------------------------------
// ORDINI - SCHEDULER & PREVENTIVI
// ---------------------------------------------------------

app.post('/ordine/preventivo', async (req, res) => {
    const { piatti, tipoConsegna, indirizzoConsegna, ristoranteId } = req.body;
    try {
        const dettagli = await calcolaDettagliOrdine(piatti, tipoConsegna, indirizzoConsegna, ristoranteId);
        res.json(dettagli);
    } catch(e) { res.status(500).json({ error: e.message }); }
});

app.post('/ordine', async (req, res) => {
    const { clienteId, ristoranteId, piatti, totale, tipoConsegna, indirizzoConsegna } = req.body;
    const rId = toObjectId(ristoranteId);

    try {
        const dettagli = await calcolaDettagliOrdine(piatti, tipoConsegna, indirizzoConsegna, rId);
        
        const minutiTotali = dettagli.tempoPreparazione + dettagli.tempoViaggio;
        const durataMs = minutiTotali * 1000; // DEMO (1min = 1sec)

        let totalePiatti = parseFloat(totale); 
        let totaleFinale = totalePiatti + dettagli.costoConsegna;

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
            totale: totaleFinale, 
            costoConsegna: dettagli.costoConsegna,
            tempoPreparazione: dettagli.tempoPreparazione,
            tempoViaggio: dettagli.tempoViaggio,
            tipoConsegna, indirizzoConsegna, 
            orarioInizio, orarioFine, dataCreazione: adesso, stato: 'in_coda'
        };
        
        const result = await db.collection('ordini').insertOne(ordine);
        res.json({ _id: result.insertedId, ...dettagli, orarioInizio, orarioFine, totaleFinale });

    } catch(e) { res.status(500).json({}); }
});

app.get('/ristoratore/:id/ordini', async (req, res) => {
    try {
        const ordiniRaw = await db.collection('ordini').aggregate([
            { $match: { ristoranteId: toObjectId(req.params.id) } },
            { $sort: { orarioInizio: 1 } },
            { $lookup: { from: 'clienti', localField: 'clienteId', foreignField: '_id', as: 'clienteInfo' } },
            { $unwind: '$clienteInfo' }
        ]).toArray();

        const now = new Date();
        const proc = ordiniRaw.map(o => {
            const fine = new Date(o.orarioFine);
            let st = 'in_coda';
            if(now >= fine) st = 'consegnato';
            else if(now >= new Date(o.orarioInizio)) st = 'in_preparazione';
            return { ...o, stato: st };
        });
        res.json(proc);
    } catch(e) { res.status(500).json([]); }
});

app.get('/cliente/:id/ordini', async (req, res) => {
    try {
        const ordiniRaw = await db.collection('ordini').find({ clienteId: toObjectId(req.params.id) }).sort({dataCreazione:-1}).toArray();
        const now = new Date();
        const out = [];
        for(let o of ordiniRaw) {
            const r = await db.collection('ristoratori').findOne({_id: o.ristoranteId});
            let st = 'in_coda';
            if(now >= new Date(o.orarioFine)) st = 'consegnato';
            else if(now >= new Date(o.orarioInizio)) st = 'in_preparazione';
            out.push({ ...o, stato: st, ristoranteNome: r ? r.nomeRistorante : 'Ristorante' });
        }
        res.json(out);
    } catch(e) { res.status(500).json([]); }
});

// ---------------------------------------------------------
// ROTTE SEMPLICI (CATALOGHI E UTILITY)
// ---------------------------------------------------------

app.get('/meals', async (req, res) => {
    try {
        const meals = await db.collection('piatti').find({ ristoranteId: { $ne: null } }).limit(100).toArray();
        res.json(meals);
    } catch (e) { res.status(500).json([]); }
});

app.get('/catalog', async (req, res) => {
    try { res.json(await db.collection('catalog').find({}).toArray()); } catch(e) { res.status(500).json([]); }
});

app.get('/categorie-catalogo', async (req, res) => {
    try {
        const cats = await db.collection('catalog').distinct('strCategory');
        res.json(cats.filter(c => c));
    } catch (e) { res.status(500).json([]); }
});

app.post('/utils/geocode', async (req, res) => {
    const coords = await getCoordinates(req.body.indirizzo);
    if(coords) res.json(coords);
    else res.status(404).json({});
});

app.get('/ristoratore/:id/statistiche', async (req, res) => {
    try {
        const ordini = await db.collection('ordini').find({ ristoranteId: toObjectId(req.params.id) }).toArray();
        const now = new Date();
        let tot = 0, num = 0, pMap = {};

        ordini.forEach(o => {
            if (o.stato === 'consegnato' || (o.orarioFine && now >= new Date(o.orarioFine))) {
                tot += (o.totale || 0); num++;
                if(o.piatti) o.piatti.forEach(p => { 
                    const nm = p.nome || p.strMeal;
                    pMap[nm] = (pMap[nm] || 0) + (p.quantita || 1); 
                });
            }
        });
        
        const classifica = Object.entries(pMap).sort(([,a], [,b]) => b - a).slice(0, 5).map(([n, q]) => ({ nome: n, quantita: q }));
        res.json({ totaleGuadagni: tot, numeroOrdini: num, classificaPiatti: classifica });
    } catch(e) { res.status(500).json({}); }
});