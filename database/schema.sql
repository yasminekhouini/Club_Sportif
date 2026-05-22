CREATE DATABASE IF NOT EXISTS club_sportif CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE club_sportif;

CREATE TABLE membres (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nom VARCHAR(100) NOT NULL,
  email VARCHAR(100),
  telephone VARCHAR(20),
  date_naissance DATE,
  date_inscription DATE DEFAULT (CURDATE()),
  statut ENUM('actif','inactif','suspendu') DEFAULT 'actif',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE abonnements (
  id INT AUTO_INCREMENT PRIMARY KEY,
  membre_id INT NOT NULL,
  type_abonnement VARCHAR(100) NOT NULL,
  montant DECIMAL(10,2) NOT NULL,
  date_debut DATE NOT NULL,
  date_fin DATE NOT NULL,
  statut ENUM('actif','expire','annule') DEFAULT 'actif',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (membre_id) REFERENCES membres(id) ON DELETE CASCADE
);

CREATE TABLE paiements (
  id               INT AUTO_INCREMENT PRIMARY KEY,
  membre_id        INT NOT NULL,
  type_transaction VARCHAR(100) NOT NULL,
  montant_total    DECIMAL(10,2) NOT NULL,
  montant_paye     DECIMAL(10,2) NOT NULL DEFAULT 0,
  mode_paiement    ENUM('especes','carte','virement','cheque') DEFAULT 'especes',
  statut           ENUM('paye','partiel','en_attente','rembourse') DEFAULT 'en_attente',
  date_paiement    DATE NOT NULL,
  remarque         TEXT,
  created_at       TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (membre_id) REFERENCES membres(id) ON DELETE CASCADE
);


CREATE TABLE reservations (
  id INT AUTO_INCREMENT PRIMARY KEY,
  membre_id INT,
  activite VARCHAR(100) NOT NULL,
  salle VARCHAR(100),
  date_reservation DATE NOT NULL,
  heure_debut TIME NOT NULL,
  heure_fin TIME,
  statut ENUM('confirmee','annulee','en_attente') DEFAULT 'confirmee',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (membre_id) REFERENCES membres(id) ON DELETE SET NULL
);