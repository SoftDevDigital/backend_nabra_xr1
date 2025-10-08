# PowerShell script to help set up environment variables for Nabra Backend
# Run this script in PowerShell as Administrator if needed

Write-Host "Setting up environment variables for Nabra Backend..." -ForegroundColor Green

# Check if .env file exists
if (Test-Path ".env") {
    Write-Host ".env file already exists. Backing up to .env.backup" -ForegroundColor Yellow
    Copy-Item ".env" ".env.backup"
}

# Create .env file with default values
$envContent = @"
# Database Configuration
MONGODB_URI=mongodb://localhost:27017/nabra

# JWT Configuration
JWT_SECRET=your-jwt-secret-key-here
JWT_EXPIRES_IN=7d

# Google OAuth Configuration
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
GOOGLE_CALLBACK_URL=http://localhost:3000/auth/google/callback

# Zoho SMTP Configuration (Required for email functionality)
ZOHO_SMTP_HOST=smtp.zoho.com
ZOHO_SMTP_PORT=587
ZOHO_SMTP_SECURE=false
ZOHO_SMTP_USER=contact@nabra.mx
ZOHO_SMTP_PASS=your-zoho-app-password-here
ZOHO_FROM=Nabra <contact@nabra.mx>

# PayPal Configuration
PAYPAL_CLIENT_ID=your-paypal-client-id
PAYPAL_CLIENT_SECRET=your-paypal-client-secret
PAYPAL_MODE=sandbox

# Drenvio Configuration
DRENVIO_API_URL=https://api.drenvio.com
DRENVIO_API_KEY=your-drenvio-api-key

# Server Configuration
PORT=3000
NODE_ENV=development
"@

$envContent | Out-File -FilePath ".env" -Encoding UTF8

Write-Host ".env file created successfully!" -ForegroundColor Green
Write-Host ""
Write-Host "IMPORTANT: You need to update the following values in the .env file:" -ForegroundColor Red
Write-Host "1. ZOHO_SMTP_PASS - Get this from your Zoho Mail account (App Password)" -ForegroundColor Yellow
Write-Host "2. JWT_SECRET - Generate a secure random string" -ForegroundColor Yellow
Write-Host "3. MONGODB_URI - Update if using a different MongoDB connection" -ForegroundColor Yellow
Write-Host "4. Other API keys as needed" -ForegroundColor Yellow
Write-Host ""
Write-Host "To get Zoho App Password:" -ForegroundColor Cyan
Write-Host "1. Go to https://mail.zoho.com" -ForegroundColor White
Write-Host "2. Go to Settings > Security > App Passwords" -ForegroundColor White
Write-Host "3. Generate a new app password for 'Nabra Backend'" -ForegroundColor White
Write-Host "4. Copy the generated password to ZOHO_SMTP_PASS in .env" -ForegroundColor White
Write-Host ""
Write-Host "After updating .env, restart your application." -ForegroundColor Green

