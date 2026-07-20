const env = require('./config/env');
const express = require('express');
const cors = require('cors');
const { notFoundHandler, errorHandler } = require('./middleware/errorHandler');

const app = express();

app.use(cors());
app.use(express.json());


// 🔹 TEST ROUTES
app.get('/', (req, res) => {
    res.send("Financial Management System API running");
});

app.get('/test-db', async (req, res) => {
    const db = require('./config/db');

    try {
        await db.promise().query('SELECT 1');
        res.send("Database connected successfully");
    } catch {
        res.status(500).send("DB Error");
    }
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

app.use(notFoundHandler);
app.use(errorHandler);

if (require.main === module) {
    app.listen(env.PORT, '0.0.0.0', () => {
        console.log(`Server running on port ${env.PORT}`);
    });
}

module.exports = app;
