const express = require('express');
const multer = require('multer');
const path = require('path');
const { body, validationResult } = require('express-validator');
const Article = require('../models/article.model');
const { auth, checkRole } = require('../middleware/auth.middleware');

const router = express.Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, '../../uploads/articles'));
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

// Get all articles
router.get('/', async (req, res) => {
  try {
    const { type, category, tag, search, page = 1, limit = 10 } = req.query;
    const query = { status: 'published' };

    // Apply filters
    if (type) query.type = type;
    if (category) query.category = category;
    if (tag) query.tags = tag;
    if (search) {
      query.$text = { $search: search };
    }

    // Execute query with pagination
    const articles = await Article.find(query)
      .sort({ publishedAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .populate('author', 'firstName lastName');

    const total = await Article.countDocuments(query);

    res.json({
      status: 'success',
      data: {
        articles,
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
      message: 'Error fetching articles'
    });
  }
});

// Get single article
router.get('/:slug', async (req, res) => {
  try {
    const article = await Article.findOne({ slug: req.params.slug })
      .populate('author', 'firstName lastName');

    if (!article) {
      return res.status(404).json({
        status: 'error',
        message: 'Article not found'
      });
    }

    // Increment view count
    article.analytics.views += 1;
    await article.save();

    res.json({
      status: 'success',
      data: { article }
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'Error fetching article'
    });
  }
});

// Create article (admin/editor only)
router.post('/',
  auth,
  checkRole('admin', 'editor'),
  upload.array('images', 5),
  [
    body('title').trim().notEmpty(),
    body('content').notEmpty(),
    body('excerpt').notEmpty(),
    body('type').isIn(['news', 'research', 'case-study']),
    body('category').isIn(['Automation', 'Manufacturing', 'Technology', 'Industry Trends', 'Research']),
    body('tags.*').optional().trim()
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const articleData = req.body;
      articleData.author = req.user._id;

      // Handle image uploads
      if (req.files && req.files.length > 0) {
        articleData.featuredImage = {
          url: `/uploads/articles/${req.files[0].filename}`,
          alt: articleData.title
        };

        articleData.images = req.files.map((file, index) => ({
          url: `/uploads/articles/${file.filename}`,
          alt: articleData.title,
          caption: ''
        }));
      }

      const article = new Article(articleData);
      await article.save();

      res.status(201).json({
        status: 'success',
        data: { article }
      });
    } catch (error) {
      res.status(500).json({
        status: 'error',
        message: 'Error creating article'
      });
    }
  }
);

// Update article (admin/editor only)
router.patch('/:id',
  auth,
  checkRole('admin', 'editor'),
  upload.array('images', 5),
  [
    body('title').optional().trim().notEmpty(),
    body('content').optional().notEmpty(),
    body('excerpt').optional().notEmpty(),
    body('type').optional().isIn(['news', 'research', 'case-study']),
    body('category').optional().isIn(['Automation', 'Manufacturing', 'Technology', 'Industry Trends', 'Research']),
    body('tags.*').optional().trim(),
    body('status').optional().isIn(['draft', 'published', 'archived'])
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const article = await Article.findById(req.params.id);
      if (!article) {
        return res.status(404).json({
          status: 'error',
          message: 'Article not found'
        });
      }

      const updates = Object.keys(req.body);
      const allowedUpdates = ['title', 'content', 'excerpt', 'type', 'category', 'tags', 'status'];
      const isValidOperation = updates.every(update => allowedUpdates.includes(update));

      if (!isValidOperation) {
        return res.status(400).json({
          status: 'error',
          message: 'Invalid updates'
        });
      }

      // Handle image uploads
      if (req.files && req.files.length > 0) {
        const newImages = req.files.map(file => ({
          url: `/uploads/articles/${file.filename}`,
          alt: req.body.title || article.title,
          caption: ''
        }));

        // Update featured image if new images are uploaded
        article.featuredImage = newImages[0];
        article.images = [...article.images, ...newImages];
      }

      updates.forEach(update => article[update] = req.body[update]);

      // Set publishedAt if status is changed to published
      if (req.body.status === 'published' && article.status !== 'published') {
        article.publishedAt = new Date();
      }

      await article.save();

      res.json({
        status: 'success',
        data: { article }
      });
    } catch (error) {
      res.status(500).json({
        status: 'error',
        message: 'Error updating article'
      });
    }
  }
);

// Delete article (admin only)
router.delete('/:id',
  auth,
  checkRole('admin'),
  async (req, res) => {
    try {
      const article = await Article.findById(req.params.id);
      if (!article) {
        return res.status(404).json({
          status: 'error',
          message: 'Article not found'
        });
      }

      await article.remove();

      res.json({
        status: 'success',
        message: 'Article deleted successfully'
      });
    } catch (error) {
      res.status(500).json({
        status: 'error',
        message: 'Error deleting article'
      });
    }
  }
);

// Get articles by category
router.get('/category/:category', async (req, res) => {
  try {
    const articles = await Article.find({
      category: req.params.category,
      status: 'published'
    })
    .sort({ publishedAt: -1 })
    .populate('author', 'firstName lastName');

    res.json({
      status: 'success',
      data: { articles }
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'Error fetching articles by category'
    });
  }
});

// Get articles by tag
router.get('/tag/:tag', async (req, res) => {
  try {
    const articles = await Article.find({
      tags: req.params.tag,
      status: 'published'
    })
    .sort({ publishedAt: -1 })
    .populate('author', 'firstName lastName');

    res.json({
      status: 'success',
      data: { articles }
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'Error fetching articles by tag'
    });
  }
});

// Search articles
router.get('/search/:query', async (req, res) => {
  try {
    const articles = await Article.find(
      {
        $text: { $search: req.params.query },
        status: 'published'
      },
      { score: { $meta: 'textScore' } }
    )
    .sort({ score: { $meta: 'textScore' } })
    .populate('author', 'firstName lastName');

    res.json({
      status: 'success',
      data: { articles }
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'Error searching articles'
    });
  }
});

// Increment article analytics
router.post('/:id/analytics', async (req, res) => {
  try {
    const { type } = req.body;
    const article = await Article.findById(req.params.id);

    if (!article) {
      return res.status(404).json({
        status: 'error',
        message: 'Article not found'
      });
    }

    if (type === 'view') {
      article.analytics.views += 1;
    } else if (type === 'share') {
      article.analytics.shares += 1;
    } else if (type === 'comment') {
      article.analytics.comments += 1;
    } else {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid analytics type'
      });
    }

    await article.save();

    res.json({
      status: 'success',
      data: { analytics: article.analytics }
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'Error updating article analytics'
    });
  }
});

module.exports = router; 