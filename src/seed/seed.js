require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('../models/user.model');
const Product = require('../models/product.model');
const Article = require('../models/article.model');

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  useCreateIndex: true
})
.then(() => console.log('Connected to MongoDB'))
.catch(err => console.error('MongoDB connection error:', err));

// Sample data
const users = [
  {
    firstName: 'Admin',
    lastName: 'User',
    email: 'admin@example.com',
    password: 'admin123',
    role: 'admin',
    status: 'active'
  },
  {
    firstName: 'Editor',
    lastName: 'User',
    email: 'editor@example.com',
    password: 'editor123',
    role: 'editor',
    status: 'active'
  },
  {
    firstName: 'Regular',
    lastName: 'User',
    email: 'user@example.com',
    password: 'user123',
    role: 'user',
    status: 'active'
  }
];

const products = [
  {
    name: 'Industrial Robot Arm',
    description: 'Advanced 6-axis robotic arm for industrial automation',
    category: 'Robotics',
    price: 49999.99,
    specifications: {
      'Payload': '10kg',
      'Reach': '1.5m',
      'Accuracy': '±0.02mm',
      'Power': '220V AC'
    },
    features: [
      'High precision control',
      'Built-in safety features',
      'Easy programming interface',
      'Remote monitoring capability'
    ],
    images: [
      {
        url: '/uploads/products/robot-arm-1.jpg',
        alt: 'Robot Arm Front View'
      },
      {
        url: '/uploads/products/robot-arm-2.jpg',
        alt: 'Robot Arm Side View'
      }
    ],
    status: 'active'
  },
  {
    name: 'PLC Controller',
    description: 'Programmable Logic Controller for industrial control systems',
    category: 'Controllers',
    price: 2999.99,
    specifications: {
      'Inputs': '32 digital, 8 analog',
      'Outputs': '24 digital, 4 analog',
      'Processor': '32-bit ARM',
      'Memory': '256MB'
    },
    features: [
      'Real-time processing',
      'Ethernet connectivity',
      'Backup power supply',
      'Diagnostic tools'
    ],
    images: [
      {
        url: '/uploads/products/plc-1.jpg',
        alt: 'PLC Controller Front'
      }
    ],
    status: 'active'
  }
];

const articles = [
  {
    title: 'The Future of Industrial Automation',
    slug: 'future-of-industrial-automation',
    content: `
      <h2>Introduction</h2>
      <p>Industrial automation is rapidly evolving with the integration of artificial intelligence and machine learning...</p>
      
      <h2>Key Trends</h2>
      <ul>
        <li>AI-powered decision making</li>
        <li>Predictive maintenance</li>
        <li>Digital twins</li>
        <li>Edge computing</li>
      </ul>
      
      <h2>Conclusion</h2>
      <p>The future of industrial automation is bright, with endless possibilities for innovation and efficiency...</p>
    `,
    excerpt: 'Explore the latest trends and developments in industrial automation technology.',
    type: 'research',
    category: 'Technology',
    tags: ['AI', 'Automation', 'Industry 4.0', 'Technology'],
    author: 'admin@example.com',
    status: 'published',
    publishedAt: new Date(),
    analytics: {
      views: 150,
      shares: 25,
      comments: 8
    }
  },
  {
    title: 'MAC Automation Launches New Product Line',
    slug: 'mac-automation-new-product-line',
    content: `
      <h2>Exciting News</h2>
      <p>MAC Automation is proud to announce the launch of our new product line...</p>
      
      <h2>New Products</h2>
      <ul>
        <li>Advanced Robotic Systems</li>
        <li>Smart Controllers</li>
        <li>IoT Sensors</li>
      </ul>
      
      <h2>Availability</h2>
      <p>The new products will be available starting next month...</p>
    `,
    excerpt: 'MAC Automation announces the launch of its new product line featuring cutting-edge automation solutions.',
    type: 'news',
    category: 'Company News',
    tags: ['Product Launch', 'Innovation', 'Company News'],
    author: 'editor@example.com',
    status: 'published',
    publishedAt: new Date(),
    analytics: {
      views: 200,
      shares: 35,
      comments: 12
    }
  }
];

// Seed function
async function seed() {
  try {
    // Clear existing data
    await Promise.all([
      User.deleteMany({}),
      Product.deleteMany({}),
      Article.deleteMany({})
    ]);

    // Hash passwords and create users
    const createdUsers = await Promise.all(
      users.map(async (user) => {
        const hashedPassword = await bcrypt.hash(user.password, 10);
        return User.create({
          ...user,
          password: hashedPassword
        });
      })
    );

    // Create products
    const createdProducts = await Product.insertMany(products);

    // Create articles
    const createdArticles = await Article.insertMany(articles);

    console.log('Seed data created successfully:');
    console.log(`- ${createdUsers.length} users`);
    console.log(`- ${createdProducts.length} products`);
    console.log(`- ${createdArticles.length} articles`);

    process.exit(0);
  } catch (error) {
    console.error('Error seeding data:', error);
    process.exit(1);
  }
}

// Run seed function
seed(); 