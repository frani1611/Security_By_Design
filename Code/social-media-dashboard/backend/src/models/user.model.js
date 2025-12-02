const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    username: {
        type: String,
        required: true,
        unique: true,
        trim: true
    },
    email: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        lowercase: true
    },
    password: {
        type: String,
        required: false, // Optional for SSO users
    },
    googleId: {
        type: String,
        sparse: true, // Allow multiple null values
    },
    role: {
        type: String,
        enum: ['Admin', 'User'],
        default: 'User'
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

const User = mongoose.model('User', userSchema);

module.exports = User;