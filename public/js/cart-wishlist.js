import { cartAPI, wishlistAPI, authAPI } from './api.js';

// Clase para manejar el estado global de la aplicación
class AppState {
    constructor() {
        this.cart = {
            items: [],
            total: 0,
            count: 0
        };
        this.wishlist = [];
        this.isAuthenticated = false;
        this.init();
    }

    async init() {
        await this.checkAuth();
        if (this.isAuthenticated) {
            await this.loadCart();
            await this.loadWishlist();
        }
        this.updateUI();
    }

    async checkAuth() {
        try {
            await authAPI.checkAuth();
            this.isAuthenticated = true;
            return true;
        } catch (error) {
            this.isAuthenticated = false;
            return false;
        }
    }

    async loadCart() {
        try {
            const data = await cartAPI.getCart();
            this.cart = {
                items: data.items || [],
                total: data.total || 0,
                count: (data.items || []).reduce((acc, item) => acc + (item.quantity || 0), 0)
            };
            return this.cart;
        } catch (error) {
            console.error('Error al cargar el carrito:', error);
            return null;
        }
    }

    async loadWishlist() {
        try {
            const data = await wishlistAPI.getWishlist();
            this.wishlist = data.items || [];
            return this.wishlist;
        } catch (error) {
            console.error('Error al cargar la lista de deseos:', error);
            return [];
        }
    }

    async toggleWishlist(productId) {
        if (!this.isAuthenticated) {
            this.redirectToLogin();
            return false;
        }

        try {
            const isInWishlist = this.wishlist.some(item => item.product._id === productId);
            
            if (isInWishlist) {
                await wishlistAPI.removeFromWishlist(productId);
                this.wishlist = this.wishlist.filter(item => item.product._id !== productId);
            } else {
                const data = await wishlistAPI.addToWishlist(productId);
                this.wishlist = data.items || [];
            }
            
            this.updateWishlistUI();
            return !isInWishlist;
        } catch (error) {
            console.error('Error al actualizar la lista de deseos:', error);
            return false;
        }
    }

    async addToCart(productId, quantity = 1) {
        if (!this.isAuthenticated) {
            this.redirectToLogin();
            return false;
        }

        try {
            await cartAPI.addToCart(productId, quantity);
            await this.loadCart();
            this.updateCartUI();
            return true;
        } catch (error) {
            console.error('Error al agregar al carrito:', error);
            return false;
        }
    }

    redirectToLogin() {
        // Guardar la URL actual para redirigir después del login
        sessionStorage.setItem('redirectAfterLogin', window.location.href);
        window.location.href = '/login.html';
    }

    updateUI() {
        this.updateCartUI();
        this.updateWishlistUI();
    }

    updateCartUI() {
        // Actualizar contador del carrito
        const cartCountElements = document.querySelectorAll('.header__cart span, .humberger__menu__cart span');
        cartCountElements.forEach(el => {
            el.textContent = this.cart.count;
        });

        // Actualizar precio total
        const cartPriceElements = document.querySelectorAll('.header__cart__price span, .humberger__menu__cart__price span');
        cartPriceElements.forEach(el => {
            el.textContent = `$${this.cart.total.toFixed(2)}`;
        });
    }

    updateWishlistUI() {
        // Actualizar contador de favoritos
        const wishlistCountElements = document.querySelectorAll('.header__cart .fa-heart + span, .humberger__menu__cart .fa-heart + span');
        wishlistCountElements.forEach(el => {
            el.textContent = this.wishlist.length;
        });
    }
}

