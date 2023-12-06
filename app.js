// Importing Requirements
const express = require('express');
const mysql = require('mysql');
const { body, validationResult } = require('express-validator');
const bcrypt = require('bcrypt');
require('dotenv').config(); // Load environment variables from .env file

const setupApp = require('./appSetup');
// Initialize Express app
const app = express();

// MYSQL Connection
const conn = mysql.createConnection({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_DATABASE,
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

const isAdmin = (req, res, next) => {
    // Check if user is logged in
    if (!req.session.loggedIn) {
      return res.redirect('/login');
    }
  
    // Retrieve user ID from session
    const userId = req.session.userid;
  
    // Query the database to check if the user is an admin
    const query = 'SELECT * FROM user WHERE id = ? AND is_admin = 1';
  
    conn.query(query, [userId], (error, results) => {
      if (error) {
        console.error('Error checking admin status:', error);
        return res.status(500).send('Internal Server Error');
      }
  
      // Check if user is an admin based on query results
      const isAdminUser = results.length > 0;
  
      if (isAdminUser) {
        // User is an admin, proceed to the next middleware or route
        next();
      } else {
        // User is not an admin, redirect to unauthorized page or handle accordingly
        res.status(403).send('Forbidden - You are not an admin.');
      }
    });
  };

  

app.get('/register', (req, res) => {
    if (req.session.loggedIn) {
        res.redirect('/');
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
        res.redirect('/')
    else
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
        return res.render('login', { successMessage : null, errors: errors.array() });
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
                    return res.render('login', { successMessage : null, errors: [{ msg: 'Invalid username or password' }] });
                }

                // Compare the provided password with the hashed password from the database
                const user = results[0];
                const passwordMatch = await bcrypt.compare(password, user.password);

                if (passwordMatch) {
                    // Passwords match, user is authenticated

                    // Set session variables
                    req.session.loggedIn = true;
                    req.session.username = user.username;
                    req.session.userid = user.id
                    
                    // Redirect authenticated users
                    res.redirect('/'); 
                } else {
                    // Passwords do not match
                    return res.render('login', { successMessage : null, errors: [{ msg: 'Invalid username or password' }] });
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
app.get('/users', requireLogin, isAdmin, (req, res) => {
    conn.query('SELECT * FROM user', (err, rows) => {
        if (err) throw err;
        res.render('users', { users: rows, username: req.session.username });
    });
});

// ========================================================= Home page ==========
// Define a function to get user by userid
const getUserById = (userid) => {
    return new Promise((resolve, reject) => {
        conn.query('SELECT * FROM user WHERE id = ?', [userid], (err, userResults) => {
            if (err) {
                reject(err);
            } else {
                resolve(userResults[0]);
            }
        });
    });
};
// Inside your route handler
app.get('/', requireLogin, async (req, res) => {
    try {
        // Get the user object based on userid
        const user = await getUserById(req.session.userid);

        // Determine whether to fetch all mediums or only non-premium mediums
        const query = user.is_premium
            ? 'SELECT medium.*, user.username AS username FROM medium JOIN user ON medium.user_id = user.id ORDER BY medium.id DESC'
            : 'SELECT medium.*, user.username AS username FROM medium JOIN user ON medium.user_id = user.id WHERE medium.is_premium = 0 ORDER BY medium.id DESC';

        conn.query(query, (err, mediumResults) => {
            if (err) {
                console.error('Error fetching mediums from the database:', err.message);
                return res.status(500).send('Internal Server Error');
            }

            const successMessage = req.query.success === '1' ? 'You have successfully posted your medium.' : null;

            // Pass the mediums data and user object to the home view
            res.render('home', { successMessage, errors: null, mediums: mediumResults, user });
        });
    } catch (error) {
        console.error('Error getting user by ID:', error.message);
        res.status(500).send('Internal Server Error');
    }
});

app.post('/', requireLogin, [
    body('title').trim().escape().notEmpty().withMessage('Title is required'),
    body('content').trim().escape().notEmpty().withMessage('Content is required'),
], async (req, res) => {
    // Process form data
    const { title, content, is_premium } = req.body;

    // Check for validation errors
    const errors = validationResult(req);

    // Fetch all mediums or only non-premium mediums based on user's premium status
    try {
        // Get the user object based on userid
        const user = await getUserById(req.session.userid);

        const query = user.is_premium
            ? 'SELECT medium.*, user.username AS username FROM medium JOIN user ON medium.user_id = user.id ORDER BY medium.id DESC'
            : 'SELECT medium.*, user.username AS username FROM medium JOIN user ON medium.user_id = user.id WHERE medium.is_premium = 0 ORDER BY medium.id DESC';

        conn.query(query, (err, mediumResults) => {
            if (err) {
                console.error('Error fetching mediums from the database:', err.message);
                return res.status(500).render('error', { message: 'Internal Server Error' });
            }

            if (!errors.isEmpty()) {
                // Render the home view with validation errors and fetched mediums data
                return res.render('home', { successMessage: null, errors: errors.array(), mediums: mediumResults, user });
            }

            // Save the medium into the database
            const currentDate = new Date();
            const formattedDate = currentDate.toISOString().slice(0, 19).replace("T", " "); // Format: YYYY-MM-DD HH:MM:SS

            const userId = req.session.userid; // Assuming you have a session variable for user ID

            conn.query(
                'INSERT INTO medium (user_id, title, content, is_premium, posted_datetime) VALUES (?, ?, ?, ?, ?)',
                [userId, title, content, is_premium ? 1 : 0, formattedDate],
                (err, results) => {
                    if (err) {
                        console.error('Error saving medium into the database:', err.message);
                        return res.status(500).render('error', { message: 'Internal Server Error' });
                    }

                    // Redirect to home page with success message
                    res.redirect('/?success=1');
                }
            );

        });
    } catch (error) {
        console.error('Error getting user by ID:', error.message);
        res.status(500).send('Internal Server Error');
    }
});



app.post('/toggle-premium/:userId', requireLogin, async (req, res) => {
    const userId = req.params.userId;

    try {
        // Fetch the user from the database based on userId
        const [user] = await new Promise((resolve, reject) => {
            conn.query('SELECT * FROM user WHERE id = ?', [userId], (err, results) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(results);
                }
            });
        });

        if (!user) {
            return res.status(404).send('User not found');
        }

        // Toggle the is_premium status
        const updatedIsPremium = !user.is_premium;

        // Update the user's is_premium status in the database
        await new Promise((resolve, reject) => {
            conn.query('UPDATE user SET is_premium = ? WHERE id = ?', [updatedIsPremium, userId], (err, results) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(results);
                }
            });
        });

        res.redirect('/');
    } catch (error) {
        console.error('Error toggling premium status:', error.message);
        res.status(500).send('Internal Server Error');
    }
});


app.post('/add-medium/:userId/:mediumId', requireLogin, async (req, res) => {
    const userId = req.params.userId;
    const mediumId = req.params.mediumId;

    try {
        // Check if the relation already exists
        const [existingRelation] = await new Promise((resolve, reject) => {
            conn.query('SELECT * FROM medium_relation WHERE user_id = ? AND medium_id = ?', [userId, mediumId], (err, results) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(results);
                }
            });
        });

        // If the relation exists, remove it
        if (existingRelation) {
            await new Promise((resolve, reject) => {
                conn.query('DELETE FROM medium_relation WHERE user_id = ? AND medium_id = ?', [userId, mediumId], (err, results) => {
                    if (err) {
                        reject(err);
                    } else {
                        resolve(results);
                    }
                });
            });
        } else {
            // If the relation does not exist, add a new record
            await new Promise((resolve, reject) => {
                conn.query('INSERT INTO medium_relation (user_id, medium_id) VALUES (?, ?)', [userId, mediumId], (err, results) => {
                    if (err) {
                        reject(err);
                    } else {
                        resolve(results);
                    }
                });
            });
        }

        res.redirect('/');
    } catch (error) {
        console.error('Error handling medium relation:', error.message);
        res.status(500).send('Internal Server Error');
    }
});


app.get('/saved-mediums/:userId', requireLogin, async (req, res) => {
    const userId = req.params.userId;

    try {
        // Check if the user exists
        const [user] = await new Promise((resolve, reject) => {
            conn.query('SELECT * FROM user WHERE id = ?', [userId], (err, results) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(results);
                }
            });
        });

        if (!user) {
            return res.status(404).send('User not found');
        }

        // Fetch the saved mediums for the user
        const savedMediums = await new Promise((resolve, reject) => {
            conn.query(
                'SELECT medium.* FROM medium JOIN medium_relation ON medium.id = medium_relation.medium_id WHERE medium_relation.user_id = ? ORDER BY medium.id DESC',
                [userId],
                (err, results) => {
                    if (err) {
                        reject(err);
                    } else {
                        resolve(results);
                    }
                }
            );
        });

        // Pass the saved mediums data and user object to the saved-mediums view
        res.render('home', { mediums : savedMediums, user, successMessage : null, errors : null});
    } catch (error) {
        console.error('Error fetching saved mediums:', error.message);
        res.status(500).send('Internal Server Error');
    }
});



app.listen(3000, () => console.log('Application is running on 3000'));
