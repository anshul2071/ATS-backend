
export const emailConfig = {
    host: process.env.EMAIL_HOST || 'smtp.example.com',
    port: parseInt(process.env.EMAIL_PORT || '587', 10),
    secure: process.env.EMAIL_SECURE === 'true', 
    pass: process.env.EMAIL_PASS || '',
    fromName: process.env.EMAIL_FROM_NAME || 'ACME HR',
    fromAddress: process.env.EMAIL_FROM_ADDRESS || 'hr@acme.com',
  };
  