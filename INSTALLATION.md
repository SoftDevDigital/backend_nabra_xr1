# Installation and Setup Guide

## Prerequisites

Before installing the Nabra XR backend, ensure you have the following software installed on your system:

- **Node.js**: Version 18.0 or higher
- **npm**: Version 8.0 or higher (comes with Node.js)
- **MongoDB**: Version 5.0 or higher (local installation or MongoDB Atlas)
- **Git**: For cloning the repository

## Installation Steps

### 1. Clone the Repository

```bash
git clone <repository-url>
cd backend_nabra_xr1
```

### 2. Install Dependencies

```bash
npm install
```

This will install all required packages including:
- NestJS framework and core modules
- MongoDB and Mongoose ODM
- Authentication libraries (Passport, JWT)
- Payment processing libraries (PayPal)
- Validation and security packages
- Development tools and TypeScript

### 3. Environment Configuration

Create a `.env` file in the project root directory and configure the following variables:

```bash
# General Configuration
NODE_ENV=development
PORT=3001
APP_BASE_URL=http://localhost:3001

# Database
MONGODB_URI=mongodb://localhost:27017/nabra_xr1
MONGO_URI=mongodb://localhost:27017/nabra_xr1

# Authentication
JWT_SECRET=your-super-secret-jwt-key-minimum-32-characters
JWT_EXPIRES_IN=7d
SESSION_SECRET=your-session-secret-key-minimum-32-characters

# Google OAuth2
GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-google-client-secret
GOOGLE_CALLBACK_URL=http://localhost:3001/auth/google/callback
GOOGLE_SUCCESS_REDIRECT=http://localhost:3000/
GOOGLE_FAILURE_REDIRECT=http://localhost:3000/login?error=auth_failed
ALLOWED_EMAIL_DOMAINS=gmail.com,outlook.com,yahoo.com,hotmail.com

# PayPal (Sandbox)
PAYPAL_CLIENT_ID=ASLRgRIUQBs1Z8q7eJgWEhAUGq7rbFOjy4Mh19cBMkO3IROJ2hEKwwwMNF2whP5A56W4nBUe3-pRe85w
PAYPAL_CLIENT_SECRET=EJKFA2Q0ge6sDZNjzRpvKOZdZdGHLnsc8GjFkLGQbxY-DxJAyQYMtqOlkGxl9Xt3wUVOU5NWe_LXmkbv
PAYPAL_MODE=sandbox
PAYPAL_WEBHOOK_SECRET=your-paypal-webhook-secret

# DrEnvío Shipping
DRENVIO_API_URL=https://api.drenvio.com.ar/v1
DRENVIO_API_KEY=your_drenvio_api_key
DRENVIO_SECRET_KEY=your_drenvio_secret_key
DRENVIO_ENVIRONMENT=sandbox
COMPANY_CUIT=your_company_cuit
DRENVIO_WEBHOOK_SECRET=your_drenvio_webhook_secret

# CORS Configuration
CORS_ORIGIN=http://localhost:3000,http://localhost:3001
CORS_CREDENTIALS=true
CORS_METHODS=GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS
CORS_ALLOWED_HEADERS=Content-Type,Authorization,Accept,Origin,X-Requested-With

# Development
DEBUG_MODE=true
LOG_LEVEL=debug
```

### 4. Database Setup

#### Local MongoDB Installation
1. Install MongoDB Community Edition from the official website
2. Start the MongoDB service
3. The application will automatically connect using the MONGODB_URI

#### MongoDB Atlas (Cloud)
1. Create a MongoDB Atlas account
2. Create a new cluster
3. Get the connection string
4. Replace the MONGODB_URI in your .env file

### 5. External Service Configuration

#### Google OAuth2 Setup
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing
3. Enable Google+ API
4. Configure OAuth consent screen
5. Create OAuth 2.0 credentials
6. Add authorized redirect URIs: `http://localhost:3001/auth/google/callback`
7. Copy Client ID and Client Secret to your .env file

#### PayPal Configuration
The PayPal sandbox credentials are pre-configured for development. For production:
1. Create a PayPal Developer account
2. Create a new application
3. Get production Client ID and Client Secret
4. Update PAYPAL_MODE to "production"

#### DrEnvío Configuration
1. Contact DrEnvío to obtain API credentials
2. Get API Key and Secret Key
3. Obtain your company CUIT
4. Update the credentials in your .env file

## Running the Application

### Development Mode

```bash
npm run start:dev
```

This command starts the application in development mode with:
- Hot reload enabled
- Debug logging
- Automatic restart on file changes
- Port 3001 (configurable via PORT env variable)

### Production Mode

```bash
# Build the application
npm run build

# Start in production mode
npm run start:prod
```

### Watch Mode

```bash
npm run start:watch
```

## Verification

### 1. Check Server Status
After starting the server, you should see:
```
[Nest] Server running on port 3001
MongoDB connected successfully
```

### 2. Test Basic Endpoints
- Health check: `GET http://localhost:3001/`
- API documentation: `GET http://localhost:3001/api` (if Swagger is enabled)

### 3. Test Database Connection
The application will log database connection status on startup.

## Development Tools

### Code Linting
```bash
npm run lint
```

### Code Formatting
```bash
npm run format
```

### Testing
```bash
# Unit tests
npm run test

# E2E tests
npm run test:e2e

# Test coverage
npm run test:cov
```

### Build
```bash
npm run build
```

## Troubleshooting

### Common Issues

#### Port Already in Use
```bash
# Kill process using port 3001
npx kill-port 3001

# Or change PORT in .env file
PORT=3003
```

#### MongoDB Connection Issues
- Ensure MongoDB is running
- Check MONGODB_URI format
- Verify database permissions
- For Atlas: check network access settings

#### Environment Variables Not Loading
- Ensure .env file is in project root
- Check for typos in variable names
- Restart the application after changes

#### Google OAuth Issues
- Verify redirect URIs match exactly
- Check Client ID and Secret format
- Ensure OAuth consent screen is configured

### Logs and Debugging

The application provides detailed logging. Check console output for:
- Database connection status
- Authentication errors
- API request/response logs
- External service integration status

### Performance Considerations

For development:
- Use local MongoDB for faster queries
- Enable debug logging for troubleshooting
- Use hot reload for faster development

For production:
- Use MongoDB Atlas or optimized MongoDB setup
- Set LOG_LEVEL to "info" or "error"
- Enable production optimizations

## Next Steps

After successful installation:
1. Review the API documentation in `API_REFERENCE.md`
2. Test the endpoints using Postman or similar tools
3. Integrate with your frontend application
4. Configure production environment variables
5. Set up monitoring and logging for production deployment

## Zoho Mail (SMTP)

Configura las siguientes variables de entorno para enviar correos vía Zoho (SMTP):

```
ZOHO_SMTP_HOST=smtp.zoho.com
ZOHO_SMTP_PORT=587
ZOHO_SMTP_SECURE=false
ZOHO_SMTP_USER=tu-correo@tudominio.com
ZOHO_SMTP_PASS=tu-password-o-app-password
ZOHO_FROM="Nabra <tu-correo@tudominio.com>"
```

Notas:
- Si usas 465 entonces `ZOHO_SMTP_SECURE=true`.
- Recomendado usar App Password de Zoho.
- El `from` cae por defecto en `ZOHO_SMTP_USER` si no se define.