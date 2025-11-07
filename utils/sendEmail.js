const nodemailer = require('nodemailer');
const pug = require('pug');
const { htmlToText } = require('html-to-text');

// Configuración del transporte de correo
const sendEmail = async (options) => {
    // 1) Crear un transportador
    const transporter = nodemailer.createTransport({
        host: process.env.EMAIL_HOST,
        port: process.env.EMAIL_PORT,
        auth: {
            user: process.env.EMAIL_USERNAME,
            pass: process.env.EMAIL_PASSWORD
        },
        // Solo para desarrollo - eliminar en producción
        tls: {
            rejectUnauthorized: false
        }
    });

    // 2) Definir las opciones del correo
    const mailOptions = {
        from: `"${process.env.EMAIL_FROM_NAME}" <${process.env.EMAIL_FROM}>`,
        to: options.email,
        subject: options.subject,
        html: options.html,
        text: htmlToText(options.html)
    };

    // 3) Enviar el correo
    await transporter.sendMail(mailOptions);
};

module.exports = sendEmail;
