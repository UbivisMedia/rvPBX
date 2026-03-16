import dotenv from 'dotenv';
import Joi from 'joi';
import path from 'node:path';

dotenv.config();

function parseBoolean(value, defaultValue = false) {
  if (value === undefined || value === null || value === '') {
    return defaultValue;
  }

  return ['1', 'true', 'yes', 'on'].includes(String(value).toLowerCase());
}

const schema = Joi.object({
  NODE_ENV: Joi.string().valid('development', 'test', 'production').default('development'),
  PORT: Joi.number().port().default(3001),
  CORS_ORIGIN: Joi.string().default('http://localhost:5173'),
  JWT_SECRET: Joi.string().min(24).when('NODE_ENV', {
    is: 'production',
    then: Joi.required(),
    otherwise: Joi.default('dev-only-jwt-secret-not-for-production-use!')
  }),
  JWT_REFRESH_SECRET: Joi.string().min(24).when('NODE_ENV', {
    is: 'production',
    then: Joi.required(),
    otherwise: Joi.default('dev-only-refresh-secret-not-for-production-use!')
  }),
  JWT_ACCESS_TTL: Joi.string().default('15m'),
  JWT_REFRESH_TTL_DAYS: Joi.number().integer().min(1).default(7),
  ADMIN_USERNAME: Joi.string().default('admin'),
  ADMIN_PASSWORD: Joi.string().min(6).default('admin123'),
  ASTERISK_ENABLED: Joi.boolean().truthy('true').truthy('1').default(false),
  ASTERISK_HOST: Joi.string().default('127.0.0.1'),
  ASTERISK_AMI_PORT: Joi.number().port().default(5038),
  ASTERISK_AMI_USER: Joi.string().default('asterisk-admin'),
  ASTERISK_AMI_PASS: Joi.string().allow('').default(''),
  ASTERISK_ARI_URL: Joi.string().uri().default('http://127.0.0.1:8088'),
  ASTERISK_ARI_USER: Joi.string().default('asterisk-admin-ari'),
  ASTERISK_ARI_PASS: Joi.string().allow('').default(''),
  DATA_DIR: Joi.string().default('./runtime/data'),
  LOG_DIR: Joi.string().default('./runtime/logs'),
  ASTERISK_CONFIG_PATH: Joi.string().default('./runtime/asterisk'),
  ASTERISK_FULL_LOG_FILE: Joi.string().default('./runtime/logs/asterisk-full.log'),
  PJSIP_MANAGED_FILE: Joi.string().default('pjsip_admin_generated.conf'),
  DIALPLAN_MANAGED_FILE: Joi.string().default('extensions_admin_generated.conf'),
  BACKUP_PATH: Joi.string().default('./runtime/backups'),
  PM2_PROCESS_NAME: Joi.string().default('asterisk-admin-api'),
  PROVISIONING_BASE_URL: Joi.string().uri().default('http://localhost:3001/provisioning')
})
  .unknown(true)
  .required();

const { value, error } = schema.validate(process.env, {
  abortEarly: false,
  convert: true
});

if (error) {
  throw new Error(`Invalid environment configuration: ${error.message}`);
}

const rootDir = process.cwd();

export const config = {
  env: value.NODE_ENV,
  port: value.PORT,
  corsOrigins: value.CORS_ORIGIN.split(',').map((entry) => entry.trim()),
  jwt: {
    secret: value.JWT_SECRET,
    refreshSecret: value.JWT_REFRESH_SECRET,
    accessTtl: value.JWT_ACCESS_TTL,
    refreshTtlDays: value.JWT_REFRESH_TTL_DAYS
  },
  admin: {
    username: value.ADMIN_USERNAME,
    password: value.ADMIN_PASSWORD
  },
  asterisk: {
    enabled: parseBoolean(value.ASTERISK_ENABLED, false),
    host: value.ASTERISK_HOST,
    amiPort: value.ASTERISK_AMI_PORT,
    amiUser: value.ASTERISK_AMI_USER,
    amiPass: value.ASTERISK_AMI_PASS,
    ariUrl: value.ASTERISK_ARI_URL,
    ariUser: value.ASTERISK_ARI_USER,
    ariPass: value.ASTERISK_ARI_PASS,
    configPath: path.resolve(rootDir, value.ASTERISK_CONFIG_PATH),
    fullLogFile: path.resolve(rootDir, value.ASTERISK_FULL_LOG_FILE),
    pjsipManagedFile: value.PJSIP_MANAGED_FILE,
    dialplanManagedFile: value.DIALPLAN_MANAGED_FILE
  },
  pm2ProcessName: value.PM2_PROCESS_NAME,
  provisioningBaseUrl: value.PROVISIONING_BASE_URL,
  paths: {
    dataDir: path.resolve(rootDir, value.DATA_DIR),
    logDir: path.resolve(rootDir, value.LOG_DIR),
    backupDir: path.resolve(rootDir, value.BACKUP_PATH)
  }
};
