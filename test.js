// TASK : Validation, Sanitization of FORM fields, before posting into MySQL database.
// Multi criterias Validation. Sample :
// .matches('[0-9]').withMessage('Password Must Contain a Number')
// .matches('[A-Z]').withMessage('Password Must Contain an Uppercase Letter')
// In this project, we use 3 sanitization methods:
// trim() trims characters from input. By default (with no parameters) this method trims whitespace.
// escape() will replace certain characters (i.e. <, >, /, &, ', ") with the corresponding HTML entity.
// normalizeEmail() ensures the email address is in a safe and standard format.

var express = require('express');
var app = express();
var path = require('path');
var mysql = require('mysql');
var bodyParser = require('body-parser');
// Using Express Validator
const { body, validationResult } = require('express-validator');
// Using Password Hashing
const bcrypt = require('bcrypt');

// to serve static files
app.use('/public', express.static(__dirname + '/public'));

app.set('view engine', 'ejs');
app.use(bodyParser.urlencoded({extended: false}));

var conn = mysql.createConnection({
    host: "localhost",
    user: "root",
    password: "root",
    database: "nodeform"
});

conn.connect((err) => {
    if (err) throw err;
})

var message = ""; //to display successs message after posting to DB
var valid = "";   //to display validation errors
var warn = "";    //to display login information

// READING DB: -------------------------------------------------------------
var obj = {};  //empty object, to pull DB query results
app.get('/', (req, res) => {
        //if(err) throw err;
        conn.query("SELECT * FROM form", function(err, result){
            if (err) throw err;
            else{
                obj = {print: result}; //to assign a key for `result` array
                res.render('index', {obj: obj});
            }
        })
});


// READING FORM: ------------------------------------------------------------
app.get('/submit', (req, res) => {
    //res.sendFile(path.join(__dirname + '/index.html'));
    res.render('submit', { message: message, valid: valid });
})

// LOGIN FORM: --------------------------------------------------------------
app.get('/login', (req, res) => {
    res.render('login', { message: message, valid: valid, warn: warn });
})

// POSTING TO DB: -----------------------------------------------------------
app.post('/submit', 
    // simple validation without custom message!
    // body('name').isLength({min: 3}),
    // body('email').isEmail(),
    // body('username').isLength({ min: 5}),
    // Sanitization and then validation with custom message!
    body('name').trim().escape().isLength({min: 3, max: 25}).withMessage('Name should have minimum 3 and maximum 25 chars'),
    body('email').isEmail().withMessage('Dont have proper Email standard!').normalizeEmail(),
    body('username').isEmail().withMessage('Username must be an Email address').normalizeEmail(),
    body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters')
                    .matches('[0-9]').withMessage('Password must contain a number')
                    .matches('[A-Z]').withMessage('Password must contain an uppercase letter'),
    (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            //return res.status(400).json({ errors: errors.array() });
            console.log(errors.array());
            // send error messages to page as json 
            // return res.status(422).json({ errors: errors.array() });
            // render error messages to template page
            res.render('submit', { valid: errors.array(), message: message });           
        }else{
            // Using password Hashing!
            bcrypt.hash(req.body.password, 12).then(function(hashpass) {
                console.log(req.body.name, req.body.email, req.body.username, hashpass);
                successMessage = "One user has been added successfully!";
                // create a string to send/render in submit.ejs file!
                let sql = `INSERT INTO form (name, email, username, password) VALUES (?, ?, ?, ?)`;
                conn.query(sql, [req.body.name, req.body.email, req.body.username, hashpass], function(err, result){
                    if(err) throw err;
                    console.log("one record has been inserted!");       
                    res.render('submit', { message: successMessage, valid: valid });
                });
            });
        }
});


// CHECKING LOGIN: -----------------------------------------------------------
app.post('/login',
    body('username').trim().not().isEmpty().withMessage('Please, fill username'),
    body('password').not().isEmpty().withMessage('Please, fill password'),
    (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            // render error messages to template page
            res.render('login', { valid: errors.array(), message: message, warn: warn });           
        }else{
            // Select user
            let sql = `SELECT * FROM form WHERE username = ?`;
            conn.query(sql, [req.body.username], function(err, result){
                if (result.length){
                    console.log(result[0].password); 
                    // Using password compare!
                    bcrypt.compare(req.body.password, result[0].password).then(function(result) {
                        if (result == true) {
                            console.log("Password match!");
                            successMessage = "Successful Login!";
                            res.render('login', { valid: valid, message: successMessage, warn: warn });
                        }else{
                            console.log("Password do not match!");
                            let warning = "Username or password do not match!";
                            res.render('login', { valid: valid, message: message, warn: warning });
                        }
                    }); 
                }else{
                    console.log("Username or password do not match!");
                    console.log("Username or password do not match");
                    let warning = "Username or password do not match!";
                    res.render('login', { valid: valid, message: message, warn: warning });
                }
     
            });
        }
});

app.listen(3000);
console.log("running server!");