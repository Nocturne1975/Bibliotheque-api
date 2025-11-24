// Routes pour la gestion des livres
const express = require('express');
const prisma = require('../prisma');

const router = express.Router();

router.post('/', async (req, res) => {
    const {titre, isbn, auteur, editeur, anneePublication, categorie} = req.body;
    if (!titre || !isbn || !auteur) {
        return res.status(400).json({
            error: "titre, isbn et auteur sont obligatoires"
        });
    }
    try {
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
        console.error("Erreur POST /livres :", err);
        res.status(500).json({ error: "Erreur serveur" });
    }
});

router.get('/', async (req, res) => {
    try {
        const {disponible, categorie, auteur} = req.query;

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

        const livres = await prisma.livre.findMany({ where, 
            include: {
                emprunts: {
                    where: { statut: 'EN_COURS'}, 
                    select: { emprunts: true }
                }
            }
        });

        const result = livres.map(l => {
            const computedDisponible = (l.emprunts.length === 0);
            const {emprunts, ...rest} = l;
            return {
                ...rest,
                disponible: computedDisponible, 
                empruntsCount: rest._count ? rest._count.emprunts : 0
            };
        });
        
        res.json(result);
    } catch (err) {
        console.error("Erreur GET /livres :", err);
        res.status(500).json({ error: "Erreur lors de la récupération des livres" });
    }
});

router.get('/:id', async (req, res) => {
    const id = Number(req.params.id);
    if (Number.isNaN(id)) return res.status(400).json({ error: "ID invalide" });

    try {
        const livre = await prisma.livre.findUnique({
            where: { id },
            include: {
                _count: {select: { emprunts: true }}
            }
        });
        if (!livre) {
            return res.status(404).json({ error: "Livre non trouvé" });
        }
        res.json({
            ...livre,
            disponible: livre._count.emprunts === 0
        });

        } catch (err) {
        console.error("Erreur GET /livres/:id :", err);
        res.status(500).json({ error: "Erreur lors de la récupération du livre" });
    }
});

router.put('/:id', async (req, res) => {
    const id = Number(req.params.id);
    if (Number.isNaN(id)) return res.status(400).json({ error: "ID invalide" });

    const {titre, isbn, auteur, editeur, anneePublication, categorie} = req.body;
    if (titre !== undefined) data.titre = titre;
    if (isbn !== undefined) data.isbn = isbn;
    if (auteur !== undefined) data.auteur = auteur;
    if (editeur !== undefined) data.editeur = editeur;
    if (anneePublication !== undefined) data.anneePublication = anneePublication;
    if (categorie !== undefined) data.categorie = categorie;
    if (disponible !== undefined) data.disponible = disponible;

    try {
        const livre = await prisma.livre.update({
            where: { id },
            data
        });
        res.json(livre);
    } catch (err) {
        console.error("Erreur PUT /livres/:id :", err);
        res.status(500).json({ error: "Erreur serveur" });
    }
});

router.delete('/:id', async (req, res) => {
    const id = Number(req.params.id);
    if (Number.isNaN(id)) return res.status(400).json({ error: "ID invalide" });

    try {
        await prisma.livre.delete({
            where: { id }
        });
        res.status(204).send();
    } catch (err) {
        console.error("Erreur DELETE /livres/:id :", err);
        res.status(500).json({ error: "Erreur lors de la suppression du livre" });
    }
});

router.get('/recherche', async (req, res) => {
    try {
        const {q} = req.query;
        if (!q) {
            return res.status(400).json({ error: "Paramètre de recherche 'q' est requis" });
        }

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
                emprunts: {
                    where: { statut: 'EN_COURS'}, 
                    select: { emprunts: true }
                }, 
                _count: { select: { emprunts: true } }
            }
        });

        const result = livres.map(l => {
            const computedDisponible = (l.emprunts.length === 0);
            const {emprunts, ...rest} = l;
            return {
                ...rest,
                disponible: computedDisponible, 
                empruntsCount: rest._count ? rest._count.emprunts : 0
            };
        });

        res.json(result);
    } catch (err) {
        console.error("Erreur GET /livres/recherche :", err);
        res.status(500).json({ error: "Erreur lors de la recherche des livres" });
    }       
});
module.exports = router;