# Bibliotheque API

Prerequis :
- Node.js (>=16)
- npm
- Compte Neon / base PostgreSQL

Installation :
1. git clone ... (ou copier les fichiers)
2. cd bibliotheque-api
3. cp .env.example .env  -> remplir DATABASE_URL avec l'URL fournie par Neon
4. npm install

Prisma :
- Initialiser la base (après avoir configuré .env) :
  npx prisma migrate dev --name init
  npx prisma generate
- Ouvrir Prisma Studio :
  npx prisma studio

Lancer le serveur :
- En dev : npm run dev
- En prod : npm start

Endpoints principaux :
- POST /membres
- GET /membres
- GET /membres/:id
- PUT /membres/:id
- DELETE /membres/:id
- GET /membres/:id/emprunts

- POST /livres
- GET /livres
- GET /livres/:id
- PUT /livres/:id
- DELETE /livres/:id
- GET /livres/recherche?q=...

- POST /emprunts
- GET /emprunts
- GET /emprunts/:id
- PUT /emprunts/:id/retourner
- GET /emprunts/en-retard
- GET /emprunts/mettre-a-jour-retards

Tests :
- Utilisez Postman/Thunder Client en suivant les scénarios fournis dans le cahier des charges.

Remarques :
- Assurez-vous de lancer les migrations Prisma pour créer les tables.
- Les statuts des emprunts sont : EN_COURS, RETOURNE, EN_RETARD.