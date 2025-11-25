// Point d'entrée principal de l'API
require('dotenv').config();
const express = require('express');
const prisma = require('./prisma');

// Importer les routes
const membreRoutes = require('./routes/membres');
const livreRoutes = require('./routes/livres');
const empruntRoutes = require('./routes/emprunts');

const app = express();
const PORT = process.env.PORT || 3000;

// Middlewares
app.use(express.json());

// Monter les routes
app.use('/membres', membreRoutes);
app.use('/livres', livreRoutes);
app.use('/emprunts', empruntRoutes);

// Endpoint racine
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

// Routes de statistiques (exemples)
app.get('/stats', async (req, res) => {
  try {
    const stats = {
      totalMembres: await prisma.membre.count(),
      membresActifs: await prisma.membre.count({ where: { actif: true } }),
      totalLivres: await prisma.livre.count(),
      livresDisponibles: await prisma.livre.count({ where: { disponible: true } }),
      empruntsEnCours: await prisma.emprunt.count({ where: { statut: 'EN_COURS' } }),
      empruntsEnRetard: await prisma.emprunt.count({ where: { statut: 'EN_RETARD' } }),
      totalEmprunts: await prisma.emprunt.count()
    };
    res.json(stats);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Erreur lors du calcul des statistiques' });
  }
});

// Demarrage du serveur
app.listen(PORT, () => {
  console.log(`Serveur demarre sur http://localhost:${PORT}`);
});
