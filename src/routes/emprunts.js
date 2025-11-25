// Routes pour la gestion des emprunts
const express = require('express');
const prisma = require('../prisma');

const router = express.Router();

/**
 * Verifie si un membre peut emprunter un livre
 * @param {number} membreId
 * @returns {Promise<boolean>}
 */
async function peutEmprunter(membreId) {
  const membre = await prisma.membre.findUnique({
    where: { id: membreId },
    select: { id: true, actif: true }
  });
  if (!membre) return false;
  if (!membre.actif) return false;

  const now = new Date();

  const countEnCours = await prisma.emprunt.count({
    where: { membreId, statut: 'EN_COURS' }
  });
  if (countEnCours >= 5) return false;

  const countEnRetard = await prisma.emprunt.count({
    where: {
      membreId,
      dateRetourEffective: null,
      dateRetourPrevue: { lt: now }
    }
  });
  if (countEnRetard > 0) return false;

  return true;
}

/**
 * Calcule la date de retour prevue (14 jours apres l’emprunt)
 * @param {Date} dateEmprunt
 * @returns {Date}
 */
function calculerDateRetour(dateEmprunt) {
  const MILLISECONDS_IN_A_DAY = 24 * 60 * 60 * 1000;
  const dureeEmpruntJours = 14;
  return new Date(dateEmprunt.getTime() + dureeEmpruntJours * MILLISECONDS_IN_A_DAY);
}

// POST /emprunts - Creer un emprunt
router.post('/', async (req, res) => {
  try {
    const { membreId, livreId } = req.body;
    if (!membreId || !livreId) {
      return res.status(400).json({ error: 'membreId et livreId sont requis' });
    }

    // 1. Verifier que le membre existe et est actif
    const membre = await prisma.membre.findUnique({ where: { id: membreId } });
    if (!membre) return res.status(404).json({ error: 'Membre non trouvé' });
    if (!membre.actif) return res.status(400).json({ error: 'Membre inactif' });

    // 2. Verifier que le livre existe et est disponible
    const livre = await prisma.livre.findUnique({ where: { id: livreId } });
    if (!livre) return res.status(404).json({ error: 'Livre non trouvé' });
    if (livre.disponible === false) return res.status(400).json({ error: 'Livre non disponible' });

    // 3. Verifier que le membre peut emprunter
    const autorise = await peutEmprunter(membreId);
    if (!autorise) return res.status(400).json({ error: 'Le membre ne peut pas emprunter (limite ou retard)' });

    // 4. Calculer la date de retour prevue
    const now = new Date();
    const dateRetourPrevue = calculerDateRetour(now);

    // 5. Creer l'emprunt et mettre a jour le livre (transaction)
    const [emprunt] = await prisma.$transaction([
      prisma.emprunt.create({
        data: {
          membreId,
          livreId,
          dateEmprunt: now,
          dateRetourPrevue,
          dateRetourEffective: null,
          statut: 'EN_COURS'
        }
      }),
      prisma.livre.update({
        where: { id: livreId },
        data: { disponible: false }
      })
    ]);

    res.status(201).json(emprunt);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Erreur lors de la création de l’emprunt' });
  }
});

// GET /emprunts - Lister les emprunts (option: statut)
router.get('/', async (req, res) => {
  try {
    const { statut } = req.query;
    const now = new Date();

    let where = {};
    if (statut) {
      if (statut === 'EN_RETARD') {
        where = {
          dateRetourEffective: null,
          dateRetourPrevue: { lt: now }
        };
      } else {
        where = { statut };
      }
    }

    const emprunts = await prisma.emprunt.findMany({
      where,
      include: { membre: true, livre: true },
      orderBy: { dateEmprunt: 'desc' }
    });

    // Calculer statuts dynamiquement si nécessaire
    const result = emprunts.map(e => {
      let computedStatut = e.statut;
      if (!e.dateRetourEffective && e.dateRetourPrevue < now) computedStatut = 'EN_RETARD';
      return { ...e, statut: computedStatut };
    });

    res.json(result);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Erreur lors de la récupération des emprunts' });
  }
});

// GET /emprunts/:id - Détails d'un emprunt
router.get('/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (Number.isNaN(id)) return res.status(400).json({ error: 'id invalide' });

    const emprunt = await prisma.emprunt.findUnique({
      where: { id },
      include: { membre: true, livre: true }
    });
    if (!emprunt) return res.status(404).json({ error: 'Emprunt non trouvé' });

    const now = new Date();
    let computedStatut = emprunt.statut;
    if (!emprunt.dateRetourEffective && emprunt.dateRetourPrevue < now) computedStatut = 'EN_RETARD';

    res.json({ ...emprunt, statut: computedStatut });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Erreur lors de la récupération de l’emprunt' });
  }
});

// PUT /emprunts/:id/retourner - Retourner un livre
router.put('/:id/retourner', async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (Number.isNaN(id)) return res.status(400).json({ error: 'id invalide' });

    const emprunt = await prisma.emprunt.findUnique({ where: { id } });
    if (!emprunt) return res.status(404).json({ error: 'Emprunt non trouvé' });
    if (emprunt.dateRetourEffective) return res.status(400).json({ error: 'Livre déjà retourné' });

    const now = new Date();

    const [empruntMisAJour] = await prisma.$transaction([
      prisma.emprunt.update({
        where: { id },
        data: {
          dateRetourEffective: now,
          statut: 'RETOURNE'
        }
      }),
      prisma.livre.update({
        where: { id: emprunt.livreId },
        data: { disponible: true }
      })
    ]);

    res.json(empruntMisAJour);
  } catch (error) {
    console.error(error);
    if (error.code === 'P2025') return res.status(404).json({ error: 'Ressource non trouvée' });
    res.status(500).json({ error: 'Erreur lors du retour du livre' });
  }
});

// GET /emprunts/en-retard - Lister les emprunts en retard
router.get('/en-retard', async (req, res) => {
  try {
    const now = new Date();
    const empruntsEnRetard = await prisma.emprunt.findMany({
      where: {
        dateRetourEffective: null,
        dateRetourPrevue: { lt: now }
      },
      include: { membre: true, livre: true },
      orderBy: { dateRetourPrevue: 'asc' }
    });
    res.json(empruntsEnRetard);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Erreur lors de la récupération des emprunts en retard' });
  }
});

// GET /emprunts/mettre-a-jour-retards - Met à jour les statuts en retard
router.get('/mettre-a-jour-retards', async (req, res) => {
  try {
    const maintenant = new Date();
    const result = await prisma.emprunt.updateMany({
      where: {
        statut: 'EN_COURS',
        dateRetourPrevue: { lt: maintenant }
      },
      data: { statut: 'EN_RETARD' }
    });
    res.json({ message: `${result.count} emprunt(s) marqué(s) en retard` });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Erreur lors de la mise à jour des retards' });
  }
});

module.exports = router;