# 🎮 MiiProject — Instantly Play Games

> **Plateforme de mini-jeux multijoueur en ligne, jouable instantanément dans le navigateur.**

[![Live](https://img.shields.io/badge/Live-miiproject.andries.icu-blue?style=flat-square)](https://miiproject.andries.icu)
[![GitHub](https://img.shields.io/badge/GitHub-MiiProject%2Finstantly--play--games-black?style=flat-square&logo=github)](https://github.com/MiiProject/instantly-play-games)

---

## 1. Nom et objectif de l'application

**MiiProject** est une plateforme web de mini-jeux multijoueur (et solo) jouables instantanément, sans installation, directement depuis un navigateur. L'objectif est de permettre à des amis de rejoindre une partie en quelques secondes via un code de salle, et de s'affronter sur des jeux variés : quiz, dessin, réflexes, puzzle, etc.

Le projet propose également un mode solo avec des adversaires IA pour jouer seul à tout moment.

---

## 2. À quel besoin répond-elle ?

La plupart des plateformes de jeux en ligne nécessitent une inscription, une installation, ou des temps de chargement importants. MiiProject résout ce problème en proposant :

- **Accès immédiat** — un lien, un code de salle, et la partie démarre
- **Pas d'installation** — 100 % dans le navigateur
- **Mode invité** — jouable sans compte (un compte permet de sauvegarder ses stats)
- **Multi-appareils** — responsive, compatible mobile et desktop
- **Mode solo** — chaque jeu dispose d'une version contre l'IA, avec sélection de difficulté

---

## 3. Stack technique

### Frontend
- **React 18** + **TypeScript** — UI composants
- **Vite** — bundler et dev server
- **Tailwind CSS** — styling utilitaire
- **Framer Motion** — animations
- **i18next** — internationalisation (🇫🇷 / 🇬🇧)
- **Supabase JS** — client temps réel (présence, broadcast entre joueurs)

### Backend / Auth
- **Node.js 20** + **Express** — serveur d'authentification custom (`/server`)
- Stockage des utilisateurs en **JSON** (`/data/users.json`) via volume Docker
- Hachage des mots de passe **PBKDF2 + sel** (via `crypto`)
- Envoi d'e-mails de vérification via **Resend**

### Infrastructure
- **Docker** + **Docker Compose** — conteneurisation de l'application complète
- **Nginx** — reverse proxy interne (sert le frontend + proxifie vers l'auth server et LibreTranslate)
- **Proxmox LXC** — hébergement self-hosted sur homelab
- **Nginx Proxy Manager** — gestion SSL + domaine public
- **Cloudflare** — DNS, protection DDoS, proxy
- **LibreTranslate** (instance self-hosted) — traduction des questions du quiz en français

### Jeux disponibles

| Jeu | Mode | Description |
|---|---|---|
| 🎨 Pictionary | Multi / Solo | Dessin + devinettes en temps réel |
| ⚡ Reaction | Multi / Solo | Cliquer en premier sur la forme apparue |
| ❓ Quiz | Multi / Solo | Questions de culture générale via Open Trivia DB + IA |
| 🐸 Frogger | Multi / Solo | Traverser la route sans se faire écraser |
| 🦕 Dino Runner | Solo | Éviter les obstacles à l'infini |
| 🔴 Connect 4 | Multi | Aligner 4 jetons |
| ❌ TicTacToe | Multi / Solo | Morpion classique (bot Minimax en solo) |
| 🐍 Snake | Solo | Manger des pommes sans se mordre la queue |
| 🃏 Memory | Multi / Solo | Retrouver les paires de cartes |

---

## 4. Outils IA utilisés et comment

L'intégralité du code source a été **générée par IA** via **[Lovable](https://lovable.dev)**, un outil de développement web piloté par prompt (basé sur Claude / GPT-4).

### Workflow de développement

1. **Conception via prompts** — description des fonctionnalités souhaitées en langage naturel
2. **Génération de code** — Lovable produit les composants React, les hooks, la logique de jeu
3. **Itérations** — correction des bugs et ajout de fonctionnalités via prompts de suivi
4. **Déploiement manuel** — les fichiers générés sont ensuite intégrés dans l'infrastructure self-hosted

Le développement infrastructure (Docker, Nginx, Cloudflare, Proxmox) a quant à lui été réalisé manuellement.

---

## 5. Exemples de prompts utilisés

### Prompt 1 — Génération du jeu Quiz avec traduction dynamique
> *"Ajoute au QuizGame la possibilité de récupérer des questions depuis l'Open Trivia Database API, et traduis-les automatiquement en français via un appel à mon instance LibreTranslate self-hosted sur `172.23.71.92:5001`. Gère le fallback si la traduction échoue."*

**Résultat :** Le fichier `generateQuestions.ts` a été créé avec la logique de fetch vers l'API OTDb, la normalisation des questions HTML, et un appel `POST /translate` vers LibreTranslate. Un bouton "🇫🇷 Traduire" a également été ajouté in-game.

---

### Prompt 2 — Système d'authentification avec vérification par e-mail
> *"Crée un serveur Express minimaliste qui gère l'inscription, la connexion et la suppression de compte. Les mots de passe doivent être hashés avec PBKDF2. À l'inscription, envoie un e-mail de vérification avec un code à 6 chiffres via l'API Resend. L'utilisateur ne peut pas se connecter tant que son compte n'est pas vérifié."*

**Résultat :** Le fichier `server/server.js` complet avec les routes `/auth/register`, `/auth/verify`, `/auth/login`, `/auth/update/:id`, `/auth/delete/:id`, les e-mails HTML stylisés aux couleurs de MiiProject, et la gestion des codes de vérification.

---

### Prompt 3 — Jeu Frogger solo avec génération procédurale
> *"Crée un jeu Frogger en Canvas avec une génération de niveaux procédurale infinie. Le joueur contrôle un poulet. Il y a des routes avec voitures/camions, des rivières avec des troncs, des voies ferrées avec alarme avant l'arrivée du train, et des zones sûres. Ajoute un système de checkpoint, de vies, et de score."*

**Résultat :** Le composant `FroggerGame.tsx` (~600 lignes), entièrement en Canvas 2D, avec algorithme de génération de lignes, physique de dérive sur les troncs, détection de collision précise et rendu de personnages dessinés programmatiquement.

---

## 6. Principaux défis rencontrés

### Synchronisation multijoueur sans serveur dédié
Le système multijoueur repose sur le **broadcast Supabase Realtime** (WebSocket pub/sub). L'hôte de la salle fait autorité sur l'état du jeu : les clients non-hôtes envoient des requêtes de mouvement, l'hôte les valide et rediffuse le nouvel état à tous. Ce pattern a demandé plusieurs itérations pour éviter les race conditions et les désynchronisations.

### Traduction dynamique self-hosted
L'intégration de LibreTranslate a nécessité de configurer le proxy Nginx correctement (`location /api/translate`) pour éviter les problèmes CORS entre le frontend (servi depuis le conteneur Docker) et l'instance LibreTranslate sur le réseau Proxmox interne.

### Containerisation avec processus multiples
L'image Docker embarque à la fois Nginx (frontend) et Node.js (auth server), démarrés via `start.sh`. Gérer l'ordre de démarrage et s'assurer que les dépendances npm (`resend`, `dotenv`) étaient bien installées dans le layer final a nécessité des corrections dans le `Dockerfile`.

### Vérification e-mail et flux de redirection
L'intégration de Resend avec un domaine custom (`@andries.icu`) a requis la configuration des enregistrements DNS DKIM/SPF sur Cloudflare. Le flux de vérification (e-mail → lien → modal automatique avec pré-remplissage du code) a également demandé une gestion fine des query params et de l'état de l'UI.

---

## 7. Application hébergée

🌐 **[https://miiproject.andries.icu](https://miiproject.andries.icu)**

---

## 8. Dépôt GitHub

📦 **[https://github.com/MiiProject/instantly-play-games](https://github.com/MiiProject/instantly-play-games)**

---

## Installation locale (optionnel)

```bash
git clone https://github.com/MiiProject/instantly-play-games.git
cd instantly-play-games

# Créer le fichier d'environnement
cp .env.example .env
# Remplir : VITE_SUPABASE_URL, VITE_SUPABASE_PUBLISHABLE_KEY, RESEND_API_KEY, APP_PORT

# Lancer avec Docker
docker compose up --build
```

L'application sera accessible sur `http://localhost:3000` (ou le port défini dans `APP_PORT`).

---

*MiiProject — Jouez, gagnez, recommencez.*
