# Nabra XR - E-commerce Backend API

## Overview

Nabra XR is a comprehensive e-commerce backend API built with NestJS and TypeScript. The system provides a complete solution for online retail operations, including product management, user authentication, order processing, payment integration, shipping management, and administrative tools.

## Core Features

### Authentication & User Management
- Traditional email/password registration and login
- Google OAuth2 integration for social authentication
- JWT-based authentication with role-based access control
- User profile management with configurable personal data
- Multiple shipping addresses per user
- User preferences and notification settings

### Product & Inventory Management
- Complete product catalog management
- Category-based product organization
- Product images and media handling
- Stock tracking and inventory management
- Product search and filtering capabilities

### Shopping Cart & Orders
- Persistent shopping cart functionality
- Real-time cart updates and synchronization
- Order creation and management
- Order status tracking and updates
- Order history and user purchase records

### Payment Processing
- PayPal integration for secure payments
- Payment verification and processing
- Order confirmation and payment status tracking
- Refund and cancellation support

### Shipping & Logistics
- DrEnvío integration for shipping calculations
- Multiple shipping options and rates
- Real-time shipping cost calculation
- Package tracking and delivery updates
- Shipping address validation

### Promotions & Discounts
- Advanced promotion system with 22+ promotion types
- Automatic discount application to cart items
- Coupon code management and validation
- Real-time promotion updates for existing cart items
- Time-based and condition-based promotions

### Reviews & Ratings
- Product review and rating system
- Verified purchase reviews
- Review moderation and management
- Photo attachments for reviews
- Review helpfulness voting

### Notifications
- Multi-channel notification system (Email, SMS, Push, In-app)
- Customizable notification templates
- User notification preferences
- Automated notifications for order updates
- Marketing and promotional notifications

### Administrative Tools
- Comprehensive admin dashboard
- User management and moderation
- Product and inventory management
- Order processing and fulfillment
- Promotion and discount management
- System analytics and reporting

## Technical Architecture

### Framework & Language
- **NestJS**: Modern Node.js framework for building scalable server-side applications
- **TypeScript**: Strong typing for enhanced code quality and maintainability
- **MongoDB**: NoSQL database with Mongoose ODM for flexible data modeling

### Authentication & Security
- **JWT**: JSON Web Tokens for stateless authentication
- **Passport.js**: Authentication middleware with multiple strategies
- **CORS**: Cross-origin resource sharing configuration
- **Input validation**: Comprehensive request validation using class-validator

### External Integrations
- **Google OAuth2**: Social authentication integration
- **PayPal API**: Payment processing and transaction management
- **DrEnvío API**: Shipping and logistics integration
- **Email/SMS Services**: Notification delivery systems

### Data Management
- **MongoDB**: Primary database for all application data
- **Mongoose**: Object Document Mapping with schema validation
- **File Upload**: Media handling for product images and user content

## System Capabilities

### Scalability
- Modular architecture with clear separation of concerns
- Microservice-ready design with independent modules
- Efficient database queries with proper indexing
- Configurable environment settings for different deployment stages

### Security
- Role-based access control (RBAC)
- Input sanitization and validation
- Secure password hashing
- Protected API endpoints with authentication guards
- Rate limiting and request throttling

### Performance
- Optimized database queries
- Efficient data serialization
- Caching strategies for frequently accessed data
- Pagination for large data sets

### Monitoring & Logging
- Comprehensive error handling and logging
- Request/response logging for debugging
- Performance monitoring capabilities
- Health check endpoints

## Business Logic

### E-commerce Workflow
1. **User Registration/Login**: Users can create accounts or authenticate via Google
2. **Product Browsing**: Browse products with search, filtering, and categorization
3. **Cart Management**: Add products to cart with real-time updates and promotion applications
4. **Checkout Process**: Secure checkout with shipping calculation and payment processing
5. **Order Fulfillment**: Order processing, shipping, and tracking
6. **Post-Purchase**: Reviews, support, and repeat purchase facilitation

### Administrative Workflow
1. **Product Management**: Add, update, and manage product catalog
2. **Order Processing**: Monitor and fulfill customer orders
3. **User Management**: Handle user accounts, roles, and permissions
4. **Promotion Management**: Create and manage marketing campaigns
5. **Analytics**: Track sales, user behavior, and system performance

## API Design

The API follows RESTful principles with clear resource-based URLs and appropriate HTTP methods. All endpoints return consistent JSON responses with proper HTTP status codes. The system includes comprehensive error handling with detailed error messages for debugging and user feedback.

### Response Format
All API responses follow a consistent structure with success/error indicators, data payloads, and metadata where applicable.

### Data Validation
Input validation is enforced at all endpoints using DTOs (Data Transfer Objects) with comprehensive validation rules to ensure data integrity and security.

## Deployment Considerations

The system is designed for easy deployment across different environments (development, staging, production) with environment-specific configurations. It supports both traditional server deployment and containerized deployment using Docker.

### Environment Configuration
All sensitive data and environment-specific settings are managed through environment variables, ensuring security and flexibility across different deployment scenarios.

### Database Management
The system includes database migration capabilities and seed data management for consistent deployment across environments.