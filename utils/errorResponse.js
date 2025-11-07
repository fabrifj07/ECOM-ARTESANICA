class ErrorResponse extends Error {
    constructor(message, statusCode) {
        super(message);
        this.statusCode = statusCode;

        // Mantener un seguimiento de la pila de errores (solo para desarrollo)
        Error.captureStackTrace(this, this.constructor);
    }
}

module.exports = ErrorResponse;
