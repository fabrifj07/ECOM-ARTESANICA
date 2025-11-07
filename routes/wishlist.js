const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const Wishlist = require('../models/Wishlist');
const Product = require('../models/Product');

// @route   GET /api/wishlist
// @desc    Obtener la lista de deseos del usuario
// @access  Privado
router.get('/', protect, async (req, res) => {
  try {
    const wishlist = await Wishlist.findOne({ user: req.user.id })
      .populate('items.product', 'name price image')
      .lean();
    
    if (!wishlist) {
      return res.json({ items: [] });
    }
    
    res.json(wishlist);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error al obtener la lista de deseos' });
  }
});

// @route   POST /api/wishlist/:productId
// @desc    Agregar un producto a la lista de deseos
// @access  Privado
router.post('/:productId', protect, async (req, res) => {
  try {
    const product = await Product.findById(req.params.productId);
    if (!product) {
      return res.status(404).json({ message: 'Producto no encontrado' });
    }

    let wishlist = await Wishlist.findOne({ user: req.user.id });

    if (!wishlist) {
      // Crear nueva lista de deseos si no existe
      wishlist = new Wishlist({
        user: req.user.id,
        items: [{ product: product._id }]
      });
    } else {
      // Verificar si el producto ya está en la lista
      const itemIndex = wishlist.items.findIndex(
        item => item.product.toString() === req.params.productId
      );

      if (itemIndex >= 0) {
        return res.status(400).json({ message: 'El producto ya está en tu lista de deseos' });
      }

      // Agregar el producto a la lista
      wishlist.items.push({ product: product._id });
    }

    await wishlist.save();
    
    // Obtener la lista actualizada con la información del producto
    const updatedWishlist = await Wishlist.findById(wishlist._id)
      .populate('items.product', 'name price image');

    res.status(201).json(updatedWishlist);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error al actualizar la lista de deseos' });
  }
});

// @route   DELETE /api/wishlist/:productId
// @desc    Eliminar un producto de la lista de deseos
// @access  Privato
router.delete('/:productId', protect, async (req, res) => {
  try {
    const wishlist = await Wishlist.findOne({ user: req.user.id });
    
    if (!wishlist) {
      return res.status(404).json({ message: 'Lista de deseos no encontrada' });
    }

    const itemIndex = wishlist.items.findIndex(
      item => item.product.toString() === req.params.productId
    );

    if (itemIndex === -1) {
      return res.status(404).json({ message: 'Producto no encontrado en la lista de deseos' });
    }

    // Eliminar el producto de la lista
    wishlist.items.splice(itemIndex, 1);
    
    // Si no quedan productos, eliminar la lista
    if (wishlist.items.length === 0) {
      await Wishlist.findByIdAndDelete(wishlist._id);
      return res.json({ message: 'Lista de deseos vacía', items: [] });
    }

    await wishlist.save();
    
    // Obtener la lista actualizada con la información del producto
    const updatedWishlist = await Wishlist.findById(wishlist._id)
      .populate('items.product', 'name price image');

    res.json(updatedWishlist);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error al eliminar el producto de la lista de deseos' });
  }
});

module.exports = router;
