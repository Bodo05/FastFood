const { MongoClient } = require('mongodb');

const mongoURL = "mongodb+srv://admin:admin@cluster0.fczult8.mongodb.net/";
const dbName = "fastfood";

async function setupPiatti() {
  const client = new MongoClient(mongoURL);
  
  try {
    await client.connect();
    console.log("Connesso a MongoDB");
    
    const db = client.db(dbName);
    
    // Elimina la collection esistente (opzionale)
    await db.collection('piatti').drop().catch(() => console.log("Collection piatti non esistente, verrà creata"));
    
    // Crea la collection piatti
    await db.createCollection('piatti');
    console.log("Collection piatti creata");
    
    // Prendi tutti i ristoratori per associare i piatti
    const ristoratori = await db.collection('ristoratori').find({}).toArray();
    
    // Prendi i meals di base
    const meals = await db.collection('meals').find({}).toArray();
    
    const piattiDaInserire = [];
    
    // Per ogni ristoratore, crea alcuni piatti dal suo menu
    for (const ristoratore of ristoratori) {
      if (ristoratore.piatti && ristoratore.piatti.length > 0) {
        for (const piattoRistoratore of ristoratore.piatti) {
          // Trova il meal corrispondente per avere più dettagli
          const mealBase = meals.find(m => m._id.toString() === piattoRistoratore.id);
          
          if (mealBase) {
            piattiDaInserire.push({
              nome: piattoRistoratore.nome,
              prezzo: piattoRistoratore.prezzo || 10.00,
              tempo: piattoRistoratore.tempo || 30,
              categoria: piattoRistoratore.categoria,
              ingredienti: piattoRistoratore.ingredienti || mealBase.strIngredient1 || "Ingredienti non specificati",
              allergeni: piattoRistoratore.allergeni || mealBase.strAllergeni || "Nessun allergene noto",
              thumb: piattoRistoratore.thumb,
              ristoranteId: ristoratore._id,
              ristoranteNome: ristoratore.nomeRistorante,
              createdAt: new Date()
            });
          } else {
            // Se non trova il meal base, usa i dati del ristoratore
            piattiDaInserire.push({
              nome: piattoRistoratore.nome,
              prezzo: piattoRistoratore.prezzo || 10.00,
              tempo: piattoRistoratore.tempo || 30,
              categoria: piattoRistoratore.categoria,
              ingredienti: piattoRistoratore.ingredienti || "Ingredienti non specificati",
              allergeni: piattoRistoratore.allergeni || "Nessun allergene noto",
              thumb: piattoRistoratore.thumb,
              ristoranteId: ristoratore._id,
              ristoranteNome: ristoratore.nomeRistorante,
              createdAt: new Date()
            });
          }
        }
      } else {
        // Se il ristoratore non ha piatti, creane alcuni di default dalla sua categoria
        console.log(`Ristoratore ${ristoratore.nomeRistorante} non ha piatti, creazione automatica...`);
        
        const categorieRistoratore = ['Italian', 'Beef', 'Chicken', 'Dessert', 'Vegetarian'];
        const categoriaRandom = categorieRistoratore[Math.floor(Math.random() * categorieRistoratore.length)];
        
        const mealsFiltrati = meals.filter(m => m.strCategory === categoriaRandom).slice(0, 5);
        
        for (const meal of mealsFiltrati) {
          piattiDaInserire.push({
            nome: meal.strMeal,
            prezzo: parseFloat((Math.random() * 20 + 5).toFixed(2)), // Prezzo random tra 5 e 25€
            tempo: Math.floor(Math.random() * 30 + 15), // Tempo random tra 15 e 45 min
            categoria: meal.strCategory,
            ingredienti: meal.strIngredient1 || "Ingredienti non specificati",
            allergeni: meal.strAllergeni || "Nessun allergene noto",
            thumb: meal.strMealThumb,
            ristoranteId: ristoratore._id,
            ristoranteNome: ristoratore.nomeRistorante,
            createdAt: new Date()
          });
        }
      }
    }
    
    // Inserisci tutti i piatti
    if (piattiDaInserire.length > 0) {
      const result = await db.collection('piatti').insertMany(piattiDaInserire);
      console.log(`${result.insertedCount} piatti inseriti nella collection piatti`);
    } else {
      console.log("Nessun piatto da inserire");
    }
    
  } catch (err) {
    console.error("Errore durante il setup:", err);
  } finally {
    await client.close();
  }
}

setupPiatti();
