const mongoose = require('mongoose');

const newsletterSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true
  },
  firstName: {
    type: String,
    trim: true
  },
  lastName: {
    type: String,
    trim: true
  },
  preferences: {
    automation: {
      type: Boolean,
      default: true
    },
    manufacturing: {
      type: Boolean,
      default: true
    },
    technology: {
      type: Boolean,
      default: true
    },
    research: {
      type: Boolean,
      default: true
    }
  },
  status: {
    type: String,
    enum: ['subscribed', 'unsubscribed', 'pending'],
    default: 'pending'
  },
  verificationToken: String,
  verificationExpires: Date,
  lastEmailSent: Date,
  metadata: {
    source: String,
    campaign: String,
    ipAddress: String,
    userAgent: String
  }
}, {
  timestamps: true
});

// Index for email lookups
newsletterSchema.index({ email: 1 });
newsletterSchema.index({ status: 1 });

const Newsletter = mongoose.model('Newsletter', newsletterSchema);

module.exports = Newsletter; 