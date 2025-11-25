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
        console.error("Errore di connessione al database:", err);
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
    } catch (e) { 
        console.error("Errore Geocoding:", e.message); 
    }
    return null;
}

function calcolaDistanza(lat1, lon1, lat2, lon2) {
    const R = 6371; // Raggio della Terra in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
}

// UTENTI

app.post('/auth/login', async (req, res) => {
    const { email, password, type } = req.body;
    const collection = type === 'ristoratore' ? 'ristoratori' : 'clienti';
    try {
        const user = await db.collection(collection).findOne({ email, password });
        if (!user) return res.status(401).json({ message: 'Credenziali errate' });
        res.json({ _id: user._id, type });
    } catch (err) { 
        res.status(500).json({ message: 'Errore interno del server' }); 
    }
});

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
        res.status(500).json({ message: 'Errore interno del server' }); 
    }
});

app.post('/cliente/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = await db.collection('clienti').findOne({ email, password });
        if (!user) return res.status(401).json({ message: 'Credenziali errate' });
        res.json({ _id: user._id });
    } catch (err) {
        res.status(500).json({ message: 'Errore server' });
    }
});

app.get('/cliente/:id', async (req, res) => {
    try {
        const user = await db.collection('clienti').findOne({ _id: toObjectId(req.params.id) });
        res.json(user || {});
    } catch (err) {
        res.status(500).json({ message: 'Errore server' });
    }
});

app.put('/cliente/:id', async (req, res) => {
    try {
        const { nome, cognome, preferenze } = req.body;
        await db.collection('clienti').updateOne(
            { _id: toObjectId(req.params.id) },
            { $set: { nome, cognome, preferenze } }
        );
        res.json({ message: 'Aggiornato' });
    } catch (err) {
        res.status(500).json({ message: 'Errore server' });
    }
});

app.delete('/cliente/:id', async (req, res) => {
    try {
        await db.collection('clienti').deleteOne({ _id: toObjectId(req.params.id) });
        res.json({ message: 'Eliminato' });
    } catch (err) {
        res.status(500).json({ message: 'Errore server' });
    }
});

// RISTORATORI

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
        res.status(500).json({ message: 'Errore durante la registrazione' }); 
    }
});

app.post('/ristoratore/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        const r = await db.collection('ristoratori').findOne({ email, password });
        if (!r) return res.status(401).json({ message: 'Credenziali errate' });
        res.json({ _id: r._id });
    } catch (err) {
        res.status(500).json({ message: 'Errore server' });
    }
});

app.get('/ristoratore/:id', async (req, res) => {
    try {
        const r = await db.collection('ristoratori').findOne({ _id: toObjectId(req.params.id) });
        res.json(r || {});
    } catch (err) {
        res.status(500).json({ message: 'Errore server' });
    }
});

app.get('/ristoratore/:id/piatti', async (req, res) => {
    try {
        const piatti = await db.collection('piatti').find({ ristoranteId: toObjectId(req.params.id) }).toArray();
        res.json(piatti);
    } catch (e) { res.status(500).json([]); }
});

app.post('/ristoratore/:id/piatti', async (req, res) => {
    const { piatto } = req.body;
    const id = toObjectId(req.params.id);
    try {
        const ristorante = await db.collection('ristoratori').findOne({_id: id});
        if (!ristorante) return res.status(404).json({ message: "Ristorante non trovato" });

        const nuovoPiatto = {
            ...piatto, ristoranteId: id, ristoranteNome: ristorante.nomeRistorante,
            indirizzoRistorante: ristorante.indirizzo, createdAt: new Date()
        };

        const resPiatto = await db.collection('piatti').insertOne(nuovoPiatto);
        await db.collection('ristoratori').updateOne({_id: id}, { $push: { piatti: { ...piatto, id: resPiatto.insertedId } } });
        
        res.json({ message: 'Piatto aggiunto con successo' });
    } catch (e) { res.status(500).json({ message: 'Errore aggiunta piatto' }); }
});

