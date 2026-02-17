const swaggerAutogen = require('swagger-autogen')();

const outputFile = './swagger_output.json'; // file di outputt generato
const endpointsFiles = ['./index.js']; // file backend con rotte API

const doc = {
  info: {
    title: 'Fast Food API',
    description: 'Documentazione API generata automaticamente per il progetto Fast Food',
    version: '1.0.0',
  },
  host: 'localhost:3001',
  schemes: ['http'],
};

// Genera la documentazione
swaggerAutogen(outputFile, endpointsFiles, doc).then(() => {
    console.log('File swagger_output.json generato con successo!');
});