import { registerAs } from '@nestjs/config';

export default registerAs('zoho', () => ({
  host: process.env.ZOHO_SMTP_HOST || 'smtp.zoho.com',
  port: parseInt(process.env.ZOHO_SMTP_PORT || '587', 10),
  secure: process.env.ZOHO_SMTP_SECURE === 'true',
  user: process.env.ZOHO_SMTP_USER || 'contact@nabra.mx',
  pass: process.env.ZOHO_SMTP_PASS,
  from: process.env.ZOHO_FROM || 'Nabra <contact@nabra.mx>',
}));


