// Mounted after every route. Individual controllers already catch and
// respond to their own errors, so this only ever fires for things nothing
// upstream handled: unmatched routes, malformed request bodies, and truly
// unexpected exceptions — a safety net, not the primary error-handling path.

const notFoundHandler = (req, res) => {
    res.status(404).json({ message: `No route found for ${req.method} ${req.originalUrl}` });
};

const isJsonBodyParseError = (err) =>
    err?.type === 'entity.parse.failed' || (err instanceof SyntaxError && 'body' in err);

// eslint-disable-next-line no-unused-vars
const errorHandler = (err, req, res, next) => {
    if (isJsonBodyParseError(err)) {
        return res.status(400).json({ message: 'Request body must be valid JSON.' });
    }

    console.error('UNHANDLED ERROR:', err);

    return res.status(500).json({ message: 'An unexpected error occurred.' });
};

module.exports = { notFoundHandler, errorHandler };
