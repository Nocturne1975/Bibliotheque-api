const express = require('express');
const prisma = require('../prisma');

const router = express.Router();

// POST /membres - Creer un membre
router.post('/', async (req, res) => {
  try {
    const { nom, prenom, email, telephone } = req.body;

    if (!nom || !prenom || !email) {
      return res.status(400).json({
        error: 'nom, prenom et email sont obligatoires'
      });
    }

    const membre = await prisma.membre.create({
      data: {
        nom,
        prenom,
        email,
        telephone: telephone || null,
        dateInscription: new Date(),
        actif: true
      }
    });

    res.status(201).json(membre);
  } catch (err) {
    console.error('Erreur POST /membres :', err);
    if (err.code === 'P2002') {
      return res.status(400).json({ error: 'Email déjà utilisé' });
    }
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// GET /membres - Lister tous les membres
router.get('/', async (req, res) => {
  try {
    const membres = await prisma.membre.findMany({
      orderBy: { dateInscription: 'desc' }
    });
    res.json(membres);
  } catch (err) {
    console.error('Erreur GET /membres :', err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// GET /membres/:id - Obtenir un membre
router.get('/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (Number.isNaN(id)) return res.status(400).json({ error: 'ID invalide' });

    const membre = await prisma.membre.findUnique({ where: { id } });
    if (!membre) return res.status(404).json({ error: 'Membre non trouvé' });

    res.json(membre);
  } catch (err) {
    console.error('Erreur GET /membres/:id :', err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// PUT /membres/:id - Modifier un membre
router.put('/:id', async (req, res) => {
  try {
    const { nom, prenom, email, telephone, actif } = req.body;
    const id = Number(req.params.id);
    if (Number.isNaN(id)) return res.status(400).json({ error: 'ID invalide' });

    const data = {};
    if (nom !== undefined) data.nom = nom;
    if (prenom !== undefined) data.prenom = prenom;
    if (email !== undefined) data.email = email;
    if (telephone !== undefined) data.telephone = telephone;
    if (actif !== undefined) data.actif = actif;

    const membre = await prisma.membre.update({
      where: { id },
      data
    });

    res.json(membre);
  } catch (err) {
    console.error('Erreur PUT /membres/:id :', err);
    if (err.code === 'P2025') {
      return res.status(404).json({ error: 'Membre non trouvé' });
    }
    if (err.code === 'P2002') {
      return res.status(400).json({ error: 'Email déjà utilisé' });
    }
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// DELETE /membres/:id - Supprimer un membre
router.delete('/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (Number.isNaN(id)) return res.status(400).json({ error: 'ID invalide' });

    await prisma.membre.delete({ where: { id } });
    res.status(204).send();
  } catch (err) {
    console.error('Erreur DELETE /membres/:id :', err);
    if (err.code === 'P2025') {
      return res.status(404).json({ error: 'Membre non trouvé' });
    }
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// GET /membres/:id/emprunts - Emprunts d'un membre
router.get('/:id/emprunts', async (req, res) => {
  try {
    const membreId = Number(req.params.id);
    if (Number.isNaN(membreId)) return res.status(400).json({ error: 'ID invalide' });

    const emprunts = await prisma.emprunt.findMany({
      where: { membreId },
      include: { livre: true }
    });
    res.json(emprunts);
  } catch (err) {
    console.error('Erreur GET /membres/:id/emprunts :', err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

module.exports = router;