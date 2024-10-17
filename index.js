const express = require('express');
const multer = require('multer');
const csv = require('csv-parser');
const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

// Initialize Express app
const app = express();

// PostgreSQL connection setup
const pool = new Pool({
    user: process.env.PGUSER,
    host: process.env.PGHOST,
    database: process.env.PGDATABASE,
    password: process.env.PGPASSWORD,
    port: process.env.PGPORT,
});

// Set up a storage location for uploaded files
const upload = multer({ dest: 'uploads/ '});

// Basic route for testing the server
app.get('/', (req, res) => {
    res.send('File upload service is running!');
});

// CSV parsing and inserting into PostgreSQL
app.post('/upload', upload.single('file'), (req, res) => {
    //After uploading the file, it will be available in req.file
    console.log(req.file);

    res.send('File uploaded successfully');
});

// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});