const express = require('express');
const nodemailer = require('nodemailer');
const { body, validationResult } = require('express-validator');
const Contact = require('../models/contact.model');
const { auth, checkRole } = require('../middleware/auth.middleware');

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

// Submit contact form
router.post('/submit',
  [
    body('name').trim().notEmpty(),
    body('email').isEmail().normalizeEmail(),
    body('phone').optional().trim(),
    body('company').optional().trim(),
    body('subject').isIn(['General Inquiry', 'Product Information', 'Technical Support', 'Partnership', 'Other']),
    body('message').trim().notEmpty()
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const contactData = {
        ...req.body,
        metadata: {
          ipAddress: req.ip,
          userAgent: req.get('user-agent')
        }
      };

      const contact = new Contact(contactData);
      await contact.save();

      // Send notification email to admin
      await transporter.sendMail({
        from: process.env.SMTP_USER,
        to: process.env.ADMIN_EMAIL,
        subject: `New Contact Form Submission: ${contactData.subject}`,
        html: `
          <h2>New Contact Form Submission</h2>
          <p><strong>Name:</strong> ${contactData.name}</p>
          <p><strong>Email:</strong> ${contactData.email}</p>
          <p><strong>Phone:</strong> ${contactData.phone || 'Not provided'}</p>
          <p><strong>Company:</strong> ${contactData.company || 'Not provided'}</p>
          <p><strong>Subject:</strong> ${contactData.subject}</p>
          <p><strong>Message:</strong></p>
          <p>${contactData.message}</p>
        `
      });

      // Send confirmation email to user
      await transporter.sendMail({
        from: process.env.SMTP_USER,
        to: contactData.email,
        subject: 'Thank you for contacting MAC Automation',
        html: `
          <h1>Thank you for contacting MAC Automation</h1>
          <p>We have received your message and will get back to you shortly.</p>
          <p>Best regards,<br>MAC Automation Team</p>
        `
      });

      res.status(201).json({
        status: 'success',
        message: 'Message sent successfully'
      });
    } catch (error) {
      res.status(500).json({
        status: 'error',
        message: 'Error submitting contact form'
      });
    }
  }
);

// Admin: Get all contact submissions
router.get('/submissions',
  auth,
  checkRole('admin'),
  async (req, res) => {
    try {
      const { status, priority, page = 1, limit = 50 } = req.query;
      const query = {};

      if (status) query.status = status;
      if (priority) query.priority = priority;

      const submissions = await Contact.find(query)
        .sort({ createdAt: -1 })
        .limit(limit * 1)
        .skip((page - 1) * limit)
        .populate('assignedTo', 'firstName lastName');

      const total = await Contact.countDocuments(query);

      res.json({
        status: 'success',
        data: {
          submissions,
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
        message: 'Error fetching contact submissions'
      });
    }
  }
);

// Admin: Get single submission
router.get('/submissions/:id',
  auth,
  checkRole('admin'),
  async (req, res) => {
    try {
      const submission = await Contact.findById(req.params.id)
        .populate('assignedTo', 'firstName lastName');

      if (!submission) {
        return res.status(404).json({
          status: 'error',
          message: 'Submission not found'
        });
      }

      res.json({
        status: 'success',
        data: { submission }
      });
    } catch (error) {
      res.status(500).json({
        status: 'error',
        message: 'Error fetching submission'
      });
    }
  }
);

// Admin: Update submission status
router.patch('/submissions/:id/status',
  auth,
  checkRole('admin'),
  [
    body('status').isIn(['new', 'in-progress', 'resolved', 'archived']),
    body('priority').optional().isIn(['low', 'medium', 'high']),
    body('assignedTo').optional().isMongoId()
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const submission = await Contact.findById(req.params.id);
      if (!submission) {
        return res.status(404).json({
          status: 'error',
          message: 'Submission not found'
        });
      }

      const updates = Object.keys(req.body);
      const allowedUpdates = ['status', 'priority', 'assignedTo'];
      const isValidOperation = updates.every(update => allowedUpdates.includes(update));

      if (!isValidOperation) {
        return res.status(400).json({
          status: 'error',
          message: 'Invalid updates'
        });
      }

      updates.forEach(update => submission[update] = req.body[update]);
      await submission.save();

      res.json({
        status: 'success',
        data: { submission }
      });
    } catch (error) {
      res.status(500).json({
        status: 'error',
        message: 'Error updating submission status'
      });
    }
  }
);

// Admin: Add note to submission
router.post('/submissions/:id/notes',
  auth,
  checkRole('admin'),
  [
    body('content').trim().notEmpty()
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const submission = await Contact.findById(req.params.id);
      if (!submission) {
        return res.status(404).json({
          status: 'error',
          message: 'Submission not found'
        });
      }

      submission.notes.push({
        content: req.body.content,
        createdBy: req.user._id
      });

      await submission.save();

      res.json({
        status: 'success',
        data: { submission }
      });
    } catch (error) {
      res.status(500).json({
        status: 'error',
        message: 'Error adding note to submission'
      });
    }
  }
);

// Admin: Reply to submission
router.post('/submissions/:id/reply',
  auth,
  checkRole('admin'),
  [
    body('message').trim().notEmpty()
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const submission = await Contact.findById(req.params.id);
      if (!submission) {
        return res.status(404).json({
          status: 'error',
          message: 'Submission not found'
        });
      }

      // Send reply email
      await transporter.sendMail({
        from: process.env.SMTP_USER,
        to: submission.email,
        subject: `Re: ${submission.subject}`,
        html: `
          <h2>Response to your inquiry</h2>
          <p>${req.body.message}</p>
          <p>Best regards,<br>MAC Automation Team</p>
        `
      });

      // Add note about the reply
      submission.notes.push({
        content: `Replied to customer: ${req.body.message}`,
        createdBy: req.user._id
      });

      await submission.save();

      res.json({
        status: 'success',
        message: 'Reply sent successfully'
      });
    } catch (error) {
      res.status(500).json({
        status: 'error',
        message: 'Error sending reply'
      });
    }
  }
);

module.exports = router; 