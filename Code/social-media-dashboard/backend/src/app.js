const express = require('express');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const cors = require('cors');
const routes = require('./routes/index');

dotenv.config();

const app = express();

// Middleware
// Configure CORS origins via env var `ALLOWED_ORIGINS` (comma-separated).
// In development, if ALLOWED_ORIGINS is not set, allow all origins for convenience.
const rawOrigins = process.env.ALLOWED_ORIGINS || '';
let allowedOrigins = [];
if (rawOrigins) {
    allowedOrigins = rawOrigins.split(',').map(s => s.trim()).filter(Boolean);
}

if (process.env.NODE_ENV === 'development' && allowedOrigins.length === 0) {
    console.log('CORS: development mode, allowing all origins');
    app.use(cors());
} else {
    console.log('CORS: allowed origins=', allowedOrigins);
    app.use(cors({
        origin: function (origin, callback) {
            // Allow requests with no origin (e.g., server-to-server, curl)
            if (!origin) return callback(null, true);
            if (allowedOrigins.indexOf(origin) !== -1) {
                return callback(null, true);
            }
            return callback(new Error('CORS policy: origin not allowed'), false);
        },
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Authorization'],
    }));
}
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Database connection (updated for Mongoose 6+; options removed)
mongoose.connect(process.env.MONGODB_URI)
    .then(() => console.log('MongoDB connected'))
    .catch(err => console.error('MongoDB connection error:', err));

// Routes
app.use('/api', routes);

// Export the app for use in server.js
module.exports = app;