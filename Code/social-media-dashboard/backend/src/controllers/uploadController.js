// This file handles image uploads to Cloudinary and manages the upload process.

const { uploadBuffer } = require('../services/cloudinary.service');
const multer = require('multer');
const jwt = require('jsonwebtoken');

// Helper: sanitize strings passed to Cloudinary to avoid argument injection
const sanitizeForCloudinary = (input) => {
    if (!input) return '';
    return String(input)
        .replace(/[&\s\/\\?#%<>:\"'`|{}]/g, '-')
        .replace(/-+/g, '-')
        .slice(0, 200);
};

// Use memory storage so we can pipe the buffer to Cloudinary
const storage = multer.memoryStorage();
const upload = multer({ 
    storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // limit uploads to 5MB
    fileFilter: (req, file, cb) => {
        if (file && file.mimetype && file.mimetype.startsWith('image/')) return cb(null, true);
        cb(new Error('Invalid file type, only images are allowed'));
    }
});

// Simple upload endpoint (keeps compatibility with existing route)
exports.uploadImage = async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ message: 'No file uploaded.' });

        const result = await uploadBuffer(req.file.buffer, { folder: 'uploads' });
        const imageUrl = result.secure_url;

        // Save image metadata into DB (Posts collection)
        const db = req.app && req.app.locals && req.app.locals.db;
        if (!db) {
            // return the URL but warn that DB isn't connected
            console.warn('DB not connected - uploaded image but did not persist metadata');
            return res.status(200).json({ url: imageUrl });
        }

        const posts = db.collection(process.env.DB_COLLECTION_POSTS || 'Posts');

        // choose username: prefer authenticated user, otherwise allow client-provided username, else 'anonymous'
        const username = (req.user && req.user.username) || req.body.username || 'anonymous';
        const text = req.body.text || '';

        const doc = {
            username,
            imageUrl,
            text,
            createdAt: new Date(),
            likes: [],
        };

        const insertResult = await posts.insertOne(doc);
        const saved = Object.assign({ _id: insertResult.insertedId.toString() }, doc);

        return res.status(201).json({ message: 'Bild erfolgreich hochgeladen und gespeichert', post: saved });
    } catch (error) {
        console.error('uploadImage error:', error && error.stack ? error.stack : error);
        const payload = { message: 'Error uploading image.' };
        if (process.env.NODE_ENV === 'development') payload.error = error && (error.message || error.toString());
        return res.status(500).json(payload);
    }
};

// Middleware for handling file uploads
exports.upload = upload.single('image'); // 'image' is the field name in the form data

// Upload a post (image + optional text) for authenticated user and save to DB
exports.uploadPost = async (req, res) => {
    const { text } = req.body;
    if (!req.file) return res.status(400).json({ message: 'Kein Bild hochgeladen.' });

    try {
        const safeUser = sanitizeForCloudinary(req.user?.username || 'user');
        const uploadResult = await uploadBuffer(req.file.buffer, {
            folder: 'user_posts',
            public_id: `${safeUser}_${Date.now()}`,
        });

        const imageUrl = uploadResult.secure_url;

        // Save post to DB using app-local db (set in server.js)
        const db = req.app && req.app.locals && req.app.locals.db;
        if (!db) return res.status(500).json({ message: 'Datenbank nicht verbunden.' });

        const posts = db.collection(process.env.DB_COLLECTION_POSTS || 'Posts');
        await posts.insertOne({
            username: req.user?.username || 'unknown',
            imageUrl,
            text: text || '',
            createdAt: new Date(),
            likes: [],
        });

        res.json({ message: 'Beitrag gespeichert.' });
    } catch (err) {
        console.error('uploadPost error:', err && err.stack ? err.stack : err);
        const payload = { message: 'Fehler beim Hochladen.' };
        if (process.env.NODE_ENV === 'development') payload.error = err && (err.message || err.toString());
        res.status(500).json(payload);
    }
};

