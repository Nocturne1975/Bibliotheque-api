// Point d'entrée principal de l'API
require('dotenv').config();
const express = require('express');
const prisma = require('./prisma/');

//TODO: Importer les routes
const membreRoutes = require('/routes/membres');
const livreRoutes = require('./routes/livres');
const empruntRoutes = require('./routes/emprunts');


const app = express();
const PORT = process.env.PORT || 3000;

//Middlewares
app.use(express.json()); 

// Routes
//TODO: Monter les routes
app.use('/membres', membreRoutes);
app.use('livres', livreRoutes);
app.use('/emprunts', empruntRoutes);

app.get('/', (req, res) => {
    res.json({
        message: 'API Bibliotheque', 
        version: '1.0.0', 
        endpoints: {
            membres: '/membres', 
            livres: '/livres', 
            emprunts: '/emprunts', 
            stats: '/stats'
        }
    });
});

//Demarrage du serveur
app.listen(PORT, () => {
    console.log('Serveur demarre sur http: //localhost:${PORT}');
});
