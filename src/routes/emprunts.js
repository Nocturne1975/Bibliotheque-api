// Routes pour la gestion des emprunts
const express = require('express');
const prisma = require('../prisma');
const { act } = require('react');

const router = express.Router();

async function peutEmprunter(membreId) {
    const membre = await prisma.membre.findUnique({
        where: { id: membreId },
        select: {id: true, actif: true }
    });
    if (!membre) return false;
    if (!membre.actif) return false;

    const now = new Date();

    const countEnCours = await prisma.emprunt.count({
        where: {membreId, statut: 'EN_COURS' }
    });
    if (countEnCours >= 5) return false;

    countEnRetard = await prisma.emprunt.count({
        where: {
            membreId, 
            dateRetourEffective: null, 
            dateRetourPrevue: {lt: now }
        }
    });
    if (countEnRetard > 0) return false;

    return true;
}

function calculerDateRetour(dateEmprunt) {
    const MILLISECONDS_IN_A_DAY = 24 * 60 * 60 * 1000;
    const dureeEmpruntJours = 14;
    const dateRetour = new Date(dateEmprunt.getTime() + dureeEmpruntJours * MILLISECONDS_IN_A_DAY);
    return dateRetour;
}

router.post('/', async (req, res) => {
    try {
        const { membreId, livreId } = req.body;
        if (!membre) return res.status(404).json({ error: 'Membre non trouvé' });
    if (!membre.actif) return res.status(400).json({ error: 'Membre inactif' });

    
    const livre = await prisma.livre.findUnique({
      where: { id: livreId }
    });
    if (!livre) return res.status(404).json({ error: 'Livre non trouvé' });
    
    if (livre.disponible === false) {
      return res.status(400).json({ error: 'Livre non disponible' });
    }
    
    const empruntEnCoursCount = await prisma.emprunt.count({
      where: { livreId, statut: 'EN_COURS' }
    });
    if (empruntEnCoursCount > 0) {
      return res.status(400).json({ error: 'Livre actuellement emprunté' });
    }

    
    const autorise = await peutEmprunter(membreId);
    if (!autorise) {
      return res.status(400).json({ error: 'Le membre ne peut pas emprunter (limite ou emprunt en retard ou inactif)' });
    }

    
    const now = new Date();
    const dateRetourPrevue = calculerDateRetour(now);

    
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
      include: {
        membre: true,
        livre: true
      },
      orderBy: { dateEmprunt: 'desc' }
    });


    res.json(emprunts);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Erreur lors de la récupération des emprunts' });
  }
});


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
    if (!emprunt.dateRetourEffective && emprunt.dateRetourPrevue < now) {
      computedStatut = 'EN_RETARD';
    }

    res.json({ ...emprunt, statut: computedStatut });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Erreur lors de la récupération de l’emprunt' });
  }
});


router.put('/:id/retourner', async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (Number.isNaN(id)) return res.status(400).json({ error: 'id invalide' });

    const emprunt = await prisma.emprunt.findUnique({
      where: { id }
    });
    if (!emprunt) return res.status(404).json({ error: 'Emprunt non trouvé' });

    if (emprunt.dateRetourEffective) {
      return res.status(400).json({ error: 'Livre déjà retourné' });
    }

    const now = new Date();

  
    const [empruntMisAJour] = await prisma.$transaction([
      prisma.emprunt.update({
        where: { id },
        data: {
          dateRetourEffective: now,
         
          statut: 'TERMINE'
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
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Ressource non trouvée' });
    }
    res.status(500).json({ error: 'Erreur lors du retour du livre' });
  }
});


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



module.exports = router;