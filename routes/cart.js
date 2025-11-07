const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const Cart = require('../models/Cart');
const Product = require('../models/Product');

// @route   GET /api/cart
// @desc    Obtener el carrito del usuario
// @access  Privado
router.get('/', protect, async (req, res) => {
  try {
    const cart = await Cart.findOne({ user: req.user.id })
      .populate('items.product', 'name price image');
    
    if (!cart) {
      return res.json({ items: [], total: 0 });
    }
    
    res.json(cart);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error al obtener el carrito' });
  }
});

// @route   POST /api/cart
// @desc    Agregar un producto al carrito
// @access  Privado
router.post('/', protect, async (req, res) => {
  const { productId, quantity = 1 } = req.body;

  try {
    // Verificar que el producto existe
    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({ message: 'Producto no encontrado' });
    }

    // Verificar stock
    if (product.countInStock < quantity) {
      return res.status(400).json({ 
        message: `Solo hay ${product.countInStock} unidades disponibles` 
      });
    }

    // Buscar el carrito del usuario
    let cart = await Cart.findOne({ user: req.user.id });

    if (!cart) {
      // Crear un nuevo carrito si no existe
      cart = new Cart({
        user: req.user.id,
        items: [{
          product: product._id,
          quantity,
          price: product.price
        }]
      });
    } else {
      // Verificar si el producto ya está en el carrito
      const itemIndex = cart.items.findIndex(
        item => item.product.toString() === productId
      );

      if (itemIndex >= 0) {
        // Actualizar cantidad si el producto ya está en el carrito
        const newQuantity = cart.items[itemIndex].quantity + quantity;
        
        // Verificar stock nuevamente
        if (product.countInStock < newQuantity) {
          return res.status(400).json({ 
            message: `Solo hay ${product.countInStock} unidades disponibles` 
          });
        }
        
        cart.items[itemIndex].quantity = newQuantity;
      } else {
        // Agregar nuevo producto al carrito
        cart.items.push({
          product: product._id,
          quantity,
          price: product.price
        });
      }
    }

    // Guardar el carrito (el pre-save hook calculará el total)
    await cart.save();
    
    // Obtener el carrito con la información completa del producto
    const updatedCart = await Cart.findById(cart._id)
      .populate('items.product', 'name price image');

    res.status(201).json(updatedCart);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error al actualizar el carrito' });
  }
});

// @route   PUT /api/cart/:itemId
// @desc    Actualizar la cantidad de un producto en el carrito
// @access  Privado
router.put('/:itemId', protect, async (req, res) => {
  const { quantity } = req.body;

  try {
    const cart = await Cart.findOne({ user: req.user.id });
    if (!cart) {
      return res.status(404).json({ message: 'Carrito no encontrado' });
    }

    const itemIndex = cart.items.findIndex(
      item => item._id.toString() === req.params.itemId
    );

    if (itemIndex < 0) {
      return res.status(404).json({ message: 'Producto no encontrado en el carrito' });
    }

    // Verificar stock
    const product = await Product.findById(cart.items[itemIndex].product);
    if (product.countInStock < quantity) {
      return res.status(400).json({ 
        message: `Solo hay ${product.countInStock} unidades disponibles` 
      });
    }

    // Actualizar cantidad
    cart.items[itemIndex].quantity = quantity;

    // Guardar el carrito (el pre-save hook calculará el total)
    await cart.save();
    
    // Obtener el carrito actualizado con la información completa del producto
    const updatedCart = await Cart.findById(cart._id)
      .populate('items.product', 'name price image');

    res.json(updatedCart);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error al actualizar el carrito' });
  }
});

// @route   DELETE /api/cart/:itemId
// @desc    Eliminar un producto del carrito
// @access  Privado
router.delete('/:itemId', protect, async (req, res) => {
  try {
    const cart = await Cart.findOne({ user: req.user.id });
    if (!cart) {
      return res.status(404).json({ message: 'Carrito no encontrado' });
    }

    const itemIndex = cart.items.findIndex(
      item => item._id.toString() === req.params.itemId
    );

    if (itemIndex < 0) {
      return res.status(404).json({ message: 'Producto no encontrado en el carrito' });
    }

    // Eliminar el producto del carrito
    cart.items.splice(itemIndex, 1);

    // Si no quedan productos, eliminar el carrito
    if (cart.items.length === 0) {
      await Cart.findByIdAndDelete(cart._id);
      return res.json({ message: 'Carrito vaciado correctamente', items: [], total: 0 });
    }

    // Guardar el carrito (el pre-save hook calculará el total)
    await cart.save();
    
    // Obtener el carrito actualizado con la información completa del producto
    const updatedCart = await Cart.findById(cart._id)
      .populate('items.product', 'name price image');

    res.json(updatedCart);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error al eliminar el producto del carrito' });
  }
});

module.exports = router;
