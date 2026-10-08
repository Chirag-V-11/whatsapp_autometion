import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const isProd = process.env.NODE_ENV === 'production';
const secretKey = process.env.SECRET_KEY || (isProd ? null : 'wa_auto_sec_key_fallback_dev_998877665544');

if (!secretKey) {
  throw new Error('FATAL SECURITY ERROR: SECRET_KEY environment variable is missing in production mode.');
}

export const CONFIG = {
  NODE_ENV: process.env.NODE_ENV || 'development',
  IS_PROD: isProd,
  PORT: process.env.PORT || 5000,
  CLIENT_ORIGIN: process.env.CLIENT_ORIGIN || 'http://localhost:3000',
  SESSION_DIR: path.join(__dirname, '../.wa_session'),
  DB_PATH: path.join(__dirname, '../data/whatsapp_automation.db'),
  JSON_DB_PATH: path.join(__dirname, '../data/db.json'),
  
  // Anti-Ban & Security Defaults
  DEFAULT_MIN_DELAY_MS: 3000, // 3 seconds minimum between messages
  DEFAULT_MAX_DELAY_MS: 7000, // 7 seconds maximum between messages
  DEFAULT_MAX_DAILY_MESSAGES: 500,
  DEFAULT_COUNTRY_CODE: process.env.DEFAULT_COUNTRY_CODE || '91', // Default India 91 for 10-digit numbers
  SPINTAX_ENABLED: true,
  
  SECRET_KEY: secretKey
};

