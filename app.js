// Importing Requirements
const express = require('express');
const session = require('express-session')
const path = require('path')
const mysql = require('mysql');
const { body, validationResult } = require('express-validator');
const bcrypt = require('bcrypt');


const setupApp = require('./appSetup');
// Initialize Express app
const app = express();

// MYSQL Connection
const conn = mysql.createConnection({
  host: '127.0.0.1',
  user: 'root',
  password: 'root',
  database: 'aykhan',
});

// Setup the app using the imported function
setupApp(app, conn);



// ========================================================= Register page ==========
const requireLogin = (req, res, next) => {
    if (req.session.loggedIn) {
        next();
    } else {
        res.redirect('/login');
    }
};


app.get('/register', (req, res) => {
    if (req.session.loggedIn) {
        res.redirect('/users');
    }
    else{
        res.render('register', errors = null);
    }
});

app.post('/register', [
    body('username').trim().escape().isLength({min: 3, max: 25}).withMessage('Username must have minimum 3 and maximum 25 characters'),
    body('email').trim().escape().isEmail().withMessage('Invalid email format'),
    body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
    body('password').matches(/\d/).withMessage('Password must contain a number'),
    body('password').matches(/[!@#$%^&*(),.?":{}|<>]/).withMessage('Password must contain a special character'),

    // Confirm password
    body('passwordconf').custom((value, { req }) => {
        if (value !== req.body.password) {
            throw new Error('Passwords do not match');
        }
        return true;
    }),
    
], async (req, res) => {
    // Process form data
    const { username, email, password, passwordconf } = req.body;

    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.render('register', { errors: errors.array() });
    }

    try {
        // Check if username or email already exists
        const existingUser = await new Promise((resolve, reject) => {
            conn.query(
                'SELECT username, email FROM user WHERE username = ? OR email = ?',
                [username, email],
                (err, results) => {
                    if (err) {
                        reject(err);
                        return;
                    }
                    resolve(results[0]);
                }
            );
        });

        if (existingUser) {
            const duplicateErrors = [];
            if (existingUser.username === username) {
                duplicateErrors.push({ msg: 'Username already exists' });
            }
            if (existingUser.email === email) {
                duplicateErrors.push({ msg: 'Email already exists' });
            }

            // Display specific error message(s) for duplicate username or email
            return res.render('register', { errors: duplicateErrors });
        }

        // Hash the password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Save user to the database with hashed password
        conn.query(
            'INSERT INTO user (username, email, password) VALUES (?, ?, ?)',
            [username, email, hashedPassword],
            (err, results) => {
                if (err) {
                    console.error('Error saving user to database:', err.message);
                    return res.status(500).send('Internal Server Error');
                }

                console.log('User saved to database');
                res.redirect('/login?success=1');
            }
        );
    } catch (error) {
        console.error('Error checking for duplicate user:', error.message);
        res.status(500).send('Internal Server Error');
    }
});

// ========================================================= Login page ==========
app.get('/login', (req, res) => {
    const successMessage = req.query.success === '1' ? 'You have successfully registered. You can log in now.' : null;
    if(req.session.loggedIn)
        res.redirect('/users')
    else
        console.log(successMessage);
        res.render('login', { successMessage, errors: null });
});

app.post('/login', [
    body('username').trim().escape().notEmpty().withMessage('Username is required'),
    body('password').trim().escape().notEmpty().withMessage('Password is required'),
], async (req, res) => {
    // Process form data
    const { username, password } = req.body;

    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.render('login', { errors: errors.array() });
    }

    try {
        // Retrieve user from the database by username
        conn.query(
            'SELECT * FROM user WHERE username = ?',
            [username],
            async (err, results) => {
                if (err) {
                    console.error('Error retrieving user from database:', err.message);
                    return res.status(500).render('error', { message: 'Internal Server Error' });
                }

                // Check if user with the given username exists
                if (results.length === 0) {
                    return res.render('login', { errors: [{ msg: 'Invalid username or password' }] });
                }

                // Compare the provided password with the hashed password from the database
                const user = results[0];
                const passwordMatch = await bcrypt.compare(password, user.password);

                if (passwordMatch) {
                    // Passwords match, user is authenticated

                    // Set session variables
                    req.session.loggedIn = true;
                    req.session.username = user.username;
                    
                    // Redirect authenticated users
                    res.redirect('/users'); 
                } else {
                    // Passwords do not match
                    return res.render('login', { errors: [{ msg: 'Invalid username or password' }] });
                }
            }
        );
    } catch (error) {
        console.error('Error during login:', error.message);
        res.status(500).render('error', { message: 'Internal Server Error' });
    }
});

// ========================================================= Log Out page ==========
app.get('/logout', (req, res) => {
    req.session.destroy((err) => {
        if (err) console.error('Error destroying session:', err.message);
        res.redirect('/login');
    });
});

// ========================================================= Users page ==========
app.get('/users', requireLogin, (req, res) => {
    conn.query('SELECT * FROM user', (err, rows) => {
        if (err) throw err;
        res.render('users', { users: rows, username: req.session.username });
    });
});

app.listen(3000, () => console.log('Application is running on 3000'));
