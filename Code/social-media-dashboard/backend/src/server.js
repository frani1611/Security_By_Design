const express = require('express');
const cors = require('cors');
const { MongoClient, ObjectId } = require('mongodb');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const https = require('https');
const fs = require('fs');
const path = require('path');
const app = express();
const routes = require('./routes/index');

// Load environment variables from .env file
dotenv.config();

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
// Allow frontend origin (use env var if set, otherwise default to localhost:5173)
const allowedOrigin = process.env.CORS_ORIGIN || 'http://localhost:5173';
app.use(cors({ origin: allowedOrigin, methods: ['GET','POST','PUT','DELETE','OPTIONS'], allowedHeaders: ['Content-Type','Authorization'], credentials: true }));
// respond to preflight for all routes
app.options('*', cors({ origin: allowedOrigin }));

// Build MongoDB connection URL (ensure DB name is present)
const envUri = process.env.MONGODB_URI && process.env.MONGODB_URI.trim();
const dbName = process.env.DB_NAME || 'Security_By_Design';

function ensureDbInUri(uri, db) {
  const withoutProtocol = uri.replace(/^mongodb(\+srv)?:\/\//, '');
  const hasDbPath = /\/[^\/?]+/.test(withoutProtocol);
  if (hasDbPath) return uri;
  if (uri.includes('?')) {
    return uri.replace(/\?/, `/${db}?`);
  }
  return uri.replace(/\/+$/, '') + `/${db}`;
}

const admin = process.env.DB_ADMIN;
const password = process.env.DB_PASSWORD;

let mongoUrl = '';
if (envUri) {
  mongoUrl = ensureDbInUri(envUri, dbName);
} else {
  if (!admin || !password) {
    console.error('MongoDB credentials are not set. Set MONGODB_URI or DB_ADMIN/DB_PASSWORD in .env');
    process.exit(1);
  }
  mongoUrl = `mongodb+srv://${admin}:${encodeURIComponent(password)}@cluster0.w7xt7wg.mongodb.net/${dbName}?retryWrites=true&w=majority&appName=Cluster`;
}

// Create single MongoClient for the app (no deprecated options)
const client = new MongoClient(mongoUrl);

let db;
async function start() {
  try {
    await client.connect();
    db = client.db(dbName);

    app.locals.db = db; // Make db accessible in routes/controllers via req.app.locals.db

    // Also connect Mongoose so Mongoose-based models/controllers work
    try {
      await mongoose.connect(mongoUrl);
      console.log('Mongoose connected');
    } catch (mErr) {
      console.error('Mongoose connection error:', mErr);
      // don't exit here; the native client is connected and app can still function for driver-based parts
    }

    console.log('MongoDB connected');
  } catch (err) {
    console.error('MongoDB connection error:', err);
    process.exit(1);
  }
}
start();

// --- Simple auth endpoints for connection testing ---

/**
 * Registriert einen neuen Benutzer.
 * POST /register
 */
app.post('/register', async (req, res) => {
  const { username, email, password } = req.body;
  if (!username || !email || !password) return res.status(400).json({ message: 'Alle Felder erforderlich!' });

  try {
    if (!db) return res.status(500).json({ message: 'DB not connected' });

    const users = db.collection(process.env.DB_COLLECTION_USERS || 'Users');

    const existing = await users.findOne({ $or: [{ username }, { email }] });
    if (existing) return res.status(409).json({ message: 'Benutzername oder E-Mail existiert bereits!' });

    const passwordHash = await bcrypt.hash(password, 10);
    const result = await users.insertOne({
      username,
      email,
      passwordHash,
      createdAt: new Date(),
      name: '',
      description: ''
    });

    res.status(201).json({ message: 'Registrierung erfolgreich!', id: result.insertedId });
  } catch (err) {
    console.error('Register error:', err);
    res.status(500).json({ message: 'Fehler beim Registrieren.' });
  }
});

/**
 * Loggt einen Benutzer ein und gibt ein JWT zurück.
 * POST /login
 */
app.post('/login', async (req, res) => {
  const { username, password } = req.body; // username can be username or email
  if (!username || !password) return res.status(400).json({ message: 'Alle Felder erforderlich!' });

  try {
    if (!db) return res.status(500).json({ message: 'DB not connected' });

    const users = db.collection(process.env.DB_COLLECTION_USERS || 'Users');

    const user = await users.findOne({
      $or: [
        { username: username },
        { email: username }
      ]
    });
    if (!user) return res.status(401).json({ message: 'Ungültige Anmeldedaten!' });

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) return res.status(401).json({ message: 'Ungültige Anmeldedaten!' });

    const token = jwt.sign(
      { _id: user._id.toString(), username: user.username, email: user.email },
      process.env.JWT_SECRET || 'dev-secret',
      { expiresIn: '7d', algorithm: 'HS256' }
    );

    res.json({ message: 'Login erfolgreich!', token });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ message: 'Fehler beim Login.' });
  }
});

// Routes (other API routes)
app.use('/api', routes);


// Start the server
const PORT = process.env.PORT || 5000;

// TLS/HTTPS Configuration
const TLS_ENABLED = process.env.TLS_ENABLED === 'true';
const TLS_CERT_PATH = process.env.TLS_CERT_PATH || path.join(__dirname, '../certs/server.crt');
const TLS_KEY_PATH = process.env.TLS_KEY_PATH || path.join(__dirname, '../certs/server.key');

if (TLS_ENABLED) {
  try {
    const certPath = path.resolve(TLS_CERT_PATH);
    const keyPath = path.resolve(TLS_KEY_PATH);
    
    if (!fs.existsSync(certPath) || !fs.existsSync(keyPath)) {
      console.warn('TLS certificates not found. Run: node generate-certs.js');
      console.warn('Falling back to HTTP...');
      app.listen(PORT, () => {
        console.log(`Server is running on http://localhost:${PORT}`);
      });
    } else {
      const options = {
        cert: fs.readFileSync(certPath),
        key: fs.readFileSync(keyPath)
      };
      https.createServer(options, app).listen(PORT, () => {
        console.log(`Server is running on https://localhost:${PORT}`);
        console.log('TLS/HTTPS enabled');
      });
    }
  } catch (error) {
    console.error('TLS initialization error:', error.message);
    console.log('Falling back to HTTP...');
    app.listen(PORT, () => {
      console.log(`Server is running on http://localhost:${PORT}`);
    });
  }
} else {
  app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
  });
}

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('Shutting down...');
  if (client) await client.close();
  process.exit(0);
});