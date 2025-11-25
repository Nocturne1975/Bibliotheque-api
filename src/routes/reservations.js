const express = require('express');
const prisma = require('../prisma');

const router = express.Router();

//POST /reservations - Creer une reservation
router.post('/', async (req, res) => {
    try {
        const {membreId, livreId} = req.body;
        if (!membreId || !livreId) return res.status(400).json({error: 'membreId et livreId sont requis'});

        const membre = await prisma.membre.findUnique({where: {id: membreId}});
        if (!membre) return res.status(404).json({error: 'Membre non trouvé'});

        const livre = await prisma.livre.findUnique({where: {id: livreId}});
        if (!livre) return res.status(404).json({error: 'Livre non trouvé'});

        const reservation = await prisma.reservation.create({
            data: {membreId, livreId, statut: 'ACTIVE' }
        });
        res.status(201).json(reservation);
    } catch (error) {
        console.error(error);
        res.status(500).json({error: 'Erreur lors de la création de la réservation'});
    }
});

//GET /reservations - Lister les reservations (filtre par statut possible)
router.get('/', async (req, res) => {
    try {
        const {statut} = req.query;
        const where = {};
        if (statut) where.statut = statut;

        const reservations = await prisma.reservation.findMany({
            where,
            include: {membre: true, livre: true},
            orderBy: {dateReservation: 'desc'}
        });
        res.json(reservations);
    } catch (error) {
        console.error(error);
        res.status(500).json({error: 'Erreur lors de la récupération des réservations'});
    }
});

//DELETE /reservations/:id - Annuler une reservation
router.delete('/:id', async (req, res) => {
    try {
        const id = Number(req.params.id);
        if (Number.isNaN(id)) return res.status(400).json({error: 'ID invalide'});

        await prisma.reservation.delete({where: {id}});
        res.status(204).send();
    } catch (error) {
        console.error(error);
        if (error.code === 'p2025') return res.status(404).json({error: 'Réservation non trouvée'});
        res.status(500).json({error: 'Erreur lors de la suppression de la réservation'});
    }
});

module.exports = router;