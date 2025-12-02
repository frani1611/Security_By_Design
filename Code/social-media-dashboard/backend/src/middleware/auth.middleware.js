// This file contains middleware functions for authenticating requests. 

const jwt = require('jsonwebtoken');
const { ObjectId } = require('mongodb');

// Middleware that verifies JWT and loads user from the MongoClient DB
const authMiddleware = async (req, res, next) => {
    try {
        const token = req.headers.authorization?.split(' ')[1];
        if (!token) return res.status(401).json({ message: 'No token provided' });

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const userId = decoded._id || decoded.id || decoded.userId;

        if (!userId) return res.status(401).json({ message: 'Invalid token payload' });

        const db = req.app && req.app.locals && req.app.locals.db;
        if (!db) return res.status(500).json({ message: 'Database not initialized' });

        const users = db.collection(process.env.DB_COLLECTION_USERS || 'Users');
        const user = await users.findOne({ _id: new ObjectId(userId) });
        if (!user) return res.status(404).json({ message: 'User not found' });

        req.user = user; // attach plain user object to request
        next();
    } catch (error) {
        console.error('authMiddleware error:', error && error.stack ? error.stack : error);
        return res.status(401).json({ message: 'Unauthorized' });
    }
};

module.exports = authMiddleware;