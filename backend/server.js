const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();

app.use(cors());
app.use(express.json());


// 🔹 TEST ROUTES
app.get('/', (req, res) => {
    res.send("Financial Management System API running");
});

app.get('/test-db', (req, res) => {
    const db = require('./config/db');

    db.query('SELECT 1', (err, result) => {
        if (err) {
            return res.status(500).send("DB Error");
        }
        res.send("Database connected successfully");
    });
});

const customerRoutes = require('./routes/customerRoutes');
const accountRoutes = require('./routes/accountRoutes');
const transactionRoutes = require('./routes/transactionRoutes');
const transferRoutes = require('./routes/transferRoutes');
const fraudRoutes = require('./routes/fraudRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes');
const authRoutes = require('./routes/authRoutes');
const adminRoutes = require('./routes/adminRoutes');


app.use('/api', authRoutes);
app.use('/api/customers', customerRoutes);
app.use('/api/accounts', accountRoutes);
app.use('/api/transactions', transactionRoutes);
app.use('/api/transfers', transferRoutes);
app.use('/api/fraud', fraudRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/admin', adminRoutes);

const PORT = 5000;

app.listen(PORT, '0.0.0.0',() => {
    console.log(`Server running on port ${PORT}`);
});
