const express = require('express');
const multer = require('multer');
const path = require('path');
const { body, validationResult } = require('express-validator');
const Product = require('../models/product.model');
const { auth, checkRole } = require('../middleware/auth.middleware');

const router = express.Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, '../../uploads/products'));
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only JPEG, PNG and GIF are allowed.'));
    }
  }
});

// Get all products
router.get('/', async (req, res) => {
  try {
    const { category, search, sort, page = 1, limit = 10 } = req.query;
    const query = {};

    // Apply filters
    if (category) query.category = category;
    if (search) {
      query.$text = { $search: search };
    }

    // Apply sorting
    let sortOption = {};
    if (sort) {
      const [field, order] = sort.split(':');
      sortOption[field] = order === 'desc' ? -1 : 1;
    }

    // Execute query with pagination
    const products = await Product.find(query)
      .sort(sortOption)
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .populate('createdBy', 'firstName lastName')
      .populate('updatedBy', 'firstName lastName');

    const total = await Product.countDocuments(query);

    res.json({
      status: 'success',
      data: {
        products,
        pagination: {
          total,
          page: page * 1,
          pages: Math.ceil(total / limit)
        }
      }
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'Error fetching products'
    });
  }
});

// Get single product
router.get('/:id', async (req, res) => {
  try {
    const product = await Product.findById(req.params.id)
      .populate('createdBy', 'firstName lastName')
      .populate('updatedBy', 'firstName lastName');

    if (!product) {
      return res.status(404).json({
        status: 'error',
        message: 'Product not found'
      });
    }

    res.json({
      status: 'success',
      data: { product }
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'Error fetching product'
    });
  }
});

// Create product (admin/editor only)
router.post('/',
  auth,
  checkRole('admin', 'editor'),
  upload.array('images', 5),
  [
    body('name').trim().notEmpty(),
    body('description').notEmpty(),
    body('category').isIn(['Automation Systems', 'Robotics', 'Control Systems', 'Sensors', 'Software Solutions']),
    body('price').isFloat({ min: 0 }),
    body('availability').isIn(['In Stock', 'Out of Stock', 'Pre-order']),
    body('tags.*').optional().trim()
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const productData = req.body;
      productData.createdBy = req.user._id;

      // Handle image uploads
      if (req.files && req.files.length > 0) {
        productData.images = req.files.map((file, index) => ({
          url: `/uploads/products/${file.filename}`,
          alt: productData.name,
          isMain: index === 0
        }));
      }

      const product = new Product(productData);
      await product.save();

      res.status(201).json({
        status: 'success',
        data: { product }
      });
    } catch (error) {
      res.status(500).json({
        status: 'error',
        message: 'Error creating product'
      });
    }
  }
);

// Update product (admin/editor only)
router.patch('/:id',
  auth,
  checkRole('admin', 'editor'),
  upload.array('images', 5),
  [
    body('name').optional().trim().notEmpty(),
    body('description').optional().notEmpty(),
    body('category').optional().isIn(['Automation Systems', 'Robotics', 'Control Systems', 'Sensors', 'Software Solutions']),
    body('price').optional().isFloat({ min: 0 }),
    body('availability').optional().isIn(['In Stock', 'Out of Stock', 'Pre-order']),
    body('tags.*').optional().trim()
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const product = await Product.findById(req.params.id);
      if (!product) {
        return res.status(404).json({
          status: 'error',
          message: 'Product not found'
        });
      }

      const updates = Object.keys(req.body);
      const allowedUpdates = ['name', 'description', 'category', 'price', 'availability', 'tags', 'specifications', 'features'];
      const isValidOperation = updates.every(update => allowedUpdates.includes(update));

      if (!isValidOperation) {
        return res.status(400).json({
          status: 'error',
          message: 'Invalid updates'
        });
      }

      // Handle image uploads
      if (req.files && req.files.length > 0) {
        const newImages = req.files.map((file, index) => ({
          url: `/uploads/products/${file.filename}`,
          alt: req.body.name || product.name,
          isMain: index === 0
        }));

        // If new main image is uploaded, update all images
        if (newImages[0].isMain) {
          product.images = newImages;
        } else {
          // Append new images to existing ones
          product.images = [...product.images, ...newImages];
        }
      }

      updates.forEach(update => product[update] = req.body[update]);
      product.updatedBy = req.user._id;
      await product.save();

      res.json({
        status: 'success',
        data: { product }
      });
    } catch (error) {
      res.status(500).json({
        status: 'error',
        message: 'Error updating product'
      });
    }
  }
);

// Delete product (admin only)
router.delete('/:id',
  auth,
  checkRole('admin'),
  async (req, res) => {
    try {
      const product = await Product.findById(req.params.id);
      if (!product) {
        return res.status(404).json({
          status: 'error',
          message: 'Product not found'
        });
      }

      await product.remove();

      res.json({
        status: 'success',
        message: 'Product deleted successfully'
      });
    } catch (error) {
      res.status(500).json({
        status: 'error',
        message: 'Error deleting product'
      });
    }
  }
);

// Get products by category
router.get('/category/:category', async (req, res) => {
  try {
    const products = await Product.find({ category: req.params.category })
      .populate('createdBy', 'firstName lastName')
      .populate('updatedBy', 'firstName lastName');

    res.json({
      status: 'success',
      data: { products }
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'Error fetching products by category'
    });
  }
});

// Search products
router.get('/search/:query', async (req, res) => {
  try {
    const products = await Product.find(
      { $text: { $search: req.params.query } },
      { score: { $meta: 'textScore' } }
    )
    .sort({ score: { $meta: 'textScore' } })
    .populate('createdBy', 'firstName lastName')
    .populate('updatedBy', 'firstName lastName');

    res.json({
      status: 'success',
      data: { products }
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'Error searching products'
    });
  }
});

module.exports = router; 