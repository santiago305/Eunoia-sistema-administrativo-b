import 'dotenv/config'
import * as joi from 'joi';
import { StringValue } from 'ms';


interface EnvVars {
    PORT: number;
    NODE_ENV?: 'development' | 'production' | 'test';
    TRUST_PROXY?: boolean;
    CORS_ORIGINS?: string;
    DB_HOST: string;
    DB_PORT: number;
    DB_USERNAME: string;
    DB_PASSWORD: string;
    DB_NAME: string;
    COOKIE_DOMAIN?: string;
    COOKIE_SECRET: string;
    JWT_SECRET: string;
    JWT_EXPIRES_IN: StringValue;
    JWT_ISSUER: StringValue;
    JWT_REFRESH_EXPIRES_IN: StringValue;
    REDIS_HOST: string;
    REDIS_PORT: number;
    REDIS_PASSWORD?: string;
    REDIS_DB?: number;
    REDIS_TTL_MS?: number;
    SALE_ORDER_AUTOMATIC_WORKFLOW_INTERVAL_MS?: number;
    SALE_ORDER_AUTOMATIC_WORKFLOW_RUN_ON_START?: boolean;
    FILES_STORAGE_ROOT?: string;
    FILES_PUBLIC_DIR?: string;
    FILES_PRIVATE_DIR?: string;
    FILES_DELETED_DIR?: string;
    MAIL_DEFAULT_USER_STORAGE_GB?: number;
    MAIL_ATTACHMENTS_DIR?: string;
    MAIL_ATTACHMENTS_DELETED_DIR?: string;
    MAIL_STORAGE_ACTIVE_DIR?: string;
    MAIL_STORAGE_DELETED_DIR?: string;
    MAIL_DELETED_DB_HOST?: string;
    MAIL_DELETED_DB_PORT?: number;
    MAIL_DELETED_DB_USERNAME?: string;
    MAIL_DELETED_DB_PASSWORD?: string;
    MAIL_DELETED_DB_NAME?: string;
    MAIL_DELETED_RETENTION_DAYS?: number;
    MAIL_DISABLED_USER_RETENTION_DAYS?: number;

    IDENTITY_API_KEY?: string;
    IDENTITY_BASE_URL?: string;
    IDENTITY_TIMEOUT_MS?: number;
    APP_COMPANY_NAME?: string;
    MASTER_ADMIN_INITIAL_PASSWORD?: string;
    }

const envsSchema = joi.object({
    PORT: joi.number().required(),
    NODE_ENV: joi.string().valid('development', 'production', 'test').optional(),
    TRUST_PROXY: joi.boolean().optional(),
    CORS_ORIGINS: joi.string().optional(),
    DB_HOST: joi.string().required(),
    DB_PORT: joi.number().required(),
    DB_USERNAME: joi.string().required(),
    DB_PASSWORD: joi.string().allow('').required(), 
    DB_NAME: joi.string().required(),
    COOKIE_DOMAIN: joi.string().allow('').optional(),
    COOKIE_SECRET: joi.string().min(32).required(),
    JWT_SECRET: joi.string().min(32).required(),
    JWT_EXPIRES_IN: joi.string().required(),
    JWT_ISSUER: joi.string().required(),
    JWT_REFRESH_EXPIRES_IN: joi.string().required(),
    REDIS_HOST: joi.string().required(),
    REDIS_PORT: joi.number().required(),
    REDIS_PASSWORD: joi.string().allow('').optional(),
    REDIS_DB: joi.number().optional(),
    REDIS_TTL_MS: joi.number().optional(),
    SALE_ORDER_AUTOMATIC_WORKFLOW_INTERVAL_MS: joi.number().min(10_000).optional(),
    SALE_ORDER_AUTOMATIC_WORKFLOW_RUN_ON_START: joi.boolean().optional(),
    FILES_STORAGE_ROOT: joi.string().optional(),
    FILES_PUBLIC_DIR: joi.string().optional(),
    FILES_PRIVATE_DIR: joi.string().optional(),
    FILES_DELETED_DIR: joi.string().optional(),
    MAIL_DEFAULT_USER_STORAGE_GB: joi.number().min(1).max(5).optional(),
    MAIL_ATTACHMENTS_DIR: joi.string().optional(),
    MAIL_ATTACHMENTS_DELETED_DIR: joi.string().optional(),
    MAIL_STORAGE_ACTIVE_DIR: joi.string().optional(),
    MAIL_STORAGE_DELETED_DIR: joi.string().optional(),
    MAIL_DELETED_DB_HOST: joi.string().optional(),
    MAIL_DELETED_DB_PORT: joi.number().optional(),
    MAIL_DELETED_DB_USERNAME: joi.string().optional(),
    MAIL_DELETED_DB_PASSWORD: joi.string().allow('').optional(),
    MAIL_DELETED_DB_NAME: joi.string().optional(),
    MAIL_DELETED_RETENTION_DAYS: joi.number().min(1).max(3650).optional(),
    MAIL_DISABLED_USER_RETENTION_DAYS: joi.number().min(1).max(3650).optional(),
    IDENTITY_BASE_URL: joi.string().optional(),
    IDENTITY_API_KEY: joi.string().optional(),
    IDENTITY_TIMEOUT_MS: joi.number().optional(),
    APP_COMPANY_NAME: joi.string().optional(),
    MASTER_ADMIN_INITIAL_PASSWORD: joi.string().min(12).optional(),
})
.unknown(true)

const { error, value } = envsSchema.validate({
    ...process.env,
});

if (error) {
    throw new Error(`Config validation error: ${error.message}`);
}

const envsVars:EnvVars = value