app.get('/ristoratore/:id/statistiche', async (req, res) => {
    const id = toObjectId(req.params.id);
    try {
        const stats = await db.collection('ordini').aggregate([
            { $match: { ristoranteId: id, stato: 'consegnato' } },
            { 
                $group: { 
                    _id: null, totale: { $sum: "$totale" }, count: { $sum: 1 }, piatti: { $push: "$piatti" } 
                } 
            }
        ]).toArray();

        if (stats.length === 0) return res.json({ totaleGuadagni: 0, numeroOrdini: 0, classificaPiatti: [] });

        const piattiFlat = stats[0].piatti.flat();
        const piattiCount = {};
        piattiFlat.forEach(p => {
            const nome = p.strMeal || p.nome;
            piattiCount[nome] = (piattiCount[nome] || 0) + (p.quantita || 1);
        });

        const classifica = Object.entries(piattiCount)
            .sort(([,a], [,b]) => b - a).slice(0, 5)
            .map(([nome, quantita]) => ({ nome, quantita }));

        res.json({ totaleGuadagni: stats[0].totale, numeroOrdini: stats[0].count, classificaPiatti: classifica });
    } catch (e) { res.status(500).json({ message: 'Errore statistiche' }); }
});

// CATALOGO E RICERCA

app.get('/catalog', async (req, res) => {
    try {
        const catalog = await db.collection('catalog').find({}).toArray();
        res.json(catalog);
    } catch (e) { res.status(500).json({ message: 'Errore recupero catalogo' }); }
});

app.get('/categorie-catalogo', async (req, res) => {
    try {
        const cats = await db.collection('catalog').distinct('strCategory');
        res.json(cats.filter(c => c));
    } catch (e) { res.status(500).json([]); }
});

app.get('/meals', async (req, res) => {
    try {
        const meals = await db.collection('piatti').find({ ristoranteId: { $ne: null } }).limit(100).toArray();
        res.json(meals);
    } catch (e) { res.status(500).json([]); }
});

