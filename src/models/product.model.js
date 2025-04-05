const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    required: true
  },
  category: {
    type: String,
    required: true,
    enum: ['Automation Systems', 'Robotics', 'Control Systems', 'Sensors', 'Software Solutions']
  },
  specifications: {
    type: Map,
    of: String
  },
  features: [{
    type: String
  }],
  images: [{
    url: String,
    alt: String,
    isMain: {
      type: Boolean,
      default: false
    }
  }],
  documentation: [{
    title: String,
    url: String,
    type: String
  }],
  price: {
    type: Number,
    required: true
  },
  availability: {
    type: String,
    enum: ['In Stock', 'Out of Stock', 'Pre-order'],
    default: 'In Stock'
  },
  tags: [{
    type: String
  }],
  metadata: {
    seoTitle: String,
    seoDescription: String,
    keywords: [String]
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true
});

// Indexes for better query performance
productSchema.index({ name: 'text', description: 'text' });
productSchema.index({ category: 1 });
productSchema.index({ tags: 1 });

const Product = mongoose.model('Product', productSchema);

module.exports = Product; 