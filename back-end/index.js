const express = require('express');
const cors = require('cors');
const { MongoClient, ObjectId } = require('mongodb');

const mongoURL = "mongodb+srv://admin:admin@cluster0.fczult8.mongodb.net/";
const dbName = "fastfood";
const port = 3000;

const app = express();
app.use(cors());
app.use(express.json());

const client = new MongoClient(mongoURL);

function toObjectId(id) {
  try { return new ObjectId(id); } catch { return null; }
}

async function start() {
  try {
    await client.connect();
    console.log("Connesso a MongoDB");
    app.listen(port, () => console.log(`Server su http://localhost:${port}`));
  } catch (err) {
    console.error("Errore DB:", err);
    process.exit(1);
  }
}
start();

app.get('/meals', async (req, res) => {
  try {
    const meals = await client.db(dbName).collection('meals').find({}).toArray();
    res.json(meals);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Errore lettura meals' });
  }
});

app.get('/categorie', async (req, res) => {
  try {
    const categorie = await client.db(dbName).collection('meals').distinct('strCategory');
    res.json(categorie.filter(Boolean));
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Errore lettura categorie' });
  }
});

app.get('/ristoranti', async (req, res) => {
  try {
    const ristoranti = await client.db(dbName).collection('ristoratori').find({}).toArray();
    res.json(ristoranti);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Errore lettura ristoranti' });
  }
});

app.post('/cliente', async (req, res) => {
  try {
    const { nome, cognome, email, password, preferenze = [] } = req.body;
    if (!email || !password) return res.status(400).json({ message: 'email e password richieste' });

    const col = client.db(dbName).collection('clienti');
    const exists = await col.findOne({ email });
    if (exists) return res.status(400).json({ message: 'Email già registrata' });

    const nuovo = { nome, cognome, email, password, preferenze, createdAt: new Date() };
    const r = await col.insertOne(nuovo);
    res.json({ _id: r.insertedId.toString() });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Errore server' });
  }
});

app.post('/cliente/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const col = client.db(dbName).collection('clienti');
    const c = await col.findOne({ email, password });
    if (!c) return res.status(401).json({ message: 'login non valido' });
    res.json({ _id: c._id.toString() });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Errore server' });
  }
});

app.get('/cliente/:id', async (req, res) => {
  try {
    const id = toObjectId(req.params.id);
    if (!id) return res.status(400).json({ message: 'id non valido' });
    const col = client.db(dbName).collection('clienti');
    const c = await col.findOne({ _id: id }, { projection: { password: 0 } });
    if (!c) return res.status(404).json({ message: 'Cliente non trovato' });
    res.json(c);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Errore server' });
  }
});