app.get('/ricerca', async (req, res) => {
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

app.get('/ricerca-avanzata', async (req, res) => {
    const { q, tipo, categoria, ingrediente, allergene, prezzoMin, prezzoMax, ristorante, luogo } = req.query;
    try {
        if (tipo === 'ristorante') {
            const query = {};
            if (q) query.nomeRistorante = new RegExp(q, 'i');
            if (luogo) query.indirizzo = new RegExp(luogo, 'i');
            
            const results = await db.collection('ristoratori').aggregate([
                { $match: query },
                { $lookup: { from: 'piatti', localField: '_id', foreignField: 'ristoranteId', as: 'piattiMenu' } }
            ]).toArray();
            return res.json(results);
        } 
        
        const query = { ristoranteId: { $ne: null } };
        if (q) query.$or = [{ nome: new RegExp(q, 'i') }, { categoria: new RegExp(q, 'i') }];
        if (categoria) query.categoria = new RegExp(categoria, 'i');
        if (ingrediente) query.ingredienti = new RegExp(ingrediente, 'i');
        if (ristorante) query.ristoranteNome = new RegExp(ristorante, 'i');
        if (luogo) query.indirizzoRistorante = new RegExp(luogo, 'i');
        
        if (prezzoMin || prezzoMax) {
            query.prezzo = {};
            if (prezzoMin) query.prezzo.$gte = parseFloat(prezzoMin);
            if (prezzoMax) query.prezzo.$lte = parseFloat(prezzoMax);
        }
        if (allergene) {
            query.ingredienti = { $not: new RegExp(allergene, 'i') };
        }
        const results = await db.collection('piatti').find(query).toArray();
        res.json(results);
    } catch (e) { res.status(500).json([]); }
});

app.get('/ricerca-ristorante-per-piatto', async (req, res) => {
    try {
        const { piatto } = req.query;
        const regex = new RegExp(piatto, 'i');
        const risultati = await db.collection('piatti').aggregate([
            { $match: { nome: regex, ristoranteId: { $ne: null } } },
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
    } catch (err) { res.status(500).json({ message: 'Errore ricerca' }); }
});

// ORDINI - SCHEDULER

app.post('/ordine', async (req, res) => {
    const { clienteId, ristoranteId, piatti, totale, tipoConsegna, indirizzoConsegna, costoConsegna } = req.body;
    const rId = toObjectId(ristoranteId);

    try {
        // 1. Tempo di Preparazione (Cottura)
        let minutiTotali = Math.max(...piatti.map(p => parseInt(p.tempo) || 15));

        // 2. Tempo di Consegna (Solo se a domicilio)
        if (tipoConsegna === 'domicilio' && indirizzoConsegna) {
            // Recupera coordinate Ristorante
            const ristorante = await db.collection('ristoratori').findOne({ _id: rId });
            
            // Recupera coordinate Cliente
            const coordsCliente = await getCoordinates(indirizzoConsegna);

            if (ristorante && ristorante.lat && ristorante.lon && coordsCliente) {
                const distKm = calcolaDistanza(ristorante.lat, ristorante.lon, coordsCliente.lat, coordsCliente.lon);
                
                // STIMA: 5 minuti per ogni Km di distanza
                const minutiViaggio = Math.ceil(distKm * 5);
                minutiTotali += minutiViaggio;
            } else {
                // Fallback se non trova le coordinate: aggiungi 15 min fissi
                minutiTotali += 15; 
            }
        }

        // --- DEMO MODE (1 minuto reale = 1 secondo di attesa) ---
        const durataMs = minutiTotali * 1000; 

        // 3. Calcolo Orari (Scheduler)
        const ristoranteDoc = await db.collection('ristoratori').findOne({ _id: rId });
        const adesso = new Date();
        let orarioInizio = adesso;

        if (ristoranteDoc.prossimoSlotLibero && new Date(ristoranteDoc.prossimoSlotLibero) > adesso) {
            orarioInizio = new Date(ristoranteDoc.prossimoSlotLibero);
        }

        const orarioFine = new Date(orarioInizio.getTime() + durataMs);

        // 4. Aggiorna Ristorante e Salva Ordine
        await db.collection('ristoratori').updateOne(
            { _id: rId },
            { $set: { prossimoSlotLibero: orarioFine } }
        );

        const ordine = {
            clienteId: toObjectId(clienteId),
            ristoranteId: rId,
            piatti, 
            totale: parseFloat(totale), 
            costoConsegna: parseFloat(costoConsegna || 0),
            tipoConsegna, 
            indirizzoConsegna, 
            orarioInizio, 
            orarioFine,
            dataCreazione: adesso
        };

        const result = await db.collection('ordini').insertOne(ordine);
        res.json({ _id: result.insertedId, orarioInizio, orarioFine, minutiTotali });

    } catch (e) { 
        console.error(e);
        res.status(500).json({ message: 'Errore creazione ordine' }); 
    }
});

app.get('/ristoratore/:id/ordini', async (req, res) => {
    try {
        const ordiniRaw = await db.collection('ordini').aggregate([
            { $match: { ristoranteId: toObjectId(req.params.id) } },
            { $sort: { orarioInizio: 1 } },
            { $lookup: { from: 'clienti', localField: 'clienteId', foreignField: '_id', as: 'clienteInfo' } },
            { $unwind: '$clienteInfo' }
        ]).toArray();

        const adesso = new Date();
        const ordiniProcessati = ordiniRaw.map(ordine => {
            let statoCalcolato = 'ordinato'; 
            const inizio = new Date(ordine.orarioInizio);
            const fine = new Date(ordine.orarioFine);

            if (adesso >= fine) {
                statoCalcolato = 'consegnato'; 
            } else if (adesso >= inizio && adesso < fine) {
                statoCalcolato = 'in_preparazione';
            } else {
                statoCalcolato = 'in_coda'; 
            }
            return { ...ordine, stato: statoCalcolato };
        });

        res.json(ordiniProcessati);
    } catch (e) { res.status(500).json([]); }
});

app.get('/cliente/:id/ordini', async (req, res) => {
    try {
        const ordiniRaw = await db.collection('ordini').find({ clienteId: toObjectId(req.params.id) }).sort({ dataCreazione: -1 }).toArray();
        
        const adesso = new Date();
        const ordiniProcessati = [];

        for (let ordine of ordiniRaw) {
            const rist = await db.collection('ristoratori').findOne({ _id: ordine.ristoranteId });
            const nomeRist = rist ? rist.nomeRistorante : "Ristorante";

            let statoCalcolato = 'in_coda';
            const inizio = new Date(ordine.orarioInizio);
            const fine = new Date(ordine.orarioFine);

            if (adesso >= fine) statoCalcolato = 'consegnato';
            else if (adesso >= inizio) statoCalcolato = 'in_preparazione';
            
            ordiniProcessati.push({ ...ordine, stato: statoCalcolato, ristoranteNome: nomeRist });
        }
        res.json(ordiniProcessati);
    } catch (e) { res.status(500).json([]); }
});