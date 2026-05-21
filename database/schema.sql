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
  id INT AUTO_INCREMENT PRIMARY KEY,
  membre_id INT NOT NULL,
  abonnement_id INT,
  montant DECIMAL(10,2) NOT NULL,
  date_paiement DATE DEFAULT (CURDATE()),
  mode_paiement ENUM('especes','carte','virement') DEFAULT 'especes',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
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

CREATE TABLE `admin` (
  `id` int NOT NULL,
  `email` varchar(200) COLLATE utf8mb4_unicode_ci NOT NULL,
  `mdp` varchar(200) COLLATE utf8mb4_unicode_ci NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
