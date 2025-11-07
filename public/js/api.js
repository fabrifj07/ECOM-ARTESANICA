/**
 * Funciones para interactuar con la API del servidor
 */

const API_BASE_URL = '/api/v1';

// Clase personalizada para errores de la API
export class APIError extends Error {
    constructor(message, status, details = {}) {
        super(message);
        this.name = 'APIError';
        this.status = status;
        this.details = details;
    }
}

// Función para realizar peticiones a la API
async function fetchAPI(endpoint, options = {}) {
    // Configuración por defecto
    const defaultOptions = {
        headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        },
        credentials: 'include', // Importante para enviar cookies de autenticación
        ...options
    };

    // Si hay datos en el cuerpo, convertirlos a JSON
    if (options.body && typeof options.body === 'object') {
        defaultOptions.body = JSON.stringify(options.body);
    }

    try {
        const response = await fetch(`${API_BASE_URL}${endpoint}`, defaultOptions);
        const data = await response.json();

        if (!response.ok) {
            // Si hay un error 401 (No autorizado), redirigir al login
            if (response.status === 401 && !window.location.href.includes('login.html')) {
                sessionStorage.setItem('redirectAfterLogin', window.location.pathname);
                window.location.href = '/login.html';
            }
            
            throw new APIError(
                data.message || 'Error en la petición',
                response.status,
                data.details || {}
            );
        }
        
        return data;
    } catch (error) {
        console.error('Error en la petición:', error);
        throw error;
    }
}

// Funciones para el carrito
export const cartAPI = {
    // Obtener el carrito del usuario
    getCart: () => fetchAPI('/cart'),
    
    // Agregar un producto al carrito
    addToCart: (productId, quantity = 1) => 
        fetchAPI('/cart', {
            method: 'POST',
            body: JSON.stringify({ productId, quantity })
        }),
        
    // Actualizar la cantidad de un producto en el carrito
    updateCartItem: (itemId, quantity) => 
        fetchAPI(`/cart/${itemId}`, {
            method: 'PUT',
            body: JSON.stringify({ quantity })
        }),
        
    // Eliminar un producto del carrito
    removeFromCart: (itemId) => 
        fetchAPI(`/cart/${itemId}`, { method: 'DELETE' })
};

// Funciones para la lista de deseos
export const wishlistAPI = {
    // Obtener la lista de deseos del usuario
    getWishlist: () => fetchAPI('/wishlist'),
    
    // Agregar un producto a la lista de deseos
    addToWishlist: (productId) => 
        fetchAPI(`/wishlist/${productId}`, { method: 'POST' }),
        
    // Eliminar un producto de la lista de deseos
    removeFromWishlist: (productId) => 
        fetchAPI(`/wishlist/${productId}`, { method: 'DELETE' })
};

// Funciones de autenticación y usuarios
export const authAPI = {
    // Registrar un nuevo usuario
    register: (userData) => 
        fetchAPI('/auth/register', {
            method: 'POST',
            body: userData
        }),
    
    // Iniciar sesión
    login: (email, password) => 
        fetchAPI('/auth/login', {
            method: 'POST',
            body: { email, password }
        }),
    
    // Cerrar sesión
    logout: () => 
        fetchAPI('/auth/logout', { method: 'GET' }),
    
    // Obtener información del usuario actual
    getCurrentUser: () => 
        fetchAPI('/auth/me'),
    
    // Actualizar información del perfil
    updateProfile: (userData) => 
        fetchAPI('/auth/updatedetails', {
            method: 'PUT',
            body: userData
        }),
    
    // Actualizar contraseña
    updatePassword: (currentPassword, newPassword) => 
        fetchAPI('/auth/updatepassword', {
            method: 'PUT',
            body: { currentPassword, newPassword }
        }),
    
    // Solicitar restablecimiento de contraseña
    forgotPassword: (email) => 
        fetchAPI('/auth/forgotpassword', {
            method: 'POST',
            body: { email }
        }),
    
    // Restablecer contraseña con token
    resetPassword: (token, newPassword) => 
        fetchAPI(`/auth/resetpassword/${token}`, {
            method: 'PUT',
            body: { password: newPassword }
        }),
    
    // Verificar correo electrónico
    verifyEmail: (token) => 
        fetchAPI(`/auth/verify-email/${token}`, { method: 'GET' }),
    
    // Verificar autenticación
    checkAuth: async () => {
        try {
            const data = await fetchAPI('/auth/me');
            return { isAuthenticated: true, user: data };
        } catch (error) {
            return { isAuthenticated: false, error };
        }
    }
};
