import 'dotenv/config'
import * as joi from 'joi';
import { StringValue } from 'ms';


interface EnvVars {
    PORT: number;
    NODE_ENV?: 'development' | 'production' | 'test';
    TRUST_PROXY?: boolean;
    DB_HOST: string;
    DB_PORT: number;
    DB_USERNAME: string;
    DB_PASSWORD: string;
    DB_NAME: string;
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

    IDENTITY_API_KEY?: string;
    IDENTITY_BASE_URL?: string;
    IDENTITY_TIMEOUT_MS?: number;
    }

const envsSchema = joi.object({
    PORT: joi.number().required(),
    NODE_ENV: joi.string().valid('development', 'production', 'test').optional(),
    TRUST_PROXY: joi.boolean().optional(),
    DB_HOST: joi.string().required(),
    DB_PORT: joi.number().required(),
    DB_USERNAME: joi.string().required(),
    DB_PASSWORD: joi.string().allow('').required(), 
    DB_NAME: joi.string().required(),
    COOKIE_SECRET: joi.string().required(),
    JWT_SECRET: joi.string().required(),
    JWT_EXPIRES_IN: joi.string().required(),
    JWT_ISSUER: joi.string().required(),
    JWT_REFRESH_EXPIRES_IN: joi.string().required(),
    REDIS_HOST: joi.string().required(),
    REDIS_PORT: joi.number().required(),
    REDIS_PASSWORD: joi.string().allow('').optional(),
    REDIS_DB: joi.number().optional(),
    REDIS_TTL_MS: joi.number().optional(),
    IDENTITY_BASE_URL: joi.string().optional(),
    IDENTITY_API_KEY: joi.string().optional(),
    IDENTITY_TIMEOUT_MS: joi.number().optional(),
})
.unknown(true)

const { error, value } = envsSchema.validate({
    ...process.env,
});

if (error) {
    throw new Error(`Config validation error: ${error.message}`);
}

const envsVars:EnvVars = value

export const envs = {
    port: envsVars.PORT,
    nodeEnv: envsVars.NODE_ENV ?? 'development',
    trustProxy: envsVars.TRUST_PROXY ?? false,
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
}
