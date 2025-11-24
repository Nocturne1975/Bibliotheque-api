const express = require('express');
const prisma = require('../prisma');

const router = express.Router();

router.post('/', async(req, res) => {
    try {
    const {nom, prenom, email, telephone} = req.body;
      if (!nom || !prenom || !email || !telephone) {
      return res.status(400).json({
        error: "nom, prenom, email et telephone sont obligatoires"
      });
    }
 
    const membre = await prisma.membre.create({
      data: {
        nom,
        prenom,
        email,
        telephone
      }
    });
 
    res.status(201).json(membre);
  } catch (err) {
    console.error("Erreur POST /membres :", err);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

router.get('/membres')
router.get('/membres/:id')
router.put('/:id', async (req, res) => {
    try {
        const { nom, prenom, email, telephone } = req.body;
        const { id } = req.params;

        if (!nom || !prenom || !email || !telephone) {
            return res.status(400).json({
                error: "nom, prenom, email et telephone sont obligatoires"
            });
        }

        const membre = await prisma.membre.update({
            where: { id: parseInt(id) },
            data: {
                nom,
                prenom,
                email,
                telephone
            }
        });

        res.status(200).json(membre);
    } catch (err) {
        console.error("Erreur PUT /membres/:id :", err);
        res.status(500).json({ error: "Erreur serveur" });
    }
});

router.delete('/:id', async (req, res) => {
    try {
        const id = Number(req.params.id);

        if (isNaN(id)) {
            return res.status(400).json({ error: "ID invalide" });
    }
 
    await prisma.membre.delete({
      where: { id }

    
    });
    res.status(204).send();
  } catch (err) {
    console.error("Erreur DELETE /membres/:id :", err);

    if (err.code === "P2025") {
      return res.status(404).json({ error: "Membre non trouvé" });
    }
 
    res.status(500).json({ error: "Erreur serveur" });
  }
});

router.get('/membres/:id/emprunts', async (req, res) => {
    try {
        const membreId = parseInt(req.params.id);
        const emprunts = await prisma.emprunt.findMany({
            where: { membreId },
            include: { livre: true }
        });
        res.json(emprunts);
    } catch (err) {
        console.error("Erreur GET /membres/:id/emprunts :", err);
        res.status(500).json({ error: "Erreur serveur" });
    }
});
module.exports = router;