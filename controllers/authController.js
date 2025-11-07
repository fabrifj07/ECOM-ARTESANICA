const User = require('../models/User');
const ErrorResponse = require('../utils/errorResponse');
const asyncHandler = require('../middleware/async');
const crypto = require('crypto');
const sendEmail = require('../utils/sendEmail');

// @desc    Registrar usuario
// @route   POST /api/v1/auth/register
// @access  Public
exports.register = asyncHandler(async (req, res, next) => {
    const { firstName, lastName, email, password, phone, address } = req.body;

    // Crear usuario
    const user = await User.create({
        firstName,
        lastName,
        email,
        password,
        phone: phone || '',
        address: address || {}
    });

    // Generar token de verificación de correo
    const verificationToken = user.getEmailVerificationToken();
    await user.save({ validateBeforeSave: false });

    // Crear URL de verificación
    const verificationUrl = `${req.protocol}://${req.get('host')}/api/v1/auth/verify-email/${verificationToken}`;

    // Mensaje de verificación
    const message = `
        <h2>¡Bienvenido a Artesanica, ${firstName}!</h2>
        <p>Gracias por registrarte. Por favor, verifica tu dirección de correo electrónico haciendo clic en el siguiente enlace:</p>
        <a href="${verificationUrl}" style="display: inline-block; padding: 10px 20px; background-color: #7fad39; color: white; text-decoration: none; border-radius: 4px; margin: 10px 0;">
            Verificar Correo Electrónico
        </a>
        <p>Si no creaste una cuenta en Artesanica, puedes ignorar este correo.</p>
    `;

    try {
        // Enviar correo de verificación
        await sendEmail({
            email: user.email,
            subject: 'Verifica tu correo electrónico - Artesanica',
            html: message
        });

        // Enviar token en la respuesta
        sendTokenResponse(user, 200, res, 'Registro exitoso. Por favor verifica tu correo electrónico.');
    } catch (err) {
        console.error('Error al enviar correo de verificación:', err);
        user.emailVerificationToken = undefined;
        user.emailVerificationExpire = undefined;
        await user.save({ validateBeforeSave: false });
        
        return next(new ErrorResponse('No se pudo enviar el correo de verificación', 500));
    }
});

// @desc    Iniciar sesión
// @route   POST /api/v1/auth/login
// @access  Public
exports.login = asyncHandler(async (req, res, next) => {
    const { email, password } = req.body;

    // Validar email y contraseña
    if (!email || !password) {
        return next(new ErrorResponse('Por favor ingresa tu correo y contraseña', 400));
    }

    // Verificar usuario
    const user = await User.findOne({ email }).select('+password');

    if (!user) {
        return next(new ErrorResponse('Credenciales inválidas', 401));
    }

    // Verificar si la contraseña coincide
    const isMatch = await user.matchPassword(password);

    if (!isMatch) {
        return next(new ErrorResponse('Credenciales inválidas', 401));
    }

    // Verificar si el correo está verificado
    if (!user.isEmailVerified) {
        return next(new ErrorResponse('Por favor verifica tu correo electrónico para iniciar sesión', 401));
    }

    // Enviar token de respuesta
    sendTokenResponse(user, 200, res);
});

// @desc    Cerrar sesión / Limpiar cookie
// @route   GET /api/v1/auth/logout
// @access  Private
exports.logout = asyncHandler(async (req, res, next) => {
    res.cookie('token', 'none', {
        expires: new Date(Date.now() + 10 * 1000),
        httpOnly: true
    });

    res.status(200).json({
        success: true,
        data: {}
    });
});

// @desc    Obtener usuario actual
// @route   GET /api/v1/auth/me
// @access  Private
exports.getMe = asyncHandler(async (req, res, next) => {
    const user = await User.findById(req.user.id);
    
    res.status(200).json({
        success: true,
        data: user
    });
});

// @desc    Actualizar detalles del usuario
// @route   PUT /api/v1/auth/updatedetails
// @access  Private
exports.updateDetails = asyncHandler(async (req, res, next) => {
    const fieldsToUpdate = {
        firstName: req.body.firstName,
        lastName: req.body.lastName,
        email: req.body.email,
        phone: req.body.phone,
        address: req.body.address
    };

    const user = await User.findByIdAndUpdate(req.user.id, fieldsToUpdate, {
        new: true,
        runValidators: true
    });

    res.status(200).json({
        success: true,
        data: user
    });
});

// @desc    Actualizar contraseña
// @route   PUT /api/v1/auth/updatepassword
// @access  Private
exports.updatePassword = asyncHandler(async (req, res, next) => {
    const user = await User.findById(req.user.id).select('+password');

    // Verificar contraseña actual
    if (!(await user.matchPassword(req.body.currentPassword))) {
        return next(new ErrorResponse('La contraseña actual es incorrecta', 401));
    }

    user.password = req.body.newPassword;
    await user.save();

    sendTokenResponse(user, 200, res, 'Contraseña actualizada correctamente');
});

// @desc    Olvidé mi contraseña
// @route   POST /api/v1/auth/forgotpassword
// @access  Public
exports.forgotPassword = asyncHandler(async (req, res, next) => {
    const user = await User.findOne({ email: req.body.email });

    if (!user) {
        return next(new ErrorResponse('No hay ningún usuario con ese correo electrónico', 404));
    }

    // Obtener token de restablecimiento
    const resetToken = user.getResetPasswordToken();
    await user.save({ validateBeforeSave: false });

    // Crear URL de restablecimiento
    const resetUrl = `${req.protocol}://${req.get('host')}/api/v1/auth/resetpassword/${resetToken}`;

    const message = `
        <h2>Restablecer Contraseña</h2>
        <p>Has solicitado restablecer tu contraseña. Por favor, haz clic en el siguiente enlace para continuar:</p>
        <a href="${resetUrl}" style="display: inline-block; padding: 10px 20px; background-color: #7fad39; color: white; text-decoration: none; border-radius: 4px; margin: 10px 0;">
            Restablecer Contraseña
        </a>
        <p>Si no solicitaste este restablecimiento, por favor ignora este correo.</p>
        <p>Este enlace expirará en 10 minutos.</p>
    `;

    try {
        await sendEmail({
            email: user.email,
            subject: 'Restablecimiento de contraseña - Artesanica',
            html: message
        });

        res.status(200).json({
            success: true,
            data: 'Correo de restablecimiento enviado'
        });
    } catch (err) {
        console.error('Error al enviar correo de restablecimiento:', err);
        user.resetPasswordToken = undefined;
        user.resetPasswordExpire = undefined;
        await user.save({ validateBeforeSave: false });
        
        return next(new ErrorResponse('No se pudo enviar el correo de restablecimiento', 500));
    }
});

// @desc    Restablecer contraseña
// @route   PUT /api/v1/auth/resetpassword/:resettoken
// @access  Public
exports.resetPassword = asyncHandler(async (req, res, next) => {
    // Obtener token hasheado
    const resetPasswordToken = crypto
        .createHash('sha256')
        .update(req.params.resettoken)
        .digest('hex');

    const user = await User.findOne({
        resetPasswordToken,
        resetPasswordExpire: { $gt: Date.now() }
    });

    if (!user) {
        return next(new ErrorResponse('Token inválido o expirado', 400));
    }

    // Establecer nueva contraseña
    user.password = req.body.password;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpire = undefined;
    await user.save();

    sendTokenResponse(user, 200, res, 'Contraseña restablecida exitosamente');
});

// @desc    Verificar correo electrónico
// @route   GET /api/v1/auth/verify-email/:verificationtoken
// @access  Public
exports.verifyEmail = asyncHandler(async (req, res, next) => {
    // Obtener token hasheado
    const emailVerificationToken = crypto
        .createHash('sha256')
        .update(req.params.verificationtoken)
        .digest('hex');

    const user = await User.findOne({
        emailVerificationToken,
        emailVerificationExpire: { $gt: Date.now() }
    });

    if (!user) {
        return next(new ErrorResponse('Token de verificación inválido o expirado', 400));
    }

    // Actualizar usuario
    user.isEmailVerified = true;
    user.emailVerificationToken = undefined;
    user.emailVerificationExpire = undefined;
    await user.save();

    // Redirigir a la página de inicio de sesión con un mensaje de éxito
    res.redirect(`/login?verified=true`);
});

// Función auxiliar para obtener token del modelo, crear cookie y enviar respuesta
const sendTokenResponse = (user, statusCode, res, customMessage = null) => {
    // Crear token
    const token = user.getSignedJwtToken();

    const options = {
        expires: new Date(
            Date.now() + process.env.JWT_COOKIE_EXPIRE * 24 * 60 * 60 * 1000
        ),
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production'
    };

    // Si estamos en producción, configuramos secure en true
    if (process.env.NODE_ENV === 'production') {
        options.secure = true;
    }

    const responseData = {
        success: true,
        token,
        user: {
            id: user._id,
            firstName: user.firstName,
            lastName: user.lastName,
            email: user.email,
            role: user.role,
            isEmailVerified: user.isEmailVerified
        }
    };

    if (customMessage) {
        responseData.message = customMessage;
    }

    res
        .status(statusCode)
        .cookie('token', token, options)
        .json(responseData);
};
