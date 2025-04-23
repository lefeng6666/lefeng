/**
 * auth.js - Authentication middleware
 *
 * This middleware validates the user's authentication token and attaches
 * the user object to the request for use in subsequent route handlers.
 *
 * It protects routes by ensuring only authenticated users can access them.
 */

const jwt = require('jsonwebtoken');
const pool = require('../config/db');

/**
 * Authentication middleware function
 *
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 * @returns {void}
 */
module.exports = async (req, res, next) => {
    try {
        // Get token from cookie
        const token = req.cookies.auth_token;

        // Check if token exists
        if (!token) {
            req.flash('error_msg', 'Please log in to access this page');
            return res.redirect('/auth/login');
        }

        // Verify the token
        const decoded = jwt.verify(
            token,
            process.env.JWT_SECRET || 'your-jwt-secret'
        );

        // If token is expired, handle appropriately
        if (decoded.exp && decoded.exp < Date.now() / 1000) {
            req.flash('error_msg', 'Your session has expired, please log in again');
            return res.redirect('/auth/login');
        }

        // Get user from database based on token ID
        const users = await pool.executeQuery(
            'SELECT id, username, email FROM users WHERE id = ?',
            [decoded.id]
        );

        // If user not found in database
        if (users.length === 0) {
            req.flash('error_msg', 'User not found');
            return res.redirect('/auth/login');
        }

        // Attach user object to request for use in route handlers
        req.user = users[0];

        // If user also exists in session, use session data for consistency
        if (req.session && req.session.user && req.session.user.id === req.user.id) {
            req.user = {
                ...req.user,
                ...req.session.user
            };
        }

        // Update session with latest user data
        if (req.session) {
            req.session.user = req.user;
        }

        // Continue to the next middleware or route handler
        next();
    } catch (err) {
        // Handle JWT verification errors
        if (err.name === 'JsonWebTokenError') {
            console.error('Invalid token:', err.message);
            req.flash('error_msg', 'Authentication failed, please log in again');
        } else if (err.name === 'TokenExpiredError') {
            console.error('Token expired');
            req.flash('error_msg', 'Your session has expired, please log in again');
        } else {
            // Other errors
            console.error('Auth middleware error:', err);
            req.flash('error_msg', 'An error occurred with your session, please log in again');
        }

        // Clear invalid token
        res.clearCookie('auth_token');

        // Redirect to login page
        res.redirect('/auth/login');
    }
};