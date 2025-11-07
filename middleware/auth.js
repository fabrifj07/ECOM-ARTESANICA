const jwt = require('jsonwebtoken');
const ErrorResponse = require('../utils/errorResponse');
const User = require('../models/User');

// Middleware para proteger rutas
const protect = async (req, res, next) => {
    let token;

    // Verificar si hay un token en los encabezados
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        // Obtener el token del encabezado
        token = req.headers.authorization.split(' ')[1];
    } 
    // Verificar si hay un token en las cookies
    else if (req.cookies.token) {
        token = req.cookies.token;
    }

    // Asegurarse de que existe el token
    if (!token) {
        return next(new ErrorResponse('No autorizado para acceder a esta ruta', 401));
    }

    try {
        // Verificar token
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        
        // Obtener el usuario del token
        req.user = await User.findById(decoded.id);
        
        if (!req.user) {
            return next(new ErrorResponse('Usuario no encontrado con este token', 404));
        }
        
        // Verificar si el correo electrónico está verificado
        if (!req.user.isEmailVerified) {
            return next(new ErrorResponse('Por favor verifica tu correo electrónico', 401));
        }
        
        next();
    } catch (err) {
        return next(new ErrorResponse('No autorizado a acceder a esta ruta', 401));
    }
};

// Middleware para verificar roles de usuario
const authorize = (...roles) => {
    return (req, res, next) => {
        if (!req.user) {
            return next(new ErrorResponse('Usuario no autenticado', 401));
        }
        
        if (!roles.includes(req.user.role)) {
            return next(
                new ErrorResponse(`El rol ${req.user.role} no está autorizado para acceder a esta ruta`, 403)
            );
        }
        next();
    };
};

// Middleware para verificar si el usuario es administrador
const admin = (req, res, next) => {
    if (req.user && req.user.role === 'admin') {
        next();
    } else {
        return next(
            new ErrorResponse('No autorizado como administrador para acceder a esta ruta', 403)
        );
    }
};

// Middleware para verificar si el usuario es el propietario del recurso o administrador
const checkOwnership = (model) => {
    return async (req, res, next) => {
        try {
            const resource = await model.findById(req.params.id);
            
            if (!resource) {
                return next(
                    new ErrorResponse(`Recurso no encontrado con el id ${req.params.id}`, 404)
                );
            }
            
            // Verificar si el usuario es el propietario o administrador
            if (resource.user.toString() !== req.user.id && req.user.role !== 'admin') {
                return next(
                    new ErrorResponse('No autorizado para actualizar este recurso', 401)
                );
            }
            
            req.resource = resource;
            next();
        } catch (error) {
            next(error);
        }
    };
};

module.exports = {
    protect,
    authorize,
    admin,
    checkOwnership
};