const productionSecrets = [
    { name: 'DB_PASSWORD', value: envsVars.DB_PASSWORD, minLength: 16 },
    { name: 'REDIS_PASSWORD', value: envsVars.REDIS_PASSWORD, minLength: 16 },
    { name: 'COOKIE_SECRET', value: envsVars.COOKIE_SECRET, minLength: 32 },
    { name: 'JWT_SECRET', value: envsVars.JWT_SECRET, minLength: 32 },
    {
        name: 'MASTER_ADMIN_INITIAL_PASSWORD',
        value: envsVars.MASTER_ADMIN_INITIAL_PASSWORD,
        minLength: 12,
    },
];
const insecureSecretMarker =
  /(change[-_ ]?(me|before)|placeholder|example|eunoia[-_ ]?local|development|dev[-_ ]?secret|your[-_ ]|replace[-_ ])/i;
const commonWeakSecrets = new Set([
    'admin',
    'changeme',
    'password',
    'password123',
    'postgres',
    'redis',
    'secret',
]);

if (envsVars.NODE_ENV === 'production') {
    const invalidSecrets = productionSecrets
      .filter(({ value, minLength }) => {
          const normalizedValue = value?.trim() ?? '';

          return (
            normalizedValue.length < minLength ||
            insecureSecretMarker.test(normalizedValue) ||
            commonWeakSecrets.has(normalizedValue.toLowerCase())
          );
      })
      .map(({ name, minLength }) => `${name} (mínimo ${minLength} caracteres)`);

    if (invalidSecrets.length > 0) {
        throw new Error(
          `Config validation error: secretos de producción ausentes, débiles o de ejemplo: ${invalidSecrets.join(', ')}`,
        );
    }
}

const filesRootDir = envsVars.FILES_STORAGE_ROOT ?? 'storage';
const filesPublicDir = envsVars.FILES_PUBLIC_DIR ?? `${filesRootDir}/public`;
const filesPrivateDir = envsVars.FILES_PRIVATE_DIR ?? `${filesRootDir}/private`;
const filesDeletedDir = envsVars.FILES_DELETED_DIR ?? `${filesRootDir}/deleted`;
const corsOrigins = (envsVars.CORS_ORIGINS ?? 'http://localhost:5173,http://127.0.0.1:5173')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

export const envs = {
    port: envsVars.PORT,
    nodeEnv: envsVars.NODE_ENV ?? 'development',
    trustProxy: envsVars.TRUST_PROXY ?? false,
    corsOrigins,
    cookieDomain: envsVars.COOKIE_DOMAIN?.trim() || undefined,
    cookieSecret: envsVars.COOKIE_SECRET,
    jwt: {
        secret: envsVars.JWT_SECRET,
        expiresIn: envsVars.JWT_EXPIRES_IN,
        issuer: envsVars.JWT_ISSUER,
        refreshExpiresIn: envsVars.JWT_REFRESH_EXPIRES_IN,
    },
    identity: {
        baseUrl: envsVars.IDENTITY_BASE_URL,
        apiKey: envsVars.IDENTITY_API_KEY,
        timeoutMs: envsVars.IDENTITY_TIMEOUT_MS,
    },
    appCompanyName: envsVars.APP_COMPANY_NAME,
    masterAdminInitialPassword: envsVars.MASTER_ADMIN_INITIAL_PASSWORD,
    db: {
        host: envsVars.DB_HOST,
        port: envsVars.DB_PORT,
        username: envsVars.DB_USERNAME,
        password: envsVars.DB_PASSWORD,
        name: envsVars.DB_NAME,
    },
    redis: {
        host: envsVars.REDIS_HOST,
        port: envsVars.REDIS_PORT,
        password: envsVars.REDIS_PASSWORD,
        db: envsVars.REDIS_DB ?? 0,
        ttlMs: envsVars.REDIS_TTL_MS ?? 60_000,
    },
    saleOrderJobs: {
        automaticWorkflowIntervalMs: envsVars.SALE_ORDER_AUTOMATIC_WORKFLOW_INTERVAL_MS ?? 60_000,
        automaticWorkflowRunOnStart: envsVars.SALE_ORDER_AUTOMATIC_WORKFLOW_RUN_ON_START ?? true,
    },
    files: {
        rootDir: filesRootDir,
        publicDir: filesPublicDir,
        privateDir: filesPrivateDir,
        deletedDir: filesDeletedDir,
    },
    mail: {
        defaultUserStorageGb: envsVars.MAIL_DEFAULT_USER_STORAGE_GB ?? 1,
        attachmentsDir:
          envsVars.MAIL_STORAGE_ACTIVE_DIR ??
          envsVars.MAIL_ATTACHMENTS_DIR ??
          `${filesPrivateDir}/mail-attachments`,
        attachmentsDeletedDir:
          envsVars.MAIL_STORAGE_DELETED_DIR ??
          envsVars.MAIL_ATTACHMENTS_DELETED_DIR ??
          `${filesDeletedDir}/mail-attachments`,
        deletedDb: {
          host: envsVars.MAIL_DELETED_DB_HOST,
          port: envsVars.MAIL_DELETED_DB_PORT,
          username: envsVars.MAIL_DELETED_DB_USERNAME,
          password: envsVars.MAIL_DELETED_DB_PASSWORD,
          name: envsVars.MAIL_DELETED_DB_NAME,
          enabled: Boolean(
            envsVars.MAIL_DELETED_DB_HOST &&
            envsVars.MAIL_DELETED_DB_PORT &&
            envsVars.MAIL_DELETED_DB_USERNAME &&
            envsVars.MAIL_DELETED_DB_NAME,
          ),
        },
        deletedRetentionDays: envsVars.MAIL_DELETED_RETENTION_DAYS ?? 15,
        disabledUserRetentionDays: envsVars.MAIL_DISABLED_USER_RETENTION_DAYS ?? 30,
    },
}
