// backend/src/controllers/authController.js

const User = require('../models/user.model');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { validateAuthInput } = require('../utils/validation');
const logger = require('../utils/logger');

// Register a new user
exports.register = async (req, res) => {
    try {
        // Validate and sanitize input (prevents injection attacks)
        const sanitized = validateAuthInput(req.body, true);
        const { username, email, password } = sanitized;

        // Check if user already exists (using sanitized email)
        const existingUser = await User.findOne({ 
            $or: [{ email }, { username }] 
        }).lean();
        
        if (existingUser) {
            logger.warn('Registration failed - user already exists', {
                event: 'REGISTRATION_FAILED',
                reason: existingUser.email === email ? 'email_exists' : 'username_exists',
                attemptedEmail: email,
                attemptedUsername: username,
                ip: req.ip
            });
            
            return res.status(409).json({ 
                message: existingUser.email === email 
                    ? 'Email already registered' 
                    : 'Username already taken' 
            });
        }

        // Hash password (bcrypt automatically salts)
        const hashedPassword = await bcrypt.hash(password, 10);
        
        // Create user with sanitized data
        const newUser = new User({ 
            username,
            email, 
            password: hashedPassword 
        });
        
        await newUser.save();
        
        logger.info('User registered successfully', {
            event: 'USER_REGISTERED',
            userId: newUser._id,
            email: newUser.email,
            username: newUser.username,
            ip: req.ip,
            userAgent: req.headers['user-agent']
        });
        
        res.status(201).json({ 
            message: 'User registered successfully',
            id: newUser._id 
        });
    } catch (error) {
        // Return validation errors with 400, other errors with 500
        const statusCode = error.statusCode || 500;
        const message = error.message || 'Error registering user';
        
        logger.error('Registration error', {
            event: 'REGISTRATION_ERROR',
            error: error.message,
            stack: error.stack,
            ip: req.ip
        });
        
        res.status(statusCode).json({ message });
    }
};

// Login user
exports.login = async (req, res) => {
    try {
        // Validate and sanitize input (prevents injection attacks)
        const sanitized = validateAuthInput(req.body, false);
        const { email, password } = sanitized;

        // Find user by sanitized email (Mongoose automatically escapes)
        const user = await User.findOne({ email }).lean();
        
        if (!user) {
            logger.warn('Login failed - user not found', {
                event: 'LOGIN_FAILED',
                reason: 'user_not_found',
                email: email,
                ip: req.ip,
                userAgent: req.headers['user-agent']
            });
            
            // Generic error to prevent user enumeration
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        // Check if password exists (SSO users may not have password)
        if (!user.password) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        // Compare password with hash
        const isMatch = await bcrypt.compare(password, user.password);
        
        if (!isMatch) {
            logger.warn('Login failed - invalid password', {
                event: 'LOGIN_FAILED',
                reason: 'invalid_password',
                email: email,
                ip: req.ip,
                userAgent: req.headers['user-agent']
            });
            
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        // Generate JWT token
        const token = jwt.sign(
            { id: user._id, email: user.email }, 
            process.env.JWT_SECRET,
            { expiresIn: '7d', algorithm: 'HS256' }
        );
        
        logger.info('User logged in successfully', {
            event: 'LOGIN_SUCCESS',
            userId: user._id,
            email: user.email,
            ip: req.ip,
            userAgent: req.headers['user-agent']
        });
        
        res.status(200).json({ token });
    } catch (error) {
        const statusCode = error.statusCode || 500;
        const message = error.message || 'Error logging in';
        
        logger.error('Login error', {
            event: 'LOGIN_ERROR',
            error: error.message,
            stack: error.stack,
            ip: req.ip
        });
        
        res.status(statusCode).json({ message });
    }
};