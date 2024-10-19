require('dotenv').config(); 

const express = require('express');
const { ApolloServer, gql } = require('apollo-server-express');
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
const upload = multer({ dest: 'uploads/' });

// Define GraphQL Schema using SDL
const typeDefs = gql`
    type EnergyData {
        id: ID!
        meetdatum: String!
        stroom1_kwh: Float
        stroom2_kwh: Float
        teruglevering1_kwh: Float
        teruglevering2_kwh: Float
        gas_m3: Float
    }

    type Query {
        getEnergyData(meetdatum: String!): EnergyData
        getAllEnergyData: [EnergyData]
    }

    type Mutation {
        insertEnergyData(
            meetdatum: String!,
            stroom1_kwh: Float,
            stroom2_kwh: Float,
            teruglevering1_kwh: Float,
            teruglevering2_kwh: Float,
            gas_m3: Float
        ): EnergyData
    }
`;

//Define resolvers
const resolvers = {
    Query: {
        getEnergyData: async(_, { meetdatum }) => {
            const query = 'SELECT * FROM energy_data WHERE meetdatum = $1';
            const values = [meetdatum];
            try {
                const result = await pool.query(query, values);
                return result.rows[0];
            } catch (err) {
                console.error('Error fetching data:', err);
                return null;
            }
        },
        getAllEnergyData: async() => {
            const query = 'SELECT * FROM energy_data ORDER BY meetdatum ASC';
            try {
                const result = await pool.query(query);
                return result.rows;
            } catch (err) {
                console.error('Error fetching data:', err);
                return [];
            }
        }
    },
    Mutation: {
        insertEnergyData: async(_, { meetdatum, stroom1_kwh, stroom2_kwh, teruglevering1_kwh, teruglevering2_kwh, gas_m3 }) => {
            const query = `
                INSERT INTO energy_data (meetdatum, stroom1_kwh, stroom2_kwh, teruglevering1_kwh, teruglevering2_kwh, gas_m3)
                VALUES ($1, $2, $3, $4, $5, $6)
                ON CONFLICT (meetdatum) DO NOTHING
                RETURNING *
            `;
            const values = [meetdatum, stroom1_kwh, stroom2_kwh, teruglevering1_kwh, teruglevering2_kwh, gas_m3];
            try {
                const result = await pool.query(query, values);
                if (result.rows.length === 0) {
                    throw new Error(`Duplicate entry detected for meetdatum: ${meetdatum}`);
                }
                return result.rows[0];
            } catch (err) {
                console.error('Error inserting data:', err);
                throw new Error('Error inserting data');
            }
        }
    }
};

// Initialize Apollo Server
const server = new ApolloServer({
    typeDefs,
    resolvers
});

async function startApolloServer() {
    await server.start();
    server.applyMiddleware({ app });
}

startApolloServer();

// Basic route to test if the server is running
app.get('/', (req, res) => {
    res.send('File upload service is running!');
});

// Endpoint to handle file upload and CSV parsing
app.post('/upload', upload.single('file'), (req, res) => {
    if (!req.file) {
        return res.status(400).send('No file uploaded.');
    }

    const filePath = path.join(__dirname, 'uploads', req.file.filename);

    //Read and Parse the CSV file
    fs.createReadStream(filePath, { encoding: 'utf8' })
        .pipe(csv({ separator: ';' }))
        .on('data', async (row) => {
            const { Meetdatum, 'Stroom 1 (kWh)': stroom1, 'Stroom 2 (kWh)': stroom2, 'Teruglevering 1 (kWh)': teruglevering1, 'Teruglevering 2 (kWh)': teruglevering2, 'Gas 1 (m³)': gas } = row;

            const values = [
                Meetdatum,
                parseFloat(stroom1), 
                parseFloat(stroom2), 
                parseFloat(teruglevering1), 
                parseFloat(teruglevering2), 
                parseFloat(gas)
            ];
            console.log('Inserting row with numeric conversion:', values);  // Log converted values, delete later

            //SQL query to insert data into the table
            const query = `
                INSERT INTO energy_data (meetdatum, stroom1_kwh, stroom2_kwh, teruglevering1_kwh, teruglevering2_kwh, gas_m3)
                VALUES ($1, $2, $3, $4, $5, CAST($6 AS NUMERIC))
                ON CONFLICT (meetdatum) DO NOTHING;
            `;

            try {
                const result = await pool.query(query, values);
                if(result.rowCount === 0) {
                    console.log('Duplicate entry detected for meetdatum: ${Meetdatum}');
                }
            } catch (err) {
                console.error('Error inserting data:', err); 
            }              
        })
        //End of the CSV Processing
        .on('end', () => {
            console.log('CSV file successfully processed');
            res.send('File uploaded and data inserted into the database successfully.');
        })
        .on('error', (error) => {
            console.error('Error processing CSV file: ', error);
            res.status(500).send('Error processing the file.');
        });
});

// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});