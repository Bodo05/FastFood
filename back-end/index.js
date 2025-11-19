// index.js
const express = require('express');
const cors = require('cors');
const { MongoClient, ObjectId } = require('mongodb');

const mongoURL = "mongodb+srv://admin:admin@cluster0.fczult8.mongodb.net/"; // usa la tua
const port = 3000;
const client = new MongoClient(mongoURL, { useNewUrlParser: true, useUnifiedTopology: true });

const app = express();
app.use(cors());
app.use(express.json());

// Start server + connect DB
async function startServer() {
    try {
        await client.connect();
        console.log("Connesso al database MongoDB");
        app.listen(port, () => console.log(`Server in ascolto sulla porta ${port}`));
    } catch (err) {
        console.error("Errore connessione DB:", err);
        process.exit(1);
    }
}
startServer();

// ----------------- HELPERS -----------------
function toObjectId(id) {
    try { return new ObjectId(id); }
    catch { return null; }
}

// ----------------- ROUTE: CLIENTE -----------------

// Registrazione cliente
app.post('/cliente', async (req, res) => {
    try {
        const { nome, cognome, email, password, preferenze = [], pagamento = null, datiCarta = null } = req.body;

        // semplice controllo se esiste email
        const exists = await client.db('fastfood').collection('clienti').findOne({ email });
        if (exists) return res.status(400).json({ message: "Email già registrata" });

        const nuovo = { nome, cognome, email, password, preferenze, pagamento, datiCarta };
        const result = await client.db('fastfood').collection('clienti').insertOne(nuovo);
        res.json({ _id: result.insertedId.toString() });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Errore server" });
    }
});

// Login cliente
app.post('/cliente/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        const cliente = await client.db('fastfood').collection('clienti').findOne({ email, password });
        if (!cliente) return res.status(401).json({ message: "Login non valido" });
        res.json({ _id: cliente._id.toString() });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Errore server" });
    }
});

// Get cliente by id
app.get('/cliente/:id', async (req, res) => {
    try {
        const id = toObjectId(req.params.id);
        if(!id) return res.status(400).json({ message: "ID non valido" });
        const cliente = await client.db('fastfood').collection('clienti').findOne({ _id: id });
        if(!cliente) return res.status(404).json({ message: "Cliente non trovato" });
        res.json(cliente);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Errore server" });
    }
});

// Update cliente
app.put('/cliente/:id', async (req, res) => {
    try {
        const id = toObjectId(req.params.id);
        if(!id) return res.status(400).json({ message: "ID non valido" });
        const update = req.body;
        await client.db('fastfood').collection('clienti').updateOne({ _id: id }, { $set: update });
        res.json({ message: "Aggiornato" });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Errore server" });
    }
});

// Delete cliente
app.delete('/cliente/:id', async (req, res) => {
    try {
        const id = toObjectId(req.params.id);
        if(!id) return res.status(400).json({ message: "ID non valido" });
        await client.db('fastfood').collection('clienti').deleteOne({ _id: id });
        res.json({ message: "Eliminato" });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Errore server" });
    }
});

// ----------------- ROUTE: RISTORATORE -----------------

// Registrazione ristoratore
app.post('/ristoratore', async (req, res) => {
    try {
        const { nomeRistorante, piva, telefono, email, password, categoria = null, piatti = [] } = req.body;
        const exists = await client.db('fastfood').collection('ristoratori').findOne({ email });
        if (exists) return res.status(400).json({ message: "Email già registrata" });

        // ogni piatto è un oggetto: { id, nome, thumb, price, prepTime, categorie, ingredienti, allergeni }
        const nuovo = { nomeRistorante, piva, telefono, email, password, categoria, piatti };
        const result = await client.db('fastfood').collection('ristoratori').insertOne(nuovo);
        res.json({ _id: result.insertedId.toString() });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Errore server" });
    }
});

// Login ristoratore
app.post('/ristoratore/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        const risto = await client.db('fastfood').collection('ristoratori').findOne({ email, password });
        if (!risto) return res.status(401).json({ message: "Login non valido" });
        res.json({ _id: risto._id.toString() });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Errore server" });
    }
});

// Get ristoratore by id
app.get('/ristoratore/:id', async (req, res) => {
    try {
        const id = toObjectId(req.params.id);
        if(!id) return res.status(400).json({ message: "ID non valido" });
        const risto = await client.db('fastfood').collection('ristoratori').findOne({ _id: id });
        if(!risto) return res.status(404).json({ message: "Ristoratore non trovato" });
        res.json(risto);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Errore server" });
    }
});

// Update ristoratore
app.put('/ristoratore/:id', async (req, res) => {
    try {
        const id = toObjectId(req.params.id);
        if(!id) return res.status(400).json({ message: "ID non valido" });
        const update = req.body;
        await client.db('fastfood').collection('ristoratori').updateOne({ _id: id }, { $set: update });
        res.json({ message: "Aggiornato" });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Errore server" });
    }
});

// Delete ristoratore
app.delete('/ristoratore/:id', async (req, res) => {
    try {
        const id = toObjectId(req.params.id);
        if(!id) return res.status(400).json({ message: "ID non valido" });
        await client.db('fastfood').collection('ristoratori').deleteOne({ _id: id });
        res.json({ message: "Eliminato" });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Errore server" });
    }
});

// ----------------- RICERCA -----------------
// ricerca generale ristoranti/piatti
// query params supportati:
// ?q=nomeRistorante (ricerca per nome ristorante)
// &piatto=nomePiatto (ricerca ristoranti che vendono un piatto con questo nome)
// &categoria=Categoria (categoria piatto)
// &ingrediente=ingrediente (ricerca piatti che contengono ingrediente)
// &prezzoMax=numero (filtra price <= prezzoMax)
// &allergia=allergene (esclude piatti contenenti quell'allergene)
app.get('/search', async (req, res) => {
    try {
        const { q, piatto, categoria, ingrediente, prezzoMax, allergia, luogo } = req.query;

        // build pipeline per cercare ristoratori che hanno piatti matching (o per ricerca semplice)
        const match = {};

        if (q) match.nomeRistorante = { $regex: q, $options: 'i' };
        if (luogo) match.indirizzo = { $regex: luogo, $options: 'i' }; // se salvi indirizzo nel ristoratore

        // filtro su piatti: useremo $elemMatch
        const piattiFilter = {};
        if (piatto) piattiFilter.nome = { $regex: piatto, $options: 'i' };
        if (categoria) piattiFilter.categoria = categoria;
        if (ingrediente) piattiFilter.ingredienti = { $regex: ingrediente, $options: 'i' };
        if (prezzoMax) piattiFilter.price = { $lte: Number(prezzoMax) };
        if (allergia) piattiFilter.allergeni = { $not: { $regex: allergia, $options: 'i' } };

        // Se abbiamo filtri sui piatti, aggiungiamo elemMatch
        if (Object.keys(piattiFilter).length > 0) {
            match.piatti = { $elemMatch: piattiFilter };
        }

        const results = await client.db('fastfood').collection('ristoratori').find(match).toArray();
        res.json(results);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Errore server" });
    }
});