// Get posts for the authenticated user
exports.getUserPosts = async (req, res) => {
    try {
        const db = req.app && req.app.locals && req.app.locals.db;
        if (!db) return res.status(500).json({ message: 'Datenbank nicht verbunden.' });

        const posts = db.collection(process.env.DB_COLLECTION_POSTS || 'Posts');

        const username = req.user && (req.user.username || req.user.email);
        if (!username) return res.status(400).json({ message: 'Kein Benutzername vorhanden.' });

        const docs = await posts.find({ username }).sort({ createdAt: -1 }).toArray();
        // Ensure _id is string for client-side convenience
        const normalized = docs.map(d => ({
            _id: d._id && d._id.toString(),
            username: d.username,
            imageUrl: d.imageUrl,
            text: d.text,
            createdAt: d.createdAt,
            likes: d.likes || [],
        }));

        return res.json(normalized);
    } catch (err) {
        console.error('getUserPosts error:', err && err.stack ? err.stack : err);
        return res.status(500).json({ message: 'Fehler beim Laden der Beiträge.' });
    }
};

// Get all posts (paginated). Exclude current user's posts if Authorization header present.
exports.getAllPosts = async (req, res) => {
    try {
        const db = req.app && req.app.locals && req.app.locals.db;
        if (!db) return res.status(500).json({ message: 'Datenbank nicht verbunden.' });

        const posts = db.collection(process.env.DB_COLLECTION_POSTS || 'Posts');

        const limit = Math.min(parseInt(req.query.limit) || 10, 100);
        const skip = parseInt(req.query.skip) || 0;

        // Try to get username from token if provided so we can exclude own posts
        let excludeUsername = null;
        const auth = req.headers.authorization;
        if (auth && auth.startsWith('Bearer ')) {
            const token = auth.split(' ')[1];
            try {
                const secret = process.env.JWT_SECRET || 'dev-secret';
                // Require a specific algorithm to avoid insecure defaults / alg:none attacks
                const decoded = jwt.verify(token, secret, { algorithms: ['HS256'] });

                if (decoded) {
                    if (decoded.username) {
                        excludeUsername = decoded.username;
                    } else if (decoded.email) {
                        // If token contains an email, resolve the canonical username from Users collection
                        try {
                            const users = db.collection(process.env.DB_COLLECTION_USERS || 'Users');
                            const userDoc = await users.findOne({ email: decoded.email });
                            if (userDoc && userDoc.username) {
                                excludeUsername = userDoc.username;
                            } else {
                                // if we cannot resolve a username, do not set excludeUsername to the raw email
                                excludeUsername = null;
                            }
                        } catch (lookupErr) {
                            excludeUsername = null;
                        }
                    } else if (decoded._id || decoded.id) {
                        // lookup user by ObjectId to get username
                        try {
                            const ObjectId = require('mongodb').ObjectId;
                            const users = db.collection(process.env.DB_COLLECTION_USERS || 'Users');
                            let uid = decoded._id || decoded.id;
                            // convert to ObjectId when possible
                            if (typeof uid === 'string' && ObjectId.isValid(uid)) uid = ObjectId(uid);
                            const userDoc = await users.findOne({ _id: uid });
                            if (userDoc) excludeUsername = userDoc.username || userDoc.email || null;
                        } catch (lookupErr) {
                            // ignore lookup errors
                        }
                    }
                }
            } catch (e) {
                // ignore invalid token
            }
        }

        if (process.env.NODE_ENV === 'development') {
            console.log('getAllPosts: excludeUsername=', excludeUsername);
        }

        const filter = excludeUsername ? { username: { $ne: excludeUsername } } : {};

        const cursor = posts.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit);
        const docs = await cursor.toArray();
        const total = await posts.countDocuments(filter);

        const normalized = docs.map(d => ({
            _id: d._id && d._id.toString(),
            username: d.username,
            imageUrl: d.imageUrl,
            text: d.text,
            createdAt: d.createdAt,
            likes: d.likes || [],
        }));

        return res.json({ posts: normalized, total });
    } catch (err) {
        console.error('getAllPosts error:', err && err.stack ? err.stack : err);
        return res.status(500).json({ message: 'Fehler beim Laden der Beiträge.' });
    }
};