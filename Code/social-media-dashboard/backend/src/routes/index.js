const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const googleAuthController = require('../controllers/googleAuthController');
const uploadController = require('../controllers/uploadController');
const authMiddleware = require('../middleware/auth.middleware');

// Auth routes
router.post('/register', authController.register);
router.post('/login', authController.login);

// Google OAuth route
router.post('/auth/google', googleAuthController.googleLogin);

// Upload routes
router.post('/upload', uploadController.upload, uploadController.uploadImage);
// Upload a post (image + text) for authenticated users
router.post('/upload-post', authMiddleware, uploadController.upload, uploadController.uploadPost);
// Get authenticated user's posts
router.get('/user-posts', authMiddleware, uploadController.getUserPosts);
// Get recent posts (paginated). Excludes current user's posts if Authorization header provided.
router.get('/posts', uploadController.getAllPosts);

module.exports = router;
