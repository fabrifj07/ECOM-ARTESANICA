const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const userSchema = new mongoose.Schema({
    firstName: {
        type: String,
        required: [true, 'Por favor ingresa tu nombre'],
        trim: true,
        maxlength: [50, 'El nombre no puede tener más de 50 caracteres']
    },
    lastName: {
        type: String,
        required: [true, 'Por favor ingresa tu apellido'],
        trim: true,
        maxlength: [50, 'El apellido no puede tener más de 50 caracteres']
    },
    email: {
        type: String,
        required: [true, 'Por favor ingresa tu correo electrónico'],
        unique: true,
        match: [
            /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/,
            'Por favor ingresa un correo electrónico válido'
        ],
        trim: true,
        lowercase: true
    },
    password: {
        type: String,
        required: [true, 'Por favor ingresa una contraseña'],
        minlength: [6, 'La contraseña debe tener al menos 6 caracteres'],
        select: false
    },
    phone: {
        type: String,
        trim: true,
        default: ''
    },
    address: {
        street: { type: String, default: '' },
        city: { type: String, default: '' },
        state: { type: String, default: '' },
        postalCode: { type: String, default: '' },
        country: { type: String, default: 'México' }
    },
    role: {
        type: String,
        enum: ['user', 'admin'],
        default: 'user'
    },
    resetPasswordToken: String,
    resetPasswordExpire: Date,
    isEmailVerified: {
        type: Boolean,
        default: false
    },
    emailVerificationToken: String,
    emailVerificationExpire: Date,
    wishlist: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Product'
    }],
    cart: {
        items: [{
            product: {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'Product',
                required: true
            },
            quantity: {
                type: Number,
                required: true,
                min: 1
            },
            price: {
                type: Number,
                required: true
            },
            addedAt: {
                type: Date,
                default: Date.now
            }
        }],
        total: {
            type: Number,
            default: 0
        }
    },
    orders: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Order'
    }],
    createdAt: {
        type: Date,
        default: Date.now
    }
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

// Encriptar contraseña antes de guardar
userSchema.pre('save', async function(next) {
    if (!this.isModified('password')) {
        next();
    }
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);    
});

// Firmar JWT y retornar
userSchema.methods.getSignedJwtToken = function() {
    return jwt.sign(
        { id: this._id, role: this.role }, 
        process.env.JWT_SECRET, 
        { expiresIn: process.env.JWT_EXPIRE }
    );
};

// Comparar contraseña ingresada con la almacenada
userSchema.methods.matchPassword = async function(enteredPassword) {
    return await bcrypt.compare(enteredPassword, this.password);
};

// Generar token para restablecer contraseña
userSchema.methods.getResetPasswordToken = function() {
    // Generar token
    const resetToken = crypto.randomBytes(20).toString('hex');

    // Hashear el token y establecerlo en resetPasswordToken
    this.resetPasswordToken = crypto
        .createHash('sha256')
        .update(resetToken)
        .digest('hex');

    // Establecer fecha de expiración (10 minutos)
    this.resetPasswordExpire = Date.now() + 10 * 60 * 1000;

    return resetToken;
};

// Generar token para verificación de correo
userSchema.methods.getEmailVerificationToken = function() {
    // Generar token
    const verificationToken = crypto.randomBytes(20).toString('hex');

    // Hashear el token y establecerlo en emailVerificationToken
    this.emailVerificationToken = crypto
        .createHash('sha256')
        .update(verificationToken)
        .digest('hex');

    // Establecer fecha de expiración (24 horas)
    this.emailVerificationExpire = Date.now() + 24 * 60 * 60 * 1000;

    return verificationToken;
};

// Método para agregar al carrito
userSchema.methods.addToCart = async function(productId, quantity, price) {
    const cartItemIndex = this.cart.items.findIndex(item => 
        item.product && item.product.toString() === productId.toString()
    );
    
    let newQuantity = quantity;
    const updatedCartItems = [...this.cart.items];
    
    if (cartItemIndex >= 0) {
        newQuantity = this.cart.items[cartItemIndex].quantity + quantity;
        updatedCartItems[cartItemIndex].quantity = newQuantity;
    } else {
        updatedCartItems.push({
            product: productId,
            quantity: newQuantity,
            price: price
        });
    }
    
    const total = updatedCartItems.reduce((sum, item) => sum + (item.quantity * item.price), 0);
    
    this.cart = {
        items: updatedCartItems,
        total: total
    };
    
    await this.save();
    return this.cart;
};

// Método para eliminar del carrito
userSchema.methods.removeFromCart = async function(productId) {
    const updatedCartItems = this.cart.items.filter(item => 
        item.product.toString() !== productId.toString()
    );
    
    const total = updatedCartItems.reduce((sum, item) => sum + (item.quantity * item.price), 0);
    
    this.cart = {
        items: updatedCartItems,
        total: total
    };
    
    await this.save();
    return this.cart;
};

// Método para limpiar el carrito
userSchema.methods.clearCart = async function() {
    this.cart = { items: [], total: 0 };
    await this.save();
};

// Método para agregar a la lista de deseos
userSchema.methods.addToWishlist = async function(productId) {
    if (!this.wishlist.includes(productId)) {
        this.wishlist.push(productId);
        await this.save();
    }
    return this.wishlist;
};

// Método para eliminar de la lista de deseos
userSchema.methods.removeFromWishlist = async function(productId) {
    this.wishlist = this.wishlist.filter(id => id.toString() !== productId.toString());
    await this.save();
    return this.wishlist;
};

module.exports = mongoose.model('User', userSchema);
