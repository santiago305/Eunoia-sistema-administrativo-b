import 'dotenv/config'
import * as joi from 'joi';

interface EnvVars {
    PORT: number;
    DB_HOST: string;
    DB_PORT: number;
    DB_USERNAME: string;
    DB_PASSWORD: string;
    DB_NAME: string;
    COOKIE_SECRET: string;
    JWT_SECRET: string;
    JWT_EXPIRES_IN: string;
    JWT_ISSUER: string;
    JWT_REFRESH_EXPIRES_IN: string;
    }

const envsSchema = joi.object({
    PORT: joi.number().required(),
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
    cookieSecret: envsVars.COOKIE_SECRET,
    jwt: {
        secret: envsVars.JWT_SECRET,
        expiresIn: envsVars.JWT_EXPIRES_IN,
        issuer: envsVars.JWT_ISSUER,
        refreshExpiresIn: envsVars.JWT_REFRESH_EXPIRES_IN,
    },
    db: {
        host: envsVars.DB_HOST,
        port: envsVars.DB_PORT,
        username: envsVars.DB_USERNAME,
        password: envsVars.DB_PASSWORD,
        name: envsVars.DB_NAME,
    },
}