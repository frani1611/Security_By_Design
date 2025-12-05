// This file contains middleware functions for authenticating requests. 

const jwt = require('jsonwebtoken');
const { ObjectId } = require('mongodb');
const logger = require('../utils/logger');

// Middleware that verifies JWT and loads user from the MongoClient DB
const authMiddleware = async (req, res, next) => {
    try {
        const token = req.headers.authorization?.split(' ')[1];
        if (!token) {
            logger.warn('Authentication failed: No token provided', {
                event: 'AUTH_NO_TOKEN',
                ip: req.ip,
                userAgent: req.headers['user-agent'],
                path: req.path
            });
            return res.status(401).json({ message: 'No token provided' });
        }

        const secret = process.env.JWT_SECRET || 'dev-secret';
        const decoded = jwt.verify(token, secret, { algorithms: ['HS256'] });
        const userId = decoded._id || decoded.id || decoded.userId;

        if (!userId) {
            logger.warn('Authentication failed: Invalid token payload', {
                event: 'AUTH_INVALID_PAYLOAD',
                ip: req.ip,
                userAgent: req.headers['user-agent'],
                path: req.path
            });
            return res.status(401).json({ message: 'Invalid token payload' });
        }

        const db = req.app && req.app.locals && req.app.locals.db;
        if (!db) return res.status(500).json({ message: 'Database not initialized' });

        const users = db.collection(process.env.DB_COLLECTION_USERS || 'Users');
        const user = await users.findOne({ _id: new ObjectId(userId) });
        if (!user) {
            logger.warn('Authentication failed: User not found', {
                event: 'AUTH_USER_NOT_FOUND',
                userId: userId,
                ip: req.ip,
                userAgent: req.headers['user-agent'],
                path: req.path
            });
            return res.status(404).json({ message: 'User not found' });
        }

        req.user = user; // attach plain user object to request
        logger.info('Authentication successful', {
            event: 'AUTH_SUCCESS',
            userId: user._id,
            email: user.email,
            ip: req.ip,
            userAgent: req.headers['user-agent'],
            path: req.path
        });
        next();
    } catch (error) {
        // Check if it's a JWT verification error
        if (error.name === 'JsonWebTokenError') {
            logger.warn('JWT verification failed', {
                event: 'JWT_VERIFICATION_FAILED',
                reason: error.message,
                ip: req.ip,
                userAgent: req.headers['user-agent'],
                path: req.path
            });
        } else if (error.name === 'TokenExpiredError') {
            logger.warn('JWT token expired', {
                event: 'JWT_TOKEN_EXPIRED',
                expiredAt: error.expiredAt,
                ip: req.ip,
                userAgent: req.headers['user-agent'],
                path: req.path
            });
        } else {
            logger.error('Authentication error', {
                event: 'AUTH_ERROR',
                error: error.message,
                stack: error.stack,
                ip: req.ip,
                userAgent: req.headers['user-agent'],
                path: req.path
            });
        }
        return res.status(401).json({ message: 'Unauthorized' });
    }
};

module.exports = authMiddleware;