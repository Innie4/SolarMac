const express = require('express');
const nodemailer = require('nodemailer');
const { body, validationResult } = require('express-validator');
const Newsletter = require('../models/newsletter.model');
const { auth, checkRole } = require('../middleware/auth.middleware');
const crypto = require('crypto');

const router = express.Router();

// Configure nodemailer
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: process.env.SMTP_PORT,
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  }
});

// Subscribe to newsletter
router.post('/subscribe',
  [
    body('email').isEmail().normalizeEmail(),
    body('firstName').optional().trim(),
    body('lastName').optional().trim(),
    body('preferences.automation').optional().isBoolean(),
    body('preferences.manufacturing').optional().isBoolean(),
    body('preferences.technology').optional().isBoolean(),
    body('preferences.research').optional().isBoolean()
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { email, firstName, lastName, preferences } = req.body;

      // Check if already subscribed
      const existingSubscriber = await Newsletter.findOne({ email });
      if (existingSubscriber) {
        return res.status(400).json({
          status: 'error',
          message: 'Email already subscribed'
        });
      }

      // Generate verification token
      const verificationToken = crypto.randomBytes(32).toString('hex');
      const verificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

      // Create subscriber
      const subscriber = new Newsletter({
        email,
        firstName,
        lastName,
        preferences,
        verificationToken,
        verificationExpires,
        metadata: {
          ipAddress: req.ip,
          userAgent: req.get('user-agent'),
          source: req.body.source || 'website'
        }
      });

      await subscriber.save();

      // Send verification email
      const verificationUrl = `${process.env.FRONTEND_URL}/verify-newsletter?token=${verificationToken}`;
      await transporter.sendMail({
        from: process.env.SMTP_USER,
        to: email,
        subject: 'Verify your newsletter subscription',
        html: `
          <h1>Welcome to MAC Automation Newsletter!</h1>
          <p>Please click the link below to verify your subscription:</p>
          <a href="${verificationUrl}">${verificationUrl}</a>
          <p>This link will expire in 24 hours.</p>
        `
      });

      res.status(201).json({
        status: 'success',
        message: 'Please check your email to verify your subscription'
      });
    } catch (error) {
      res.status(500).json({
        status: 'error',
        message: 'Error subscribing to newsletter'
      });
    }
  }
);

// Verify newsletter subscription
router.get('/verify/:token', async (req, res) => {
  try {
    const subscriber = await Newsletter.findOne({
      verificationToken: req.params.token,
      verificationExpires: { $gt: Date.now() }
    });

    if (!subscriber) {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid or expired verification token'
      });
    }

    subscriber.status = 'subscribed';
    subscriber.verificationToken = undefined;
    subscriber.verificationExpires = undefined;
    await subscriber.save();

    res.json({
      status: 'success',
      message: 'Newsletter subscription verified successfully'
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'Error verifying newsletter subscription'
    });
  }
});

// Unsubscribe from newsletter
router.post('/unsubscribe',
  [
    body('email').isEmail().normalizeEmail()
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const subscriber = await Newsletter.findOne({ email: req.body.email });
      if (!subscriber) {
        return res.status(404).json({
          status: 'error',
          message: 'Subscriber not found'
        });
      }

      subscriber.status = 'unsubscribed';
      await subscriber.save();

      res.json({
        status: 'success',
        message: 'Successfully unsubscribed from newsletter'
      });
    } catch (error) {
      res.status(500).json({
        status: 'error',
        message: 'Error unsubscribing from newsletter'
      });
    }
  }
);

// Update subscription preferences
router.patch('/preferences',
  auth,
  [
    body('preferences.automation').optional().isBoolean(),
    body('preferences.manufacturing').optional().isBoolean(),
    body('preferences.technology').optional().isBoolean(),
    body('preferences.research').optional().isBoolean()
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const subscriber = await Newsletter.findOne({ email: req.user.email });
      if (!subscriber) {
        return res.status(404).json({
          status: 'error',
          message: 'Subscriber not found'
        });
      }

      subscriber.preferences = {
        ...subscriber.preferences,
        ...req.body.preferences
      };

      await subscriber.save();

      res.json({
        status: 'success',
        data: { preferences: subscriber.preferences }
      });
    } catch (error) {
      res.status(500).json({
        status: 'error',
        message: 'Error updating subscription preferences'
      });
    }
  }
);

// Admin: Get all subscribers
router.get('/subscribers',
  auth,
  checkRole('admin'),
  async (req, res) => {
    try {
      const { status, page = 1, limit = 50 } = req.query;
      const query = {};

      if (status) {
        query.status = status;
      }

      const subscribers = await Newsletter.find(query)
        .sort({ createdAt: -1 })
        .limit(limit * 1)
        .skip((page - 1) * limit);

      const total = await Newsletter.countDocuments(query);

      res.json({
        status: 'success',
        data: {
          subscribers,
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
        message: 'Error fetching subscribers'
      });
    }
  }
);

// Admin: Send newsletter
router.post('/send',
  auth,
  checkRole('admin'),
  [
    body('subject').trim().notEmpty(),
    body('content').notEmpty(),
    body('categories').optional().isArray()
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { subject, content, categories } = req.body;

      // Get active subscribers based on preferences
      const query = { status: 'subscribed' };
      if (categories && categories.length > 0) {
        query['preferences.$or'] = categories.map(category => ({
          [`preferences.${category}`]: true
        }));
      }

      const subscribers = await Newsletter.find(query);

      // Send emails in batches
      const batchSize = 50;
      for (let i = 0; i < subscribers.length; i += batchSize) {
        const batch = subscribers.slice(i, i + batchSize);
        const promises = batch.map(subscriber =>
          transporter.sendMail({
            from: process.env.SMTP_USER,
            to: subscriber.email,
            subject,
            html: content
          })
        );

        await Promise.all(promises);
        await new Promise(resolve => setTimeout(resolve, 1000)); // Rate limiting
      }

      // Update lastEmailSent for all subscribers
      await Newsletter.updateMany(
        { _id: { $in: subscribers.map(s => s._id) } },
        { lastEmailSent: new Date() }
      );

      res.json({
        status: 'success',
        message: `Newsletter sent to ${subscribers.length} subscribers`
      });
    } catch (error) {
      res.status(500).json({
        status: 'error',
        message: 'Error sending newsletter'
      });
    }
  }
);

module.exports = router; 