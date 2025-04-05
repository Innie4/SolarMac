# MAC Automation Backend

A comprehensive backend system for MAC Automation's industrial automation website, built with Node.js, Express.js, and MongoDB. This project is deployed on Vercel for optimal performance and scalability.

## Features

- **Authentication & Authorization**
  - User registration and login
  - JWT-based authentication
  - Role-based access control (admin, editor, user)
  - Password hashing and security

- **Product Management**
  - CRUD operations for products
  - Image upload support
  - Category and tag management
  - Search and filtering

- **Content Management**
  - News and research articles
  - Rich text content support
  - Image upload for articles
  - Category and tag organization

- **Newsletter System**
  - Subscriber management
  - Email verification
  - Newsletter sending
  - Subscription preferences

- **Contact Form**
  - Form submission handling
  - Admin notification system
  - Response management
  - Internal notes and tracking

- **Admin Dashboard**
  - System statistics
  - User management
  - Content management
  - System settings

## Prerequisites

- Node.js (v14 or higher)
- MongoDB (v4.4 or higher)
- npm or yarn
- Vercel CLI (for deployment)

## Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/Innie4/SolarMac.git
   cd SolarMac
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Create a `.env` file in the root directory:
   ```env
   PORT=5000
   MONGODB_URI=mongodb://localhost:27017/mac-automation
   JWT_SECRET=your-secret-key
   SMTP_HOST=smtp.example.com
   SMTP_PORT=587
   SMTP_USER=your-email@example.com
   SMTP_PASS=your-password
   ADMIN_EMAIL=admin@example.com
   UPLOAD_PATH=uploads
   SITE_NAME=MAC Automation
   SITE_DESCRIPTION=Your site description
   CONTACT_EMAIL=contact@example.com
   ```

4. Create the uploads directory:
   ```bash
   mkdir uploads
   ```

## Development

Start the development server:
```bash
npm run dev
```

The server will start on `http://localhost:5000` with hot-reloading enabled.

## Production

Build and start the production server:
```bash
npm run build
npm start
```

## Vercel Deployment

1. Install Vercel CLI:
   ```bash
   npm install -g vercel
   ```

2. Login to Vercel:
   ```bash
   vercel login
   ```

3. Set up environment variables in Vercel:
   - Go to your project settings in Vercel
   - Navigate to the "Environment Variables" section
   - Add all variables from your `.env` file
   - Make sure to use secure values for sensitive data

4. Deploy to Vercel:
   ```bash
   vercel
   ```

5. For production deployment:
   ```bash
   vercel --prod
   ```

### Important Notes for Vercel Deployment

1. **File Uploads**: 
   - In production, use a cloud storage service (e.g., AWS S3, Google Cloud Storage)
   - Update the upload configuration in `src/utils/upload.js`
   - Set up proper CORS and security policies

2. **MongoDB**:
   - Use MongoDB Atlas or another cloud MongoDB service
   - Update the `MONGODB_URI` in Vercel environment variables

3. **Environment Variables**:
   - All sensitive data should be stored in Vercel environment variables
   - Never commit `.env` files to version control

4. **Serverless Functions**:
   - The backend is configured to work with Vercel's serverless functions
   - API routes are automatically handled by the `vercel.json` configuration

5. **Static Files**:
   - Frontend files are served from the root directory
   - API routes are handled by the Express server

## API Documentation

### Authentication

#### Register User
- **POST** `/api/auth/register`
- Body:
  ```json
  {
    "firstName": "John",
    "lastName": "Doe",
    "email": "john@example.com",
    "password": "password123"
  }
  ```

#### Login
- **POST** `/api/auth/login`
- Body:
  ```json
  {
    "email": "john@example.com",
    "password": "password123"
  }
  ```

### Products

#### Get All Products
- **GET** `/api/products`
- Query Parameters:
  - `page`: Page number (default: 1)
  - `limit`: Items per page (default: 50)
  - `category`: Filter by category
  - `search`: Search query

#### Get Single Product
- **GET** `/api/products/:id`

#### Create Product (Admin/Editor)
- **POST** `/api/products`
- Body:
  ```json
  {
    "name": "Product Name",
    "description": "Product description",
    "category": "Category",
    "price": 99.99,
    "specifications": {
      "key": "value"
    }
  }
  ```

### Articles

#### Get All Articles
- **GET** `/api/articles`
- Query Parameters:
  - `page`: Page number (default: 1)
  - `limit`: Items per page (default: 50)
  - `type`: Filter by type (news/research)
  - `category`: Filter by category
  - `tag`: Filter by tag

#### Get Single Article
- **GET** `/api/articles/:slug`

#### Create Article (Admin/Editor)
- **POST** `/api/articles`
- Body:
  ```json
  {
    "title": "Article Title",
    "content": "Article content",
    "type": "news",
    "category": "Category",
    "tags": ["tag1", "tag2"]
  }
  ```

### Newsletter

#### Subscribe
- **POST** `/api/newsletter/subscribe`
- Body:
  ```json
  {
    "email": "subscriber@example.com",
    "firstName": "John",
    "lastName": "Doe",
    "preferences": {
      "news": true,
      "updates": true
    }
  }
  ```

### Contact Form

#### Submit Contact Form
- **POST** `/api/contact/submit`
- Body:
  ```json
  {
    "name": "John Doe",
    "email": "john@example.com",
    "phone": "1234567890",
    "company": "Company Name",
    "subject": "General Inquiry",
    "message": "Your message"
  }
  ```

### Admin Dashboard

#### Get Dashboard Statistics
- **GET** `/api/admin/stats`
- Requires Admin Role

#### Get User List
- **GET** `/api/admin/users`
- Query Parameters:
  - `page`: Page number (default: 1)
  - `limit`: Items per page (default: 50)
  - `role`: Filter by role
  - `status`: Filter by status

## Security

- JWT-based authentication
- Password hashing with bcrypt
- Helmet for security headers
- CORS configuration
- Rate limiting
- Input validation
- XSS protection

## Error Handling

The API returns errors in the following format:
```json
{
  "status": "error",
  "message": "Error message"
}
```

Common HTTP status codes:
- 200: Success
- 201: Created
- 400: Bad Request
- 401: Unauthorized
- 403: Forbidden
- 404: Not Found
- 500: Internal Server Error

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details. 
