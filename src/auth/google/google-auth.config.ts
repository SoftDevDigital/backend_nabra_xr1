import * as dotenv from 'dotenv';
dotenv.config();

export const googleAuthConfig = {
  // Configuración de Google OAuth2
  clientId: process.env.GOOGLE_CLIENT_ID || '',
  clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
  
  // URLs de callback
  callbackUrl: `https://api.nabra.mx/auth/google/callback`,
  
  // Scope de permisos solicitados
  scope: ['profile', 'email'],
  
  // Configuración de sesión
  sessionSecret: process.env.SESSION_SECRET || '',
  
  // Configuración de JWT para usuarios de Google
  jwtSecret: process.env.JWT_SECRET || '',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  
  // Configuración de redirección después del login
  successRedirect: process.env.GOOGLE_SUCCESS_REDIRECT || 'https://api.nabra.mx/',
  failureRedirect: process.env.GOOGLE_FAILURE_REDIRECT || 'https://api.nabra.mx/login?error=auth_failed',
  
  // Configuración de seguridad
  security: {
    // Tiempo de vida de la sesión (en segundos)
    sessionMaxAge: 7 * 24 * 60 * 60, // 7 días
    
    // Configuración de cookies seguras
    cookieSecure: process.env.NODE_ENV === 'production',
    cookieHttpOnly: true,
    cookieSameSite: 'lax' as const,
    
    // Configuración de CORS
    allowedOrigins: process.env.NODE_ENV === 'production' 
      ? ['https://yourdomain.com'] 
      : ['http://localhost:3000', 'http://localhost:3001'],
  },
  
  // Configuración de validación
  validation: {
    // Dominios de email permitidos (opcional)
    allowedEmailDomains: process.env.ALLOWED_EMAIL_DOMAINS?.split(',') || [],
    
    // Requerir email verificado
    requireVerifiedEmail: true,
    
    // Permitir solo ciertos dominios organizacionales
    allowOnlyOrganizationalEmails: false,
  },
  
  // Configuración de logging
  logging: {
    logAuthAttempts: true,
    logAuthFailures: true,
    logAuthSuccesses: true,
  },
};
