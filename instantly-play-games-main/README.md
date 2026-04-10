# Welcome to your Lovable project

TODO: Document your project here

1.  Quel est le nom et l'objectif de votre app ?
  MiiProject est une application qui regroupe plusieurs petits jeux jouable en ligne en multijoueur
2.  À quel besoin répond-elle ?
  Divertissement
3.  Quelle stack technique avez-vous utilisée ?

4.  Quels outils IA ont été utilisés et comment ?
   - Lovable / Rocket / Bolt / V0 : structure du projet
   - Supabase : stocker les données de l'application et gerer les Api
   - Claude / Gemini : Modification et correction des fichiers
5.  Donnez 2-3 exemples de prompts utilisés et ce qu'ils ont produit

''' Build a complete, fully functional and deployable multiplayer mini-game web application called "MiiProject".

Core concept
A web platform where users can instantly play simple mini-games online with other people. Open the site, pick a game, join or create a lobby, and play. Fast, fun, frictionless. Players can join as guests or create an account to unlock a persistent personalized profile.

Tech stack (choose the most appropriate)
React + TypeScript frontend

Real-time multiplayer via Supabase Realtime

Supabase for backend (database, realtime, auth)

Tailwind CSS for styling

Fully containerized for self-hosting

Authentication & player identity
Users can play as a guest instantly (just enter a username, no sign-up needed)

Users can also create an account (email + password via Supabase Auth) to unlock a persistent profile

Logged-in users get a customizable character/avatar:

Choose from a set of fun preset avatars OR upload a profile picture

Set a display name and a short status/bio

Track their stats across sessions: games played, wins, best scores per mini-game

Guest players see a prompt after each game inviting them to create an account to save their progress

In the lobby, logged-in players display their custom avatar; guests show an auto-generated initial-based avatar

Account dashboard: simple profile page where the user can edit their avatar, display name, and view their stats history

User flow
Landing page → choose a mini-game

Enter a username or log into your account

Create a lobby (get a shareable room code) OR join one with a code

Wait in a lobby screen showing connected players with their avatars

Host starts the game → everyone plays in real-time

Scoreboard at the end → option to replay or go back to menu

Mini-games to implement (start with these 3, make them fully playable)
1. 🎨 Pictionary-style drawing game
One player draws a word, others guess in a chat

Timer per round, points for guessing fast

Simple canvas drawing tool (brush, color picker, eraser)

Word is secret for the drawer, hidden for others

2. ⚡ Reaction speed game
A shape/color appears on screen randomly

First player to click/tap it wins the round

Multiple rounds, cumulative score

Works well on both desktop and mobile

3. ❓ Quiz / Trivia
Host selects a category

Multiple choice questions shown to all players simultaneously

Points based on speed + correctness

Leaderboard updates live after each question

UI/UX requirements
Bold, playful, modern design — think a mix of Jackbox + Among Us lobby vibes

Mobile-first and fully responsive

Smooth animations and transitions

Each game has its own distinct color theme

Lobby screen shows player avatars prominently

Room code displayed prominently and easy to share/copy

Technical requirements
Real-time sync: all game state changes must be reflected instantly for all players via Supabase Realtime channels

Handle disconnections gracefully (player leaves → game continues or host is reassigned)

Room/lobby system with unique codes

Maximum ~8 players per lobby

Use Supabase entirely for backend (no custom WebSocket server to manage)

All configuration via environment variables (API URL, Supabase URL, Supabase anon key, etc.) — no hardcoded values

Hosting & deployment target
This app will be self-hosted on a Proxmox server (LXC container running Ubuntu 22.04).

Provide a Dockerfile AND a docker-compose.yml

The app must work correctly behind an Nginx reverse proxy

No dependency on Vercel/Netlify-specific features

Everything must run in a standard Node.js/Docker environment

document the required environment variables in a .env.example file

Additional details
The app name is "MiiProject" — display it prominently in the header with a fun logo/wordmark

Include a simple how-to-play tooltip or modal for each game

Add sound effects for key interactions (correct answer, wrong answer, round start)

Add a fun loading/waiting animation in the lobby

Build the entire application, fully wired up and working. Prioritize real-time multiplayer functionality above all else. Do not scaffold or leave TODOs — every feature listed must be implemented and functional.''' envoyer à Lovable

--> Premier version 
https://ibb.co/KpPWHQsG

'''ODAA génère moi un prompt pour l'ia lovable pour un projet transversalle pour mes cours ou le but est d'utiliser 100% l'ia sans utiliser la moindre ligne de code aucune limite en terme de compléxiter du code, on veut que ce soit fonctionnel et déployable. Voici notre idée :



Nom du projet : MiiProject

Idée : aplication web ou le but est de pouvoir jouer en ligne a plusieurs a des mini jeux (pas besoin d'avoir des jeux compliquer) le but est vraiment de pouoir jouer en ligne de facon simple et rapide, on lance le site, on séléctionne le mini jeux puis on rejoint un lobby pour s'amuser''' envoyer à Claude

--> on a utiliser ODDA pour que claude génére un schéma du problème et pour générer le prompt pour Lovable comme conseiller dans le cour 


