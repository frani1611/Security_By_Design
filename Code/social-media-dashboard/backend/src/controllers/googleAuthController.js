// backend/src/controllers/googleAuthController.js
const { OAuth2Client } = require('google-auth-library');
const jwt = require('jsonwebtoken');
const dotenv = require('dotenv');
dotenv.config();

// Hier keine neue MongoClient-Instanz!
const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);


const googleLogin = async (req, res) => {
  const { idToken } = req.body;
  if (!idToken) return res.status(400).json({ message: 'ID token is required' });

  try {
    const ticket = await googleClient.verifyIdToken({
      idToken,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();
    const email = payload.email;
    const name = payload.name || '';
    const googleId = payload.sub;

    console.log(`[GoogleAuth] Login attempt for: ${email}`);

    // DB aus app.locals
    const db = req.app.locals.db;
    const users = db.collection(process.env.DB_COLLECTION_USERS || 'Users');

    let user = await users.findOne({ email });

    if (!user) {
      const username = name.replace(/\s+/g, '_').toLowerCase() || email.split('@')[0];
      const result = await users.insertOne({
        username,
        email,
        passwordHash: null,
        googleId,
        createdAt: new Date(),
      });
      user = { _id: result.insertedId, username, email, googleId };
      console.log(`[GoogleAuth] New user created: ${email}`);
    } else if (!user.googleId) {
      await users.updateOne({ _id: user._id }, { $set: { googleId } });
      console.log(`[GoogleAuth] Linked Google ID to existing user: ${email}`);
    } else {
      console.log(`[GoogleAuth] User exists: ${email}`);
    }

    const token = jwt.sign(
      { id: user._id.toString(), email: user.email },
      process.env.JWT_SECRET || 'dev-secret',
      { expiresIn: '7d' }
    );

    return res.status(200).json({
      message: 'Google login successful',
      token,
      user: {
        id: user._id.toString(),
        email: user.email,
        username: user.username,
      },
    });
  } catch (err) {
    console.error('[GoogleAuth] Error:', err);
    return res.status(401).json({ message: 'Invalid Google token', error: err.message });
  }
};

module.exports = { googleLogin };
