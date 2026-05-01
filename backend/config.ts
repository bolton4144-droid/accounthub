import dotenv from 'dotenv';

dotenv.config();

export const config = {
  // Server
  nodeEnv: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '3000', 10),
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:5173',

  // Database
  database: {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    name: process.env.DB_NAME || 'accounting_system',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
  },

  // JWT
  jwt: {
    secret: process.env.JWT_SECRET || 'your-secret-key-change-this',
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  },

  // HMRC API
  hmrc: {
    baseUrl: process.env.HMRC_BASE_URL || 'https://api.service.hmrc.gov.uk',
    testUrl: 'https://test-api.service.hmrc.gov.uk',
    clientId: process.env.HMRC_CLIENT_ID || '',
    clientSecret: process.env.HMRC_CLIENT_SECRET || '',
    serverToken: process.env.HMRC_SERVER_TOKEN || '',
    vatReturnUrl: '/organisations/vat/{vrn}/returns',
    payeUrl: '/organisations/paye/{empRef}/submissions',
    corporationTaxUrl: '/organisations/corporation-tax/{utr}/returns',
  },

  // OAuth
  oauth: {
    redirectUri: process.env.OAUTH_REDIRECT_URI || 'http://localhost:3000/api/hmrc/callback',
    scopes: [
      'read:vat',
      'write:vat',
      'read:paye',
      'write:paye',
      'read:corporation-tax',
      'write:corporation-tax',
    ].join(' '),
  },

  // Email (for notifications)
  email: {
    from: process.env.EMAIL_FROM || 'noreply@accountingsystem.com',
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT || '587', 10),
    user: process.env.SMTP_USER || '',
    password: process.env.SMTP_PASSWORD || '',
  },

  // Storage
  storage: {
    type: process.env.STORAGE_TYPE || 'local', // 'local' or 's3'
    path: process.env.STORAGE_PATH || './uploads',
    s3: {
      bucket: process.env.S3_BUCKET || '',
      region: process.env.S3_REGION || 'eu-west-2',
      accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
    },
  },
};
