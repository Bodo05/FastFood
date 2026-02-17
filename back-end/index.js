const express = require('express'); //gestisce rotte http
const cors = require('cors'); //abilita richieste dal frontend
const MongoClient = require('mongodb').MongoClient; //per connettersi al database
const ObjectId = require('mongodb').ObjectId;
const axios = require('axios'); //usato per APi di OpenStreetMap per consegna domicilio
const fs = require('fs'); //usato per gestione file (es. popolazione database all'inizio leggendo file meals1.json)

//documentazione automatica
const swaggerUi = require('swagger-ui-express');
const swaggerFile = require('./swagger_output.json');

const port = 3000;
const app = express();

// API per documentazione api
app.use('/swagger', swaggerUi.serve, swaggerUi.setup(swaggerFile));

app.use(cors());
app.use(express.json());
const mongoURL = "mongodb+srv://admin:admin@cluster0.fczult8.mongodb.net/";
const dbName = "fastfood";
const client = new MongoClient(mongoURL);

let db;

//trasforma le stringhe id in oggetti di mongoDb
const toObjectId = (id) => {
    try {
        return new ObjectId(id);
    } catch (error) {
        return null;
    }
};

//trasforma la stringa di indirizzo in coordinate lat e long
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

function calcolaDistanza(lat1, lon1, lat2, lon2) {
    const R = 6371; 
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLon/2) * Math.sin(dLon/2);
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}

//fa partire il server e si connette al database
async function startServer() {
    try {
        await client.connect();
        db = client.db(dbName);
        console.log(`Connesso al database: ${dbName}`);

        const catalogCollection = db.collection('catalog');
        const count = await catalogCollection.countDocuments();

        //se collection vuota significa che va caricato il consenuto di meals1.json nella collection
        if (count === 0 && fs.existsSync('meals1.json')) {
            console.log("Caricamento dati iniziali...");
            const data = fs.readFileSync('meals1.json', 'utf8');
            const jsonData = JSON.parse(data);
            
            let piattiDaInserire = jsonData;
            if (Array.isArray(jsonData)) {
                piattiDaInserire = jsonData;
            } else {
                piattiDaInserire = jsonData.meals || [];
            }

            const piattiPuliti = [];

            for (let i = 0; i < piattiDaInserire.length; i++) {
                let p = piattiDaInserire[i];
            
                let nuovoPiatto = { ...p }; //p originale resta integro

                if (nuovoPiatto._id && nuovoPiatto._id.$oid) {
                    nuovoPiatto._id = new ObjectId(nuovoPiatto._id.$oid);
                }

                piattiPuliti.push(nuovoPiatto);
            }

            if (piattiPuliti.length > 0) {
                await catalogCollection.insertMany(piattiPuliti);
                console.log(`Inseriti ${piattiPuliti.length} piatti.`);
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

app.post("/cliente", async (req, res) => {
    // #swagger.description = "Registrazione cliente"
    const nome = req.body.nome;
    const cognome = req.body.cognome;
    const email = req.body.email;
    const password = req.body.password;
    const preferenze = req.body.preferenze || [];
    const metodoPagamento = req.body.metodoPagamento;
    const datiCarta = req.body.datiCarta;

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
            metodoPagamento: metodoPagamento,
            datiCarta: datiCarta,
            createdAt: new Date()
        };

        const result = await db.collection('clienti').insertOne(nuovoCliente);
        res.json({ _id: result.insertedId });

    } catch (error) {
        res.status(500).json({ message: "Errore server" });
    }
});

app.get("/cliente/:id", async (req, res) => {
    // #swagger.description = "Recupera cliente"
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
    // #swagger.description = "Aggiorna cliente"
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
    // #swagger.description = "Elimina cliente"
    const id = req.params.id;
    try {
        await db.collection('clienti').deleteOne({ _id: toObjectId(id) });
        if (result.deletedCount === 1) {
            res.json({ message: "Profilo cliente eliminato correttamente." });
        }
        else{
            res.status(404).json({ message: "Cliente non trovato." });
        }
    } catch (error) {
        res.status(500).json({ message: "Errore" });
    }
});

app.post("/ristoratore", async (req, res) => {
    // #swagger.description = "Registrazione ristoratore"
    const nomeRistorante = req.body.nomeRistorante;
    const email = req.body.email;
    const password = req.body.password;
    const indirizzo = req.body.indirizzo;
    const piattiMenu = req.body.piatti;
    const piva = req.body.piva;
    const telefono = req.body.telefono;

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
            piva: piva,
            telefono: telefono,
            lat: coords ? coords.lat : null,
            lon: coords ? coords.lon : null,
            piatti: [],
            createdAt: new Date()
        };

        //prima inserisco nel database e quindi creo id ristoratore
        const result = await db.collection('ristoratori').insertOne(nuovoRistoratore);
        const rId = result.insertedId;

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

            //poi se il ristoratore ha selezionato dei piatti inserisco nella collection piatti (cosi ho rID) e poi aggiorno collection ristoratori nel giusto id inserendo i piatti 
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
    // #swagger.description = "Recupera ristoratore"
    const id = req.params.id;
    try {
        const r = await db.collection('ristoratori').findOne({ _id: toObjectId(id) });
        if (r) {
            //cosi facendo password non visibile nei dati che getto
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
    // #swagger.description = "Aggiorna ristoratore"
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
    // #swagger.description = "Elimina ristoratore"
    const id = req.params.id;
    try {
        const result = await db.collection('ristoratori').deleteOne({ _id: toObjectId(id) });
        if (result.deletedCount === 1) { //oggetto deleteResult restituito da MongoDB, se counter 1 ha eliminato correttamente
            res.json({ message: "Profilo ristoratore eliminato correttamente." });
        } else {
            res.status(404).json({ message: "Ristoratore non trovato." });
        }
    } catch (error) {
        res.status(500).json({ message: "Errore interno del server." });
    } 
});

app.post("/cliente/login", async (req, res) => {
    // #swagger.description = "Login cliente"
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
    // #swagger.description = "Login ristoratore"
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

app.get("/meals", async (req, res) => {
    // #swagger.description = "Lista pubblica piatti"
    try {
        const result = await db.collection('piatti')
            .find({ ristoranteId: { $ne: null } }) //diverso da null (not equal)
            .toArray();
        res.json(result);
    } catch (error) {
        res.status(500).json({ message: "Errore" });
    }
});

app.get("/catalog", async (req, res) => {
    // #swagger.description = "Catalogo globale"
    try {
        const result = await db.collection('catalog').find({}).toArray();
        res.json(result);
    } catch (error) {
        res.status(500).json({ message: "Errore" });
    }
});

app.get("/categorie-catalogo", async (req, res) => {
    // #swagger.description = "Categorie catalogo"
    try {
        const result = await db.collection('catalog').distinct('strCategory');
        res.json(result);
    } catch (error) {
        res.status(500).json({ message: "Errore" });
    }
});

app.post("/ristoratore/:id/piatti", async (req, res) => {
    // #swagger.description = "Aggiungi piatto"
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
    // #swagger.description = "Restituisce tutti i piatti del ristoratore"
    const id = req.params.id;
    try {
        const result = await db.collection('piatti').find({ ristoranteId: toObjectId(id) }).toArray();
        res.json(result);
    } catch (error) {
        res.status(500).json({ message: "Errore" });
    }
});

app.put("/ristoratore/:rId/piatti/:pId", async (req, res) => {
    // #swagger.description = "Aggiorna piatto"
    const rId = req.params.rId;
    const pId = req.params.pId;
    const dati = req.body.piatto;

    try {
        await db.collection('piatti').updateOne(
            { _id: toObjectId(pId) }, 
            { $set: dati } //sovrascrive i campi vecchi con quelli che sono in dati
        );
        await db.collection('ristoratori').updateOne(
            { _id: toObjectId(rId), "piatti._id": toObjectId(pId) }, //trova il ristoratore con _id: ... che ha al suo
                                                                    //interno un piatto con id pId
            { $set: { "piatti.$": { ...dati, _id: toObjectId(pId) } } } //modifica il piatto trovato precedentemente ($)
                                                                        //con i nuovi datu e facendo si che id resti quello originale
        );
        res.json({ message: "Aggiornato" });
    } catch (error) {
        res.status(500).json({ message: "Errore" });
    }
});

app.get("/ricerca/ristorante/nome", async (req, res) => {
    // #swagger.description = "Ricerca ristorante per nome"
    const q = req.query.q;
    const regex = new RegExp(q, 'i'); //regex case-insensitive
    try {
        const result = await db.collection('ristoratori').find({ nomeRistorante: regex }).toArray();
        res.json(result.map(r => ({ ...r, tipo: 'ristorante' })));
    } catch (e) { res.status(500).json({ message: "Errore" }); }
});

app.get("/ricerca/ristorante/luogo", async (req, res) => {
    // #swagger.description = "Ricerca ristorante per luogo"
    const q = req.query.q;
    const regex = new RegExp(q, 'i');
    try {
        const result = await db.collection('ristoratori').find({ indirizzo: regex }).toArray();
        res.json(result.map(r => ({ ...r, tipo: 'ristorante' })));
    } catch (e) { res.status(500).json({ message: "Errore" }); }
});


app.get("/ricerca/ristorante/piatto", async (req, res) => {
    // #swagger.description = "Ricerca ristorante per piatto"
    const q = req.query.q;
    // Uso l'aggregazione per trovare i ristoranti che hanno quel piatto nel menu
    try {
        const result = await db.collection('ristoratori').aggregate([
            { $lookup: { from: 'piatti', localField: '_id', foreignField: 'ristoranteId', as: 'menu' } },
            { $match: { "menu.nome": new RegExp(q, 'i') } }
        ]).toArray();
        
        res.json(result.map(r => ({ ...r, tipo: 'ristorante' })));
    } catch (e) { res.status(500).json({ message: "Errore" }); }
});


app.get("/ricerca/piatto/nome", async (req, res) => {
    // #swagger.description = "Ricerca piatto per nome"
    const regex = new RegExp(req.query.q, 'i');
    try {
        const result = await db.collection('piatti').find({ 
            ristoranteId: { $ne: null }, 
            nome: regex 
        }).toArray();
        res.json(result.map(p => ({ ...p, tipo: 'piatto' })));
    } catch (e) { res.status(500).json({ message: "Errore" }); }
});


app.get("/ricerca/piatto/tipologia", async (req, res) => {
    // #swagger.description = "Ricerca piatto per categoria"
    const regex = new RegExp(req.query.q, 'i');
    try {
        const result = await db.collection('piatti').find({ 
            ristoranteId: { $ne: null }, 
            categoria: regex 
        }).toArray();
        res.json(result.map(p => ({ ...p, tipo: 'piatto' })));
    } catch (e) { res.status(500).json({ message: "Errore" }); }
});


app.get("/ricerca/prezzo", async (req, res) => {
    // #swagger.description = "Ricerca piatto per prezzo"
    const min = parseFloat(req.query.min) || 0;
    const max = parseFloat(req.query.max) || 10000;
    try {
        const result = await db.collection('piatti').find({ 
            ristoranteId: { $ne: null }, 
            prezzo: { $gte: min, $lte: max } 
        }).toArray();
        res.json(result.map(p => ({ ...p, tipo: 'piatto' })));
    } catch (e) { res.status(500).json({ message: "Errore" }); }
});


app.get("/ricerca/piatto/ingrediente", async (req, res) => {
    // #swagger.description = "Ricerca piatto per ingrediente"
    const regex = new RegExp(req.query.q, 'i');
    try {
        const result = await db.collection('piatti').find({ 
            ristoranteId: { $ne: null }, 
            ingredienti: regex
        }).toArray();
        res.json(result.map(p => ({ ...p, tipo: 'piatto' })));
    } catch (e) { res.status(500).json({ message: "Errore" }); }
});


app.get("/ricerca/piatto/allergie", async (req, res) => {
    // #swagger.description = "Ricerca piatto per esclusione di allergie"
    const regex = new RegExp(req.query.q, 'i');
    try {
        const result = await db.collection('piatti').find({ 
            ristoranteId: { $ne: null }, 
            ingredienti: { $not: regex } 
        }).toArray();
        res.json(result.map(p => ({ ...p, tipo: 'piatto' })));
    } catch (e) { res.status(500).json({ message: "Errore" }); }
});

app.get("/ricerca/ristorante/dettaglio", async (req, res) => {
    // #swagger.description = "dettaglio completo ristorante con piatti (per Vedi Menu)"
    const q = req.query.q; 
    
    try {
        const result = await db.collection('ristoratori').aggregate([
            { $match: { nomeRistorante: q } }, //cerco nome esatto del ristorante
            {
                $lookup: {
                    from: 'piatti',            //cerco nella collection piatti
                    localField: '_id',         //confrontando id della collection ristoratori
                    foreignField: 'ristoranteId', //con id nella collection piatti
                    as: 'piattiMenu'           //qui metto i risultati
                }
            }
        ]).toArray();
        
        res.json(result.map(r => ({ ...r, tipo: 'ristorante' })));
    } catch (e) { 
        res.status(500).json({ message: "Errore" }); 
    }
});

app.post("/ordine", async (req, res) => {
    // #swagger.description = "Salva ordine"
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
                const distEffettiva = dist * 1.4;
                tempoViaggio = Math.ceil(distEffettiva * 2) + 5;
                costoConsegna = 2.00 + (distEffettiva * 0.50);
            } else {
                tempoViaggio = 15;
                costoConsegna = 5;
            }
        }

        const totaleFinale = parseFloat(totale) + costoConsegna;
        const durataMs = (tempoPrep + tempoViaggio) * 60 * 1000;

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

app.get("/cliente/:id/ordini", async (req, res) => {
    // #swagger.description = "Storico ordini cliente"
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
    // #swagger.description = "Coda ordini ristoratore"
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
    // #swagger.description = "Statistiche ristoratore"
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
    // #swagger.description = "Geocoding interno"
    const c = await getCoordinates(req.body.indirizzo);
    if(c) {
        res.json(c);
    } else {
        res.status(404).json({ message: "Errore" });
    }
});

app.post('/preventivo', async (req, res) => {
    // #swagger.description = "calcolo preventivo con stima orario (considerando la coda)"
    const indirizzo = req.body.indirizzo;
    const ristoranteId = req.body.ristoranteId;
    const piatti = req.body.piatti;
    const tipo = req.body.tipo;

    if (!ristoranteId) {
        return res.status(400).json({ message: "Ristorante mancante" });
    }

    try {
        const infoRist = await db.collection('ristoratori').findOne({ _id: toObjectId(ristoranteId) });

        if (!infoRist) {
            return res.status(404).json({ message: "Ristorante non trovato" });
        }

        let tempoPrep = 15;

        if (piatti && piatti.length > 0) {
            const tempi = piatti.map(p => parseInt(p.tempo) || 15);
            tempoPrep = Math.max(...tempi);
        }

        let tempoViaggio = 0;
        let costo = 0;

        if (tipo === 'domicilio') {

            if (!indirizzo) {
                return res.status(400).json({ message: "Indirizzo mancante" });
            }

            const coordsC = await getCoordinates(indirizzo);

            if (!infoRist.lat || !coordsC) {
                return res.status(400).json({ message: "Indirizzo non valido" });
            }

            const dist = calcolaDistanza(
                infoRist.lat,
                infoRist.lon,
                coordsC.lat,
                coordsC.lon
            );

            const distEffettiva = dist * 1.4;

            tempoViaggio = Math.ceil(distEffettiva * 2) + 5;
            costo = 2.00 + (distEffettiva * 0.50);
        }

        const durataMs = (tempoPrep + tempoViaggio) * 1000;

        const now = new Date();
        let inizio = now;

        if (infoRist.prossimoSlotLibero &&
            new Date(infoRist.prossimoSlotLibero) > now) {

            inizio = new Date(infoRist.prossimoSlotLibero);
        }

        const fine = new Date(inizio.getTime() + durataMs);

        const minutiTotali = Math.ceil((fine - now) / (60 * 1000));
        const orarioFormattato = fine.toLocaleTimeString('it-IT', {
            hour: '2-digit',
            minute: '2-digit'
        });

        res.json({
            costo: parseFloat(costo.toFixed(2)),
            orario: orarioFormattato,
            minutiTotali: minutiTotali
        });

    } catch (error) {
        console.error("Errore preventivo:", error);
        res.status(500).json({ message: "Errore server durante il preventivo" });
    }
});