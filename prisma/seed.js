/**
 * Script de seed minimal pour peupler la base en développement.
 * Usage: npm run seed
 */
const {PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    // supprimer les données existantes (prudence)
    await prisma.reservation.deleteMany();
    await prisma.emprunt.deleteMany();
    await prisma.livre.deleteMany();
    await prisma.membre.deleteMany();

    const membres = await Promise.all([
        prisma.membre.create({
            data: {nom: 'Dupont', prenom: 'Marie', email: 'marie.dupont@example.com', telephone: '0123456789'}            
        })
    ]);

    const livres = await Promise.all([
        prisma.livre.create({
            data: {titre: 'Les Miserables', isbn: '978-2-253-09633-4', auteur: 'Victor Hugo', editeur: 'Le livre de poche', AnneePublication: 1862, categorie: 'Roman'}
        }), 
        prisma.livre.create({
            data: {titre: 'Le petit Prince', isbn: '978-2-07-061275-8', auteur: 'Antoine de Saint-Exupéry', categorie: 'Conte'}
        }), 
        prisma.livre.create({
            data: {titre: '1984', isbn: '978-0-452-28423-4', auteur: 'George Orwell', categorie: 'Science-fiction'}
        })
    ]);

    // un emprunt en cours
    await prisma.emprunt.create({
        data: { membreId: membres[0].id, 
            livreId: livres[0].id, 
            dateEmprunt: new Date(),
            dateRetourPrevue: new Date(Date.now() + 14*24*60*60*1000), // +14 jours
            statut: 'EN_COURS'
        }
    });

    //une reservation
    await prisma.reservation.create({
        data: {
            membreId: membres[1].id, 
            livreId: livres[0].id, 
            statut: 'ACTIVE',            
        }
    });

    console.log('Seed termine.');
    }

    main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async() => {
        await prisma.$disconnect();
    });