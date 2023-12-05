// appSetup.js
const express = require('express');
const session = require('express-session');
const path = require('path');
const mysql = require('mysql');

const setupApp = (app, conn) => {
    app.use(express.urlencoded({ extended: true }));

    const expTime = 1000 * 5 * 1;
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
    conn.query(`
    CREATE TABLE IF NOT EXISTS user (
        id INT AUTO_INCREMENT PRIMARY KEY,
        username VARCHAR(255) NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL
    )
    `, (err, results) => {
        if (err) {
            console.error('Error creating user table:', err.message);
            return;
        }
        console.log('User table created successfully');
    });

    return app;
};

module.exports = setupApp;
