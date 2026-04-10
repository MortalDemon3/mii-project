require('dotenv').config();
const express = require('express');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { Resend } = require('resend');

const app = express();
app.use(express.json());

const resend = new Resend(process.env.RESEND_API_KEY);

const DATA_DIR = '/data';
const USERS_FILE = path.join(DATA_DIR, 'users.json');

if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
if (!fs.existsSync(USERS_FILE)) fs.writeFileSync(USERS_FILE, '[]', 'utf8');

function readUsers() {
  return JSON.parse(fs.readFileSync(USERS_FILE, 'utf8'));
}

function writeUsers(users) {
  fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2), 'utf8');
}

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(password, salt, 10000, 64, 'sha512').toString('hex');
  return `${salt}:${hash}`;
}

function verifyPassword(password, stored) {
  const [salt, hash] = stored.split(':');
  const verify = crypto.pbkdf2Sync(password, salt, 10000, 64, 'sha512').toString('hex');
  return hash === verify;
}

// --- INSCRIPTION ---
app.post('/auth/register', async (req, res) => {
  const { email, password, username } = req.body;
  if (!email || !password || !username) return res.status(400).json({ error: 'missing_fields' });

  const users = readUsers();
  if (users.find(u => u.email.toLowerCase() === email.toLowerCase())) {
    return res.status(409).json({ error: 'email_taken' });
  }

  const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();

  const user = {
    id: crypto.randomUUID(),
    email: email.toLowerCase().trim(),
    password: hashPassword(password),
    username: username.trim(),
    createdAt: new Date().toISOString(),
    isVerified: false,
    verificationCode: verificationCode
  };

  users.push(user);
  writeUsers(users);

  // Génération du lien direct pour le frontend
  const verificationUrl = `https://miiproject.andries.icu/?action=verify&email=${encodeURIComponent(user.email)}`;

  try {
    await resend.emails.send({
      from: 'MiiProject <verification@andries.icu>',
      to: user.email,
      subject: `${verificationCode} est ton code de validation MiiProject`,
      html: `
        <!DOCTYPE html>
<html>

<body
  style="margin: 0; padding: 0; background-color: #0f172a; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; color: #ffffff;">
  <div
    style="max-width: 600px; margin: 0 auto; padding: 40px 20px; background: #1e293b; border-radius: 16px; margin-top: 20px; border: 1px solid #334155;">

    <!-- Header / Logo -->
    <div style="text-align: center; margin-bottom: 30px;">
      <h1 style="color: #D7376E; margin: 0; font-size: 28px; letter-spacing: 1px;">MiiProject</h1>
    </div>

    <!-- Content -->
    <div style="background: #3F455C; padding: 30px; border-radius: 12px; text-align: center;">
      <h2 style="margin-top: 0; color: #f8fafc;">Salut ${user.username} ! 👋</h2>
      <p style="color: #94a3b8; font-size: 16px; line-height: 1.5;">
        Prêt à lancer une partie ? Pour activer ton compte et rejoindre l'arène, utilise le code de vérification
        ci-dessous :
      </p>

      <div
        style="margin: 30px 0; padding: 20px; background: #7C649E; color: #0f172a; font-size: 42px; font-weight: 800; letter-spacing: 8px; border-radius: 8px; box-shadow: 0 4px 15px rgba(56, 189, 248, 0.3);">
        ${verificationCode}
      </div>

      <p style="color: #64748b; font-size: 14px;">
        Ce code expirera bientôt. Si tu n'as pas créé de compte, ignore simplement cet e-mail.
      </p>
    </div>

    <!-- Footer -->
    <div style="text-align: center; margin-top: 30px; color: #475569; font-size: 12px;">
      <p>&copy; ${new Date().getFullYear()} MiiProject. Tous droits réservés.</p>
      <p>Jouez, gagnez, recommencez.</p>
    </div>

  </div>
</body>

</html>
      `
    });
    console.log(`[MAIL] Envoyé à ${user.email} (Code: ${verificationCode})`);
  } catch (error) {
    console.error("[MAIL ERROR]", error);
  }

  res.json({ message: 'verification_required', email: user.email });
});

// --- VÉRIFICATION ---
app.post('/auth/verify', (req, res) => {
  const { email, code } = req.body;
  const users = readUsers();
  const userIndex = users.findIndex(u => u.email === email.toLowerCase().trim());

  if (userIndex === -1) return res.status(404).json({ error: 'user_not_found' });

  const user = users[userIndex];
  if (user.isVerified) return res.status(400).json({ error: 'already_verified' });

  if (user.verificationCode !== code) {
    return res.status(401).json({ error: 'invalid_code' });
  }

  users[userIndex].isVerified = true;
  delete users[userIndex].verificationCode;
  writeUsers(users);

  res.json({ success: true });
});

// --- CONNEXION (Interception 403 si non vérifié) ---
app.post('/auth/login', (req, res) => {
  const { email, password } = req.body;
  const users = readUsers();
  const user = users.find(u => u.email === email.toLowerCase().trim());

  if (!user || !verifyPassword(password, user.password)) {
    return res.status(401).json({ error: 'invalid_credentials' });
  }

  if (!user.isVerified) {
    return res.status(403).json({ error: 'account_not_verified' });
  }

  res.json({ id: user.id, email: user.email, username: user.username });
});

// --- UPDATE & DELETE (identiques) ---
app.put('/auth/update/:id', (req, res) => {
  const { id } = req.params;
  const { username, email, currentPassword, newPassword } = req.body;
  const users = readUsers();
  const idx = users.findIndex(u => u.id === id);
  if (idx === -1) return res.status(404).json({ error: 'user_not_found' });
  const user = users[idx];
  if (email) user.email = email.toLowerCase().trim();
  if (username) user.username = username.trim();
  if (newPassword && verifyPassword(currentPassword, user.password)) user.password = hashPassword(newPassword);
  users[idx] = user;
  writeUsers(users);
  res.json({ id: user.id, email: user.email, username: user.username });
});

app.delete('/auth/delete/:id', (req, res) => {
  const { id } = req.params;
  let users = readUsers();
  users = users.filter(u => u.id !== id);
  writeUsers(users);
  res.json({ success: true });
});

app.listen(3001, () => console.log('Auth server running on port 3001'));