app.delete('/cliente/:id', async (req, res) => {
  try {
    const id = toObjectId(req.params.id);
    if (!id) return res.status(400).json({ message: 'id non valido' });
    await client.db(dbName).collection('clienti').deleteOne({ _id: id });
    res.json({ message: 'Eliminato' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Errore server' });
  }
});

app.put('/cliente/:id', async (req, res) => {
  try {
    const id = toObjectId(req.params.id);
    if (!id) return res.status(400).json({ message: 'id non valido' });
    const { nome, cognome, preferenze } = req.body;
    const col = client.db(dbName).collection('clienti');
    const result = await col.updateOne(
      { _id: id },
      { $set: { nome, cognome, preferenze } }
    );
    if (result.matchedCount === 0) return res.status(404).json({ message: 'Cliente non trovato' });
    res.json({ message: 'Aggiornato' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Errore server' });
  }
});

app.post('/ristoratore', async (req, res) => {
  try {
    const { nomeRistorante, piva, telefono, indirizzo, email, password, piatti = [] } = req.body;
    if (!email || !password) return res.status(400).json({ message: 'email e password richieste' });

    const col = client.db(dbName).collection('ristoratori');
    const exists = await col.findOne({ email });
    if (exists) return res.status(400).json({ message: 'Email già registrata' });

    const nuovo = { nomeRistorante, piva, telefono, indirizzo, email, password, piatti, createdAt: new Date() };
    const r = await col.insertOne(nuovo);
    
    // Crea i piatti nella collection piatti
    if (piatti.length > 0) {
      const piattiConRistorante = piatti.map(p => ({
        ...p,
        ristoranteId: r.insertedId,
        ristoranteNome: nomeRistorante,
        createdAt: new Date()
      }));
      
      await client.db(dbName).collection('piatti').insertMany(piattiConRistorante);
    }
    
    res.json({ _id: r.insertedId.toString() });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Errore server' });
  }
});

app.post('/ristoratore/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const col = client.db(dbName).collection('ristoratori');
    const r = await col.findOne({ email, password });
    if (!r) return res.status(401).json({ message: 'login non valido' });
    res.json({ _id: r._id.toString() });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Errore server' });
  }
});

app.get('/ristoratore/:id', async (req, res) => {
  try {
    const id = toObjectId(req.params.id);
    if (!id) return res.status(400).json({ message: 'id non valido' });
    const r = await client.db(dbName).collection('ristoratori').findOne({ _id: id }, { projection: { password: 0 } });
    if (!r) return res.status(404).json({ message: 'Ristoratore non trovato' });
    res.json(r);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Errore server' });
  }
});

app.put('/ristoratore/:id/piatti', async (req, res) => {
  try {
    const id = toObjectId(req.params.id);
    if (!id) return res.status(400).json({ message: 'id non valido' });
    const { piatti } = req.body;
    const result = await client.db(dbName).collection('ristoratori').updateOne(
      { _id: id },
      { $set: { piatti } }
    );
    if (result.matchedCount === 0) return res.status(404).json({ message: 'Ristoratore non trovato' });
    res.json({ message: 'Menu aggiornato' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Errore server' });
  }
});

app.get('/ristoratore/:id/piatti', async (req, res) => {
  try {
    const id = toObjectId(req.params.id);
    if (!id) return res.status(400).json({ message: 'id non valido' });
    
    const piatti = await client.db(dbName).collection('piatti')
      .find({ ristoranteId: id })
      .toArray();
    
    res.json(piatti);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Errore server' });
  }
});

app.post('/ristoratore/:id/piatti', async (req, res) => {
  try {
    const id = toObjectId(req.params.id);
    if (!id) return res.status(400).json({ message: 'id non valido' });
    
    const { piatto } = req.body;
    
    // Trova il ristoratore per ottenere il nome
    const ristoratore = await client.db(dbName).collection('ristoratori')
      .findOne({ _id: id });
    
    if (!ristoratore) return res.status(404).json({ message: 'Ristoratore non trovato' });
    
    // Inserisci il piatto nella collection piatti
    const result = await client.db(dbName).collection('piatti').insertOne({
      ...piatto,
      ristoranteId: id,
      ristoranteNome: ristoratore.nomeRistorante,
      createdAt: new Date()
    });
    
    // Aggiorna anche l'array piatti nel ristoratore
    await client.db(dbName).collection('ristoratori').updateOne(
      { _id: id },
      { $push: { piatti: { ...piatto, id: result.insertedId } } }
    );
    
    res.json({ _id: result.insertedId, message: 'Piatto aggiunto' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Errore server' });
  }
});

app.get('/ricerca-avanzata', async (req, res) => {
  try {
    const { 
      q, 
      tipo, 
      categoria, 
      ingrediente, 
      allergene, 
      prezzoMin, 
      prezzoMax, 
      ristorante,
      luogo 
    } = req.query;

    let pipeline = [];
    
    if (tipo === 'ristorante') {
      // RICERCA RISTORANTI per nome e luogo
      pipeline = [
        {
          $lookup: {
            from: 'piatti',
            localField: '_id',
            foreignField: 'ristoranteId',
            as: 'piattiMenu'
          }
        }
      ];

      const matchStage = {};
      const orConditions = [];

      if (q) {
        orConditions.push(
          { nomeRistorante: new RegExp(q, 'i') }
        );
      }

      if (luogo) {
        orConditions.push(
          { indirizzo: new RegExp(luogo, 'i') }
        );
      }

      if (orConditions.length > 0) {
        matchStage.$or = orConditions;
        pipeline.unshift({ $match: matchStage });
      }

      const ristoranti = await client.db(dbName).collection('ristoratori').aggregate(pipeline).toArray();
      return res.json(ristoranti);

    } else {
      // RICERCA PIATTI
      pipeline = [
        {
          $lookup: {
            from: 'ristoratori',
            localField: 'ristoranteId',
            foreignField: '_id',
            as: 'ristoranteInfo'
          }
        },
        { $unwind: '$ristoranteInfo' }
      ];

      const matchStage = {};
      const andConditions = [];

      // Ricerca per nome piatto
      if (q) {
        andConditions.push({
          $or: [
            { nome: new RegExp(q, 'i') },
            { categoria: new RegExp(q, 'i') }
          ]
        });
      }

      // Ricerca per categoria specifica
      if (categoria) {
        andConditions.push({
          categoria: new RegExp(categoria, 'i')
        });
      }

      // Ricerca per ingrediente
      if (ingrediente) {
        andConditions.push({
          ingredienti: new RegExp(ingrediente, 'i')
        });
      }

      // Ricerca per allergia (esclusione)
      if (allergene) {
        andConditions.push({
          $or: [
            { allergeni: { $exists: false } },
            { allergeni: '' },
            { allergeni: { $not: new RegExp(allergene, 'i') } }
          ]
        });
      }

      // Ricerca per prezzo
      if (prezzoMin || prezzoMax) {
        const priceCondition = {};
        if (prezzoMin) priceCondition.$gte = parseFloat(prezzoMin);
        if (prezzoMax) priceCondition.$lte = parseFloat(prezzoMax);
        andConditions.push({ prezzo: priceCondition });
      }

      // Ricerca per ristorante
      if (ristorante) {
        andConditions.push({
          'ristoranteInfo.nomeRistorante': new RegExp(ristorante, 'i')
        });
      }

      // Ricerca per luogo del ristorante
      if (luogo) {
        andConditions.push({
          'ristoranteInfo.indirizzo': new RegExp(luogo, 'i')
        });
      }

      if (andConditions.length > 0) {
        matchStage.$and = andConditions;
        pipeline.unshift({ $match: matchStage });
      }

      const piatti = await client.db(dbName).collection('piatti').aggregate(pipeline).toArray();
      return res.json(piatti);
    }

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Errore ricerca avanzata' });
  }
});


app.get('/ricerca', async (req, res) => {
  try {
    const q = req.query.q || '';
    if (!q) return res.json([]);

    // Ricerca nei piatti
    const piatti = await client.db(dbName).collection('piatti').aggregate([
      {
        $lookup: {
          from: 'ristoratori',
          localField: 'ristoranteId',
          foreignField: '_id',
          as: 'ristoranteInfo'
        }
      },
      { $unwind: '$ristoranteInfo' },
      {
        $match: {
          $or: [
            { nome: new RegExp(q, 'i') },
            { categoria: new RegExp(q, 'i') },
            { ingredienti: new RegExp(q, 'i') }
          ]
        }
      }
    ]).toArray();

    // Ricerca nei ristoranti
    const ristoranti = await client.db(dbName).collection('ristoratori').find({
      $or: [
        { nomeRistorante: new RegExp(q, 'i') },
        { indirizzo: new RegExp(q, 'i') }
      ]
    }).toArray();

    const risultati = [
      ...piatti.map(p => ({ ...p, tipo: 'piatto' })),
      ...ristoranti.map(r => ({ ...r, tipo: 'ristorante' }))
    ];

    res.json(risultati);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Errore ricerca' });
  }
});

app.get('/ricerca-ristorante-per-piatto', async (req, res) => {
  try {
    const { piatto } = req.query;
    if (!piatto) return res.json([]);

    const risultati = await client.db(dbName).collection('piatti').aggregate([
      {
        $match: {
          nome: new RegExp(piatto, 'i')
        }
      },
      {
        $lookup: {
          from: 'ristoratori',
          localField: 'ristoranteId',
          foreignField: '_id',
          as: 'ristoranteInfo'
        }
      },
      { $unwind: '$ristoranteInfo' },
      {
        $group: {
          _id: '$ristoranteInfo._id',
          ristorante: { $first: '$ristoranteInfo' },
          piatti: { $push: '$$ROOT' }
        }
      }
    ]).toArray();

    res.json(risultati);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Errore ricerca ristorante per piatto' });
  }
});