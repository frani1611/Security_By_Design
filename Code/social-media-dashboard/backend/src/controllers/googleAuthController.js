// backend/src/controllers/googleAuthController.js
const { OAuth2Client } = require('google-auth-library');
const jwt = require('jsonwebtoken');
const dotenv = require('dotenv');
const logger = require('../utils/logger');
dotenv.config();

// Hier keine neue MongoClient-Instanz!
const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);


const googleLogin = async (req, res) => {
  const { idToken } = req.body;
  if (!idToken) {
    logger.warn('Google OAuth attempt without token', {
      event: 'OAUTH_NO_TOKEN',
      ip: req.ip,
      userAgent: req.headers['user-agent']
    });
    return res.status(400).json({ message: 'ID token is required' });
  }

  try {
    logger.info('Google OAuth verification started', {
      event: 'OAUTH_START',
      ip: req.ip,
      userAgent: req.headers['user-agent']
    });

    const ticket = await googleClient.verifyIdToken({
      idToken,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();
    const email = payload.email;
    const name = payload.name || '';
    const googleId = payload.sub;

    logger.info('Google OAuth token verified', {
      event: 'OAUTH_TOKEN_VERIFIED',
      email: email,
      googleId: googleId,
      ip: req.ip
    });

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
      logger.info('New user created via Google OAuth', {
        event: 'OAUTH_USER_CREATED',
        userId: result.insertedId.toString(),
        email: email,
        username: username,
        googleId: googleId,
        ip: req.ip,
        userAgent: req.headers['user-agent']
      });
    } else if (!user.googleId) {
      await users.updateOne({ _id: user._id }, { $set: { googleId } });
      logger.info('Google ID linked to existing user', {
        event: 'OAUTH_ACCOUNT_LINKED',
        userId: user._id.toString(),
        email: email,
        googleId: googleId,
        ip: req.ip
      });
    } else {
      logger.info('Existing Google user logged in', {
        event: 'OAUTH_EXISTING_USER',
        userId: user._id.toString(),
        email: email,
        ip: req.ip
      });
    }

    const token = jwt.sign(
      { id: user._id.toString(), email: user.email },
      process.env.JWT_SECRET || 'dev-secret',
      { expiresIn: '7d' }
    );

    logger.info('Google OAuth login successful', {
      event: 'OAUTH_SUCCESS',
      userId: user._id.toString(),
      email: user.email,
      username: user.username,
      ip: req.ip,
      userAgent: req.headers['user-agent']
    });

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
    logger.error('Google OAuth error', {
      event: 'OAUTH_ERROR',
      error: err.message,
      stack: err.stack,
      ip: req.ip,
      userAgent: req.headers['user-agent']
    });
    return res.status(401).json({ message: 'Invalid Google token', error: err.message });
  }
};

module.exports = { googleLogin };
