// backend/src/utils/validation.js
// Input validation and sanitization utilities to prevent injection attacks

/**
 * Validate and sanitize email address
 * Prevents: NoSQL injection, XSS, command injection
 */
function validateEmail(email) {
    if (!email || typeof email !== 'string') {
        throw new Error('Email is required and must be a string');
    }

    // Trim and convert to lowercase
    const sanitized = email.trim().toLowerCase();

    // Check length (reasonable bounds)
    if (sanitized.length < 3 || sanitized.length > 254) {
        throw new Error('Email must be between 3 and 254 characters');
    }

    // Strict email regex (RFC 5322 simplified)
    const emailRegex = /^[a-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-z0-9!#$%&'*+/=?^_`{|}~-]+)*@(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/;
    
    if (!emailRegex.test(sanitized)) {
        throw new Error('Invalid email format');
    }

    // Block common NoSQL injection patterns
    const dangerousPatterns = [
        /\$where/i,
        /\$ne/i,
        /\$gt/i,
        /\$gte/i,
        /\$lt/i,
        /\$lte/i,
        /\$regex/i,
        /\$in/i,
        /\$nin/i,
        /\$or/i,
        /\$and/i,
        /javascript:/i,
        /<script/i,
    ];

    for (const pattern of dangerousPatterns) {
        if (pattern.test(sanitized)) {
            throw new Error('Invalid characters detected in email');
        }
    }

    return sanitized;
}

/**
 * Validate username
 * Prevents: NoSQL injection, XSS, path traversal
 */
function validateUsername(username) {
    if (!username || typeof username !== 'string') {
        throw new Error('Username is required and must be a string');
    }

    const sanitized = username.trim();

    // Length check
    if (sanitized.length < 3 || sanitized.length > 30) {
        throw new Error('Username must be between 3 and 30 characters');
    }

    // Only allow alphanumeric, underscore, hyphen
    const usernameRegex = /^[a-zA-Z0-9_-]+$/;
    if (!usernameRegex.test(sanitized)) {
        throw new Error('Username can only contain letters, numbers, underscore and hyphen');
    }

    // Block dangerous patterns
    const dangerousPatterns = [
        /\$/,
        /\{/,
        /\}/,
        /\[/,
        /\]/,
        /<script/i,
        /javascript:/i,
        /\.\./,  // path traversal
    ];

    for (const pattern of dangerousPatterns) {
        if (pattern.test(sanitized)) {
            throw new Error('Invalid characters detected in username');
        }
    }

    return sanitized;
}

/**
 * Validate password
 * Prevents: NoSQL injection, length attacks
 */
function validatePassword(password) {
    if (!password || typeof password !== 'string') {
        throw new Error('Password is required and must be a string');
    }

    // Length check (min 10, max 128 to prevent DoS via bcrypt)
    if (password.length < 10) {
        throw new Error('Password must be at least 10 characters long');
    }
    
    if (password.length > 128) {
        throw new Error('Password must not exceed 128 characters');
    }

    // Block null bytes and control characters
    if (/\0/.test(password) || /[\x00-\x1F\x7F]/.test(password)) {
        throw new Error('Password contains invalid characters');
    }

    return password; // Don't trim or modify password
}

/**
 * Sanitize object to prevent NoSQL injection
 * Recursively removes $ and . prefixes from keys
 */
function sanitizeObject(obj) {
    if (obj === null || typeof obj !== 'object') {
        return obj;
    }

    if (Array.isArray(obj)) {
        return obj.map(item => sanitizeObject(item));
    }

    const sanitized = {};
    for (const [key, value] of Object.entries(obj)) {
        // Remove leading $ and . to prevent operator injection
        const cleanKey = key.replace(/^[\$\.]+/, '');
        sanitized[cleanKey] = sanitizeObject(value);
    }
    return sanitized;
}

/**
 * Validate request body for login/register
 */
function validateAuthInput(body, isRegister = false) {
    const errors = [];
    const sanitized = {};

    try {
        if (isRegister && body.username) {
            sanitized.username = validateUsername(body.username);
        }
    } catch (err) {
        errors.push(err.message);
    }

    try {
        sanitized.email = validateEmail(body.email);
    } catch (err) {
        errors.push(err.message);
    }

    try {
        sanitized.password = validatePassword(body.password);
    } catch (err) {
        errors.push(err.message);
    }

    if (errors.length > 0) {
        const error = new Error(errors.join('; '));
        error.statusCode = 400;
        error.errors = errors;
        throw error;
    }

    return sanitized;
}

module.exports = {
    validateEmail,
    validateUsername,
    validatePassword,
    sanitizeObject,
    validateAuthInput,
};