// Inicializar la aplicación cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', () => {
    const app = new AppState();
    
    // Función para manejar clics en el ícono de favoritos
    const handleWishlistClick = async (e) => {
        e.preventDefault();
        e.stopPropagation();
        
        const heartIcon = e.target.closest('.wishlist-btn') || e.target.closest('.fa-heart');
        if (!heartIcon) return;
        
        const productCard = heartIcon.closest('.featured__item, .product__details__content__item');
        const productId = heartIcon.dataset.productId || (productCard ? productCard.dataset.productId : null);
        
        if (productId) {
            const wasAdded = await app.toggleWishlist(productId);
            const icon = heartIcon.tagName === 'I' ? heartIcon : heartIcon.querySelector('i.fa-heart');
            if (icon) {
                icon.classList.toggle('active', wasAdded);
                showNotification(wasAdded ? 'Añadido a favoritos' : 'Eliminado de favoritos');
            }
        }
    };

    // Función para manejar clics en el ícono del carrito
    const handleCartClick = async (e) => {
        e.preventDefault();
        e.stopPropagation();
        
        const cartButton = e.target.closest('.add-to-cart-btn') || 
                          e.target.closest('.fa-shopping-cart') ||
                          e.target.closest('.fa-shopping-bag');
        
        if (!cartButton) return;
        
        const productCard = cartButton.closest('.featured__item, .product__details__content__item');
        const productId = cartButton.dataset.productId || (productCard ? productCard.dataset.productId : null);
        
        if (productId) {
            const quantity = 1; // Obtener cantidad del selector si existe
            const success = await app.addToCart(productId, quantity);
            
            if (success) {
                showNotification('Producto agregado al carrito');
                
                // Actualizar la interfaz del carrito
                const cartCount = document.querySelector('.header__cart span, .humberger__menu__cart span');
                if (cartCount) {
                    // Animación de actualización
                    cartCount.style.transform = 'scale(1.5)';
                    setTimeout(() => {
                        cartCount.style.transform = 'scale(1)';
                    }, 300);
                }
            }
        }
    };

    // Agregar event listeners a los botones existentes
    document.addEventListener('click', (e) => {
        if (e.target.closest('.wishlist-btn, .fa-heart')) {
            handleWishlistClick(e);
        } else if (e.target.closest('.add-to-cart-btn, .fa-shopping-cart, .fa-shopping-bag')) {
            handleCartClick(e);
        }
    });

    // Función para manejar productos cargados dinámicamente (si es necesario)
    const handleDynamicContent = () => {
        // Si hay contenido que se carga dinámicamente, aquí se pueden agregar manejadores
    };

    // Observar cambios en el DOM para manejar contenido dinámico
    const observer = new MutationObserver((mutations) => {
        handleDynamicContent();
    });

    // Configurar y comenzar a observar el contenedor de productos
    const productsContainer = document.getElementById('products-container');
    if (productsContainer) {
        observer.observe(productsContainer, {
            childList: true,
            subtree: true
        });
    }
});

// Función para mostrar notificaciones
function showNotification(message, type = 'success') {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    
    document.body.appendChild(notification);
    
    // Animación de entrada
    setTimeout(() => {
        notification.classList.add('show');
    }, 10);
    
    // Eliminar después de 3 segundos
    setTimeout(() => {
        notification.classList.remove('show');
        setTimeout(() => {
            notification.remove();
        }, 300);
    }, 3000);
}

// Añadir estilos para las notificaciones
const style = document.createElement('style');
style.textContent = `
    .notification {
        position: fixed;
        bottom: 20px;
        right: 20px;
        padding: 15px 25px;
        border-radius: 4px;
        color: white;
        background-color: #7fad39;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        transform: translateY(100px);
        opacity: 0;
        transition: all 0.3s ease;
        z-index: 1000;
    }
    
    .notification.show {
        transform: translateY(0);
        opacity: 1;
    }
    
    .notification.error {
        background-color: #ff4444;
    }
    
    .fa-heart {
        cursor: pointer;
        transition: color 0.2s;
    }
    
    .fa-heart:hover {
        color: #ff4444;
    }
    
    .fa-heart.active {
        color: #ff4444;
    }
`;

document.head.appendChild(style);

// Exportar para acceso global (opcional)
window.AppState = AppState;
