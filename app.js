// app.js - Main application entry point
const express = require('express');
const session = require('express-session');
const cookieParser = require('cookie-parser');
const flash = require('connect-flash');
const methodOverride = require('method-override');
const path = require('path');
require('dotenv').config();

// Initialize Express app
const app = express();

// Set up view engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));
app.use(methodOverride('_method'));

// Session configuration
app.use(session({
    secret: process.env.SESSION_SECRET || 'profocus-default-secret',
    resave: false,
    saveUninitialized: true,
    cookie: {
        maxAge: 3600000, // 1 hour
        secure: process.env.NODE_ENV === 'production'
    }
}));

// Connect flash for flash messages
app.use(flash());

// Global variables - set flash messages if they exist
app.use((req, res, next) => {
    res.locals.user = req.session.user || null;

    if (req.flash('success_msg').length > 0) {
        res.locals.success_msg = req.flash('success_msg')[0];
    }

    if (req.flash('error_msg').length > 0) {
        res.locals.error_msg = req.flash('error_msg')[0];
    }

    if (req.flash('error').length > 0) {
        res.locals.error = req.flash('error')[0];
    }

    // Set global app data for templates
    res.locals.appName = 'ProFocus';
    res.locals.year = new Date().getFullYear();

    next();
});

// Import routes
const indexRoutes = require('./routes/index');
const authRoutes = require('./routes/auth');
const goalRoutes = require('./routes/goals');
const analyticsRoutes = require('./routes/analytics');

// Apply routes
app.use('/', indexRoutes);
app.use('/auth', authRoutes);
app.use('/goals', goalRoutes);
app.use('/analytics-data', analyticsRoutes);

// 404 Error handling
app.use((req, res) => {
    res.status(404).render('error', {
        title: '404 Not Found',
        message: 'The page you are looking for does not exist.',
        error: {
            status: 404,
            stack: process.env.NODE_ENV === 'development' ? 'Page not found' : ''
        }
    });
});

// 500 Error handling
app.use((err, req, res, next) => {
    console.error('Server Error:', err.stack);
    const statusCode = err.status || 500;

    res.status(statusCode).render('error', {
        title: `${statusCode} Server Error`,
        message: process.env.NODE_ENV === 'production'
            ? 'Something went wrong on our end.'
            : err.message,
        error: {
            status: statusCode,
            stack: process.env.NODE_ENV === 'development' ? err.stack : ''
        }
    });
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
    console.error('Unhandled Rejection:', err);
});

module.exports = app;
