const { verifyJwt } = require('../utils/jwt');

const JWT_SECRET = process.env.JWT_SECRET || 'development-secret-change-me';

exports.requireAuth = (req, res, next) => {
    const authorization = req.headers.authorization || '';

    if (!authorization.startsWith('Bearer ')) {
        return res.status(401).json({ message: 'Authentication token is required.' });
    }

    const token = authorization.slice(7);

    try {
        req.user = verifyJwt(token, JWT_SECRET);
        return next();
    } catch (error) {
        return res.status(401).json({ message: error.message || 'Invalid authentication token.' });
    }
};

exports.requireCustomer = (req, res, next) => {
    if (!req.user || req.user.role !== 'customer' || !req.user.customer_id) {
        return res.status(403).json({ message: 'Customer access is required for this resource.' });
    }

    return next();
};

exports.requireAdmin = (req, res, next) => {
    if (!req.user || req.user.role !== 'admin' || !req.user.accountant_id) {
        return res.status(403).json({ message: 'Admin access is required for this resource.' });
    }

    return next();
};
