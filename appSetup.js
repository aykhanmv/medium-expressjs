// appSetup.js
const express = require('express');
const session = require('express-session');
const path = require('path');
const bcrypt = require('bcrypt');

const setupApp = (app, conn) => {
    app.use(express.urlencoded({ extended: true }));

    const expTime = 1000 * 60 * 60;
    app.use(
        session({
            secret: 'Keep it secret',
            name: 'uniqueSessionID',
            saveUninitialized: false,
            resave: false,
            cookie: {
                maxAge: expTime,
            },
        })
    );

    // View Engine
    app.set('view engine', 'ejs');
    app.use('/public', express.static(path.join(__dirname, 'public')));

    // MYSQL Connection
    conn.connect((err) => {
        if (err) {
            console.error('Error connecting to MySQL:', err.message);
            return;
        }
        console.log('Connected to MySQL');
    });

    // Creating user table
    conn.query(
        `
    CREATE TABLE IF NOT EXISTS user (
        id INT AUTO_INCREMENT PRIMARY KEY,
        username VARCHAR(255) NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        is_admin BOOLEAN DEFAULT FALSE,
        is_premium BOOLEAN DEFAULT FALSE
    )
  `,
        async (err, results) => {
            if (err) {
                console.error('Error creating user table:', err.message);
                return;
            }
            console.log('User table created successfully');

            // Inserting initial user with hashed password
            const initialPassword = 'admin';
            const hashedPassword = await bcrypt.hash(initialPassword, 10);

            try {
                conn.query(
                    `
            INSERT INTO user (username, email, password, is_admin, is_premium)
            VALUES ('admin', 'admin@gmail.com', ?, TRUE, TRUE)
        `,
                    [hashedPassword],
                    (err, results) => {
                        if (err) {
                            console.error('Error inserting initial user:', err.message);
                            return;
                        }
                        console.log('Initial user inserted successfully');
                    }
                );
            } catch (error) {
                console.error('Error inserting initial user:', error.message);
            }
        }
    );

    conn.query(
        `
        CREATE TABLE IF NOT EXISTS medium (
            id INT AUTO_INCREMENT PRIMARY KEY,
            user_id INT,
            FOREIGN KEY (user_id) REFERENCES user(id) ON DELETE CASCADE,
            title VARCHAR(255) NOT NULL,
            content TEXT,
            is_premium BOOLEAN DEFAULT FALSE,
            posted_datetime VARCHAR(255) NOT NULL
        )
      `,
        (err, results) => {
            if (err) {
                console.error('Error creating medium table:', err.message);
                return;
            }
            console.log('Medium table created successfully');
        }
    );

    conn.query(
        `
        CREATE TABLE IF NOT EXISTS medium_relation (
            id INT AUTO_INCREMENT PRIMARY KEY,
            user_id INT,
            medium_id INT,
            FOREIGN KEY (user_id) REFERENCES user(id) ON DELETE CASCADE,
            FOREIGN KEY (medium_id) REFERENCES medium(id) ON DELETE CASCADE
        )
      `,
        (err, results) => {
            if (err) {
                console.error('Error creating medium_relation table:', err.message);
                return;
            }
            console.log('Medium_relation table created successfully');
        }
    );
    

    return app;
};

module.exports = setupApp;
