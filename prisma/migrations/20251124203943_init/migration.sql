-- CreateEnum
CREATE TYPE "StatutEmprunt" AS ENUM ('EN_COURS', 'RETOURNE', 'EN_RETARD');

-- CreateTable
CREATE TABLE "Membre" (
    "id" SERIAL NOT NULL,
    "nom" TEXT NOT NULL,
    "prenom" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "telephone" TEXT,
    "dateInscription" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actif" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "Membre_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Livre" (
    "id" SERIAL NOT NULL,
    "titre" TEXT NOT NULL,
    "isbn" TEXT NOT NULL,
    "auteur" TEXT NOT NULL,
    "editeur" TEXT,
    "anneePublication" INTEGER,
    "categorie" TEXT,
    "disponible" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "Livre_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Emprunt" (
    "id" SERIAL NOT NULL,
    "membreId" INTEGER NOT NULL,
    "livreId" INTEGER NOT NULL,
    "dateEmprunt" TIMESTAMP(3) NOT NULL,
    "dateRetourPrevue" TIMESTAMP(3) NOT NULL,
    "dateRetourEffective" TIMESTAMP(3),
    "statut" "StatutEmprunt" NOT NULL,
    "prolonge" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "Emprunt_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Membre_email_key" ON "Membre"("email");

-- CreateIndex
CREATE INDEX "Membre_email_idx" ON "Membre"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Livre_isbn_key" ON "Livre"("isbn");

-- CreateIndex
CREATE INDEX "Livre_isbn_idx" ON "Livre"("isbn");

-- CreateIndex
CREATE INDEX "Livre_categorie_idx" ON "Livre"("categorie");

-- CreateIndex
CREATE INDEX "Livre_auteur_idx" ON "Livre"("auteur");

-- CreateIndex
CREATE INDEX "Emprunt_membreId_idx" ON "Emprunt"("membreId");

-- CreateIndex
CREATE INDEX "Emprunt_livreId_idx" ON "Emprunt"("livreId");

-- CreateIndex
CREATE INDEX "Emprunt_statut_idx" ON "Emprunt"("statut");

-- AddForeignKey
ALTER TABLE "Emprunt" ADD CONSTRAINT "Emprunt_membreId_fkey" FOREIGN KEY ("membreId") REFERENCES "Membre"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Emprunt" ADD CONSTRAINT "Emprunt_livreId_fkey" FOREIGN KEY ("livreId") REFERENCES "Livre"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
