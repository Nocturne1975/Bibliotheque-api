// Routes pour la gestion des livres
const express = require('express');
const prisma = require('../prisma');

const router = express.Router();

// POST /livres - Ajouter un livre
router.post('/', async (req, res) => {
  try {
    const { titre, isbn, auteur, editeur, anneePublication, categorie } = req.body;
    if (!titre || !isbn || !auteur) {
      return res.status(400).json({
        error: 'titre, isbn et auteur sont obligatoires'
      });
    }

    const livre = await prisma.livre.create({
      data: {
        titre,
        isbn,
        auteur,
        editeur: editeur || null,
        anneePublication: anneePublication || null,
        categorie: categorie || null,
        disponible: true
      }
    });
    res.status(201).json(livre);
  } catch (err) {
    console.error('Erreur POST /livres :', err);
    if (err.code === 'P2002') {
      return res.status(400).json({ error: 'ISBN déjà utilisé' });
    }
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// GET /livres - Lister les livres (filtres)
router.get('/', async (req, res) => {
  try {
    const { disponible, categorie, auteur } = req.query;

    const where = {};
    if (disponible !== undefined) {
      where.disponible = disponible === 'true';
    }
    if (categorie) {
      where.categorie = categorie;
    }
    if (auteur) {
      where.auteur = { contains: auteur, mode: 'insensitive' };
    }

    const livres = await prisma.livre.findMany({
      where,
      include: {
        _count: { select: { emprunts: true } },
        emprunts: { where: { statut: 'EN_COURS' }, select: { id: true } }
      },
      orderBy: { titre: 'asc' }
    });

    const result = livres.map(l => {
      const empruntsEnCours = l.emprunts ? l.emprunts.length : 0;
      return {
        id: l.id,
        titre: l.titre,
        isbn: l.isbn,
        auteur: l.auteur,
        editeur: l.editeur,
        anneePublication: l.anneePublication,
        categorie: l.categorie,
        disponible: typeof l.disponible === 'boolean' ? l.disponible : empruntsEnCours === 0,
        empruntsCount: l._count ? l._count.emprunts : empruntsEnCours
      };
    });

    res.json(result);
  } catch (err) {
    console.error('Erreur GET /livres :', err);
    res.status(500).json({ error: 'Erreur lors de la récupération des livres' });
  }
});

// GET /livres/:id - Détails d'un livre
router.get('/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (Number.isNaN(id)) return res.status(400).json({ error: 'ID invalide' });

    const livre = await prisma.livre.findUnique({
      where: { id },
      include: { _count: { select: { emprunts: true } } }
    });
    if (!livre) return res.status(404).json({ error: 'Livre non trouvé' });

    res.json({
      ...livre,
      disponible: typeof livre.disponible === 'boolean' ? livre.disponible : (livre._count.emprunts === 0)
    });
  } catch (err) {
    console.error('Erreur GET /livres/:id :', err);
    res.status(500).json({ error: 'Erreur lors de la récupération du livre' });
  }
});

// PUT /livres/:id - Modifier un livre
router.put('/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (Number.isNaN(id)) return res.status(400).json({ error: 'ID invalide' });

    const { titre, isbn, auteur, editeur, anneePublication, categorie, disponible } = req.body;
    const data = {};
    if (titre !== undefined) data.titre = titre;
    if (isbn !== undefined) data.isbn = isbn;
    if (auteur !== undefined) data.auteur = auteur;
    if (editeur !== undefined) data.editeur = editeur;
    if (anneePublication !== undefined) data.anneePublication = anneePublication;
    if (categorie !== undefined) data.categorie = categorie;
    if (disponible !== undefined) data.disponible = disponible;

    const livre = await prisma.livre.update({
      where: { id },
      data
    });
    res.json(livre);
  } catch (err) {
    console.error('Erreur PUT /livres/:id :', err);
    if (err.code === 'P2025') {
      return res.status(404).json({ error: 'Livre non trouvé' });
    }
    if (err.code === 'P2002') {
      return res.status(400).json({ error: 'ISBN déjà utilisé' });
    }
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// DELETE /livres/:id - Supprimer un livre
router.delete('/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (Number.isNaN(id)) return res.status(400).json({ error: 'ID invalide' });

    await prisma.livre.delete({ where: { id } });
    res.status(204).send();
  } catch (err) {
    console.error('Erreur DELETE /livres/:id :', err);
    if (err.code === 'P2025') {
      return res.status(404).json({ error: 'Livre non trouvé' });
    }
    res.status(500).json({ error: 'Erreur lors de la suppression du livre' });
  }
});

// GET /livres/recherche - Recherche avancée
router.get('/recherche', async (req, res) => {
  try {
    const { q } = req.query;
    if (!q) return res.status(400).json({ error: "Paramètre de recherche 'q' est requis" });

    const livres = await prisma.livre.findMany({
      where: {
        OR: [
          { titre: { contains: q, mode: 'insensitive' } },
          { auteur: { contains: q, mode: 'insensitive' } },
          { isbn: { contains: q, mode: 'insensitive' } },
          { editeur: { contains: q, mode: 'insensitive' } },
          { categorie: { contains: q, mode: 'insensitive' } }
        ]
      },
      include: {
        _count: { select: { emprunts: true } },
        emprunts: { where: { statut: 'EN_COURS' }, select: { id: true } }
      }
    });

    const result = livres.map(l => {
      const empruntsEnCours = l.emprunts ? l.emprunts.length : 0;
      return {
        id: l.id,
        titre: l.titre,
        isbn: l.isbn,
        auteur: l.auteur,
        editeur: l.editeur,
        anneePublication: l.anneePublication,
        categorie: l.categorie,
        disponible: typeof l.disponible === 'boolean' ? l.disponible : empruntsEnCours === 0,
        empruntsCount: l._count ? l._count.emprunts : empruntsEnCours
      };
    });

    res.json(result);
  } catch (err) {
    console.error("Erreur GET /livres/recherche :", err);
    res.status(500).json({ error: 'Erreur lors de la recherche des livres' });
  }
});

module.exports = router;