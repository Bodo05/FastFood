const express = require('express');
const cors = require('cors');
const { MongoClient, ObjectId } = require('mongodb');
const axios = require('axios'); // Serve per OpenStreetMap

const app = express();
app.use(cors());
app.use(express.json());

// Configurazione Database
const mongoURL = "mongodb+srv://admin:admin@cluster0.fczult8.mongodb.net/";
const dbName = "fastfood";
const port = 3000;

const client = new MongoClient(mongoURL);

// Funzione helper per convertire stringhe in ObjectId
function toObjectId(id) {
    try {
        return new ObjectId(id);
    } catch (error) {
        return null;
    }
}

// Connessione al Server
async function startServer() {
    try {
        await client.connect();
        console.log("Connesso a MongoDB");
        app.listen(port, () => {
            console.log(`Server attivo su http://localhost:${port}`);
        });
    } catch (err) {
        console.error("Errore connessione DB:", err);
    }
}
startServer();

// ---------------------------------------------------------
// 1. UTILITY & GEOCODING
// ---------------------------------------------------------

// Calcola le coordinate da un indirizzo (Usato dal frontend per il cliente)
app.post('/utils/geocode', async (req, res) => {
    const { indirizzo } = req.body;
    if (!indirizzo) return res.status(400).json({ message: "Indirizzo mancante" });

    try {
        // Chiamata a Nominatim (OpenStreetMap)
        const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(indirizzo)}`;
        
        // Header necessario per evitare blocchi da OSM
        const response = await axios.get(url, {
            headers: { 'User-Agent': 'FastFoodProject/1.0' }
        });
        
        if (response.data && response.data.length > 0) {
            res.json({
                lat: parseFloat(response.data[0].lat),
                lon: parseFloat(response.data[0].lon)
            });
        } else {
            res.status(404).json({ message: "Indirizzo non trovato" });
        }
    } catch (error) {
        console.error("Errore API Mappe:", error.message);
        res.status(500).json({ message: "Errore servizio mappe" });
    }
});

// ---------------------------------------------------------
// 2. MENU E CATALOGHI
// ---------------------------------------------------------

// Restituisce i piatti ATTIVI (quelli venduti da un ristorante)
app.get('/meals', async (req, res) => {
    try {
        const meals = await client.db(dbName).collection('piatti').find({
            ristoranteId: { $exists: true, $ne: null }
        }).limit(100).toArray();
        res.json(meals);
    } catch (err) {
        res.status(500).json({ message: 'Errore server' });
    }
});

// Catalogo base per l'importazione (piatti non in vendita)
app.get('/catalog', async (req, res) => {
    try {
        const catalog = await client.db(dbName).collection('catalog').find({}).toArray();
        res.json(catalog);
    } catch (err) {
        res.status(500).json({ message: 'Errore server' });
    }
});

app.get('/categorie-catalogo', async (req, res) => {
    try {
        // Prende le categorie distinte dal catalogo base
        const categorie = await client.db(dbName).collection('catalog').distinct('strCategory');
        res.json(categorie.filter(c => c)); // Rimuove eventuali null
    } catch (e) {
        res.status(500).json([]);
    }
});

// ---------------------------------------------------------
// 3. GESTIONE CLIENTI
// ---------------------------------------------------------

app.post('/cliente', async (req, res) => {
    try {
        const { nome, cognome, email, password, preferenze } = req.body;
        const db = client.db(dbName);
        
        const exists = await db.collection('clienti').findOne({ email });
        if (exists) return res.status(400).json({ message: 'Email già registrata' });

        const nuovo = { nome, cognome, email, password, preferenze: preferenze || [], createdAt: new Date() };
        const result = await db.collection('clienti').insertOne(nuovo);
        
        res.json({ _id: result.insertedId });
    } catch (err) {
        res.status(500).json({ message: 'Errore server' });
    }
});

app.post('/cliente/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = await client.db(dbName).collection('clienti').findOne({ email, password });
        if (!user) return res.status(401).json({ message: 'Credenziali errate' });
        res.json({ _id: user._id });
    } catch (err) {
        res.status(500).json({ message: 'Errore server' });
    }
});

app.get('/cliente/:id', async (req, res) => {
    try {
        const user = await client.db(dbName).collection('clienti').findOne({ _id: toObjectId(req.params.id) });
        res.json(user || {});
    } catch (err) {
        res.status(500).json({ message: 'Errore server' });
    }
});

// Storico ordini cliente
app.get('/cliente/:id/ordini', async (req, res) => {
    try {
        const ordini = await client.db(dbName).collection('ordini').aggregate([
            { $match: { clienteId: toObjectId(req.params.id) } },
            { $sort: { dataCreazione: -1 } },
            {
                $lookup: {
                    from: 'ristoratori',
                    localField: 'ristoranteId',
                    foreignField: '_id',
                    as: 'ristoranteInfo'
                }
            },
            { $unwind: { path: '$ristoranteInfo', preserveNullAndEmptyArrays: true } }
        ]).toArray();
        res.json(ordini);
    } catch (err) {
        res.status(500).json({ message: 'Errore server' });
    }
});

app.put('/cliente/:id', async (req, res) => {
    try {
        const { nome, cognome, preferenze } = req.body;
        await client.db(dbName).collection('clienti').updateOne(
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
        await client.db(dbName).collection('clienti').deleteOne({ _id: toObjectId(req.params.id) });
        res.json({ message: 'Eliminato' });
    } catch (err) {
        res.status(500).json({ message: 'Errore server' });
    }
});

// ---------------------------------------------------------
// 4. GESTIONE RISTORATORI
// ---------------------------------------------------------

app.post('/ristoratore', async (req, res) => {
    try {
        const { nomeRistorante, piva, telefono, indirizzo, email, password, piatti } = req.body;
        const db = client.db(dbName);

        if (await db.collection('ristoratori').findOne({ email })) {
            return res.status(400).json({ message: 'Email già usata' });
        }

        // Cerchiamo le coordinate automaticamente all'iscrizione
        let lat = null, lon = null;
        try {
            const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(indirizzo)}`;
            const geoRes = await axios.get(url, { headers: { 'User-Agent': 'FastFoodProject/1.0' } });
            if (geoRes.data.length > 0) {
                lat = parseFloat(geoRes.data[0].lat);
                lon = parseFloat(geoRes.data[0].lon);
            }
        } catch (e) {
            console.log("Geocoding fallito:", e.message);
        }

        const nuovo = { 
            nomeRistorante, piva, telefono, indirizzo, lat, lon, 
            email, password, piatti: [], createdAt: new Date() 
        };
        
        const result = await db.collection('ristoratori').insertOne(nuovo);
        
        // Se aveva piatti nel form di registrazione, li aggiungiamo
        if (piatti && piatti.length > 0) {
            const piattiGlobali = piatti.map(p => ({
                ...p,
                ristoranteId: result.insertedId,
                ristoranteNome: nomeRistorante,
                indirizzoRistorante: indirizzo,
                createdAt: new Date()
            }));
            await db.collection('piatti').insertMany(piattiGlobali);
            
            // Aggiorniamo anche l'array interno del ristoratore
            await db.collection('ristoratori').updateOne(
                { _id: result.insertedId },
                { $set: { piatti: piattiGlobali } }
            );
        }

        res.json({ _id: result.insertedId });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Errore server' });
    }
});

app.post('/ristoratore/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        const r = await client.db(dbName).collection('ristoratori').findOne({ email, password });
        if (!r) return res.status(401).json({ message: 'Credenziali errate' });
        res.json({ _id: r._id });
    } catch (err) {
        res.status(500).json({ message: 'Errore server' });
    }
});

app.get('/ristoratore/:id', async (req, res) => {
    try {
        const r = await client.db(dbName).collection('ristoratori').findOne({ _id: toObjectId(req.params.id) });
        res.json(r || {});
    } catch (err) {
        res.status(500).json({ message: 'Errore server' });
    }
});

// Gestione Piatti Ristoratore
app.get('/ristoratore/:id/piatti', async (req, res) => {
    try {
        const piatti = await client.db(dbName).collection('piatti')
            .find({ ristoranteId: toObjectId(req.params.id) }).toArray();
        res.json(piatti);
    } catch (err) {
        res.status(500).json({ message: 'Errore server' });
    }
});

app.post('/ristoratore/:id/piatti', async (req, res) => {
    try {
        const id = toObjectId(req.params.id);
        const { piatto } = req.body;
        const db = client.db(dbName);
        
        const rist = await db.collection('ristoratori').findOne({ _id: id });
        if (!rist) return res.status(404).json({ message: 'Ristoratore non trovato' });

        const nuovoPiatto = {
            ...piatto,
            ristoranteId: id,
            ristoranteNome: rist.nomeRistorante,
            indirizzoRistorante: rist.indirizzo,
            createdAt: new Date()
        };

        // Salva nella collection globale
        const resPiatto = await db.collection('piatti').insertOne(nuovoPiatto);
        
        // Aggiorna il documento del ristoratore
        await db.collection('ristoratori').updateOne(
            { _id: id },
            { $push: { piatti: { ...piatto, id: resPiatto.insertedId } } }
        );
        
        res.json({ message: 'Piatto aggiunto con successo' });
    } catch (err) {
        res.status(500).json({ message: 'Errore server' });
    }
});

// Statistiche Ristoratore
app.get('/ristoratore/:id/statistiche', async (req, res) => {
    try {
        const id = toObjectId(req.params.id);
        const stats = await client.db(dbName).collection('ordini').aggregate([
            { $match: { ristoranteId: id, stato: 'consegnato' } },
            { 
                $group: { 
                    _id: null, 
                    totale: { $sum: "$totale" }, 
                    count: { $sum: 1 }, 
                    piatti: { $push: "$piatti" } 
                } 
            }
        ]).toArray();

        let totaleGuadagni = 0;
        let numeroOrdini = 0;
        let classificaPiatti = [];

        if (stats.length > 0) {
            totaleGuadagni = stats[0].totale;
            numeroOrdini = stats[0].count;
            
            const piattiCount = {};
            stats[0].piatti.flat().forEach(p => {
                piattiCount[p.strMeal] = (piattiCount[p.strMeal] || 0) + p.quantita;
            });
            
            classificaPiatti = Object.entries(piattiCount)
                .sort(([,a], [,b]) => b - a)
                .slice(0, 5)
                .map(([nome, quantita]) => ({ nome, quantita }));
        }

        res.json({ totaleGuadagni, numeroOrdini, classificaPiatti });
    } catch (err) {
        res.status(500).json({ message: 'Errore statistiche' });
    }
});

// ---------------------------------------------------------
// 5. GESTIONE ORDINI
// ---------------------------------------------------------

app.post('/ordine', async (req, res) => {
    try {
        const { clienteId, ristoranteId, piatti, totale, tipoConsegna, indirizzoConsegna, costoConsegna } = req.body;
        
        const ordine = {
            clienteId: toObjectId(clienteId),
            ristoranteId: toObjectId(ristoranteId),
            piatti, 
            totale: parseFloat(totale), 
            costoConsegna: parseFloat(costoConsegna || 0),
            stato: 'ordinato', // Stati: ordinato, in_preparazione, in_consegna, consegnato
            tipoConsegna, 
            indirizzoConsegna, 
            dataCreazione: new Date()
        };

        const result = await client.db(dbName).collection('ordini').insertOne(ordine);
        res.json({ _id: result.insertedId });
    } catch (err) {
        res.status(500).json({ message: 'Errore creazione ordine' });
    }
});

app.get('/ristoratore/:id/ordini', async (req, res) => {
    try {
        const ordini = await client.db(dbName).collection('ordini').aggregate([
            { $match: { ristoranteId: toObjectId(req.params.id) } },
            { $sort: { dataCreazione: -1 } },
            {
                $lookup: { from: 'clienti', localField: 'clienteId', foreignField: '_id', as: 'clienteInfo' }
            },
            { $unwind: '$clienteInfo' }
        ]).toArray();
        res.json(ordini);
    } catch (err) {
        res.status(500).json({ message: 'Errore server' });
    }
});

app.put('/ordine/:id/stato', async (req, res) => {
    try {
        const { nuovoStato } = req.body;
        await client.db(dbName).collection('ordini').updateOne(
            { _id: toObjectId(req.params.id) },
            { $set: { stato: nuovoStato, dataAggiornamento: new Date() } }
        );
        res.json({ message: 'Stato aggiornato' });
    } catch (err) {
        res.status(500).json({ message: 'Errore aggiornamento' });
    }
});

// ---------------------------------------------------------
// 6. MOTORE DI RICERCA
// ---------------------------------------------------------

app.get('/ricerca', async (req, res) => {
    try {
        const q = req.query.q;
        if (!q) return res.json([]);
        
        const regex = new RegExp(q, 'i');

        const piatti = await client.db(dbName).collection('piatti').find({
            ristoranteId: { $exists: true, $ne: null },
            $or: [{ nome: regex }, { categoria: regex }, { ingredienti: regex }]
        }).toArray();

        const ristoranti = await client.db(dbName).collection('ristoratori').find({
            $or: [{ nomeRistorante: regex }, { indirizzo: regex }]
        }).toArray();

        const risultati = [
            ...piatti.map(p => ({ ...p, tipo: 'piatto' })),
            ...ristoranti.map(r => ({ ...r, tipo: 'ristorante' }))
        ];

        res.json(risultati);
    } catch (err) {
        res.status(500).json({ message: 'Errore ricerca' });
    }
});

app.get('/ricerca-ristorante-per-piatto', async (req, res) => {
    try {
        const { piatto } = req.query;
        const regex = new RegExp(piatto, 'i');
        
        const risultati = await client.db(dbName).collection('piatti').aggregate([
            { $match: { nome: regex, ristoranteId: { $exists: true, $ne: null } } },
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
                    ristorante: { nomeRistorante: "$ristoranteNome", indirizzo: "$indirizzo" }, 
                    piatti: 1 
                } 
            }
        ]).toArray();
        
        res.json(risultati);
    } catch (err) {
        res.status(500).json({ message: 'Errore ricerca' });
    }
});

app.get('/ricerca-avanzata', async (req, res) => {
    try {
        const { q, tipo, categoria, ingrediente, allergene, prezzoMin, prezzoMax, ristorante, luogo } = req.query;
        const db = client.db(dbName);

        if (tipo === 'ristorante') {
            const query = {};
            if (q) query.nomeRistorante = new RegExp(q, 'i');
            if (luogo) query.indirizzo = new RegExp(luogo, 'i');
            
            const rists = await db.collection('ristoratori').aggregate([
                { $match: query },
                { 
                    $lookup: { 
                        from: 'piatti', localField: '_id', foreignField: 'ristoranteId', as: 'piattiMenu' 
                    } 
                }
            ]).toArray();
            return res.json(rists);
        } else {
            const query = { ristoranteId: { $exists: true, $ne: null } };
            
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
                query.$and = [
                    { ingredienti: { $not: new RegExp(allergene, 'i') } },
                    { allergeni: { $not: new RegExp(allergene, 'i') } }
                ];
            }

            const p = await db.collection('piatti').find(query).toArray();
            return res.json(p);
        }
    } catch (err) {
        res.status(500).json({ message: 'Errore ricerca' });
    }
});