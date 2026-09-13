// Valores mínimos para que los tests unitarios que importan la configuración
// no dependan de variables externas del entorno del desarrollador.
process.env.NODE_ENV ??= "test";
process.env.PORT ??= "3000";
process.env.DB_HOST ??= "localhost";
process.env.DB_PORT ??= "5432";
process.env.DB_USERNAME ??= "postgres";
process.env.DB_PASSWORD ??= "test-password";
process.env.DB_NAME ??= "EunoiaDB";
process.env.REDIS_HOST ??= "localhost";
process.env.REDIS_PORT ??= "6379";
process.env.REDIS_PASSWORD ??= "test-redis-password";
process.env.COOKIE_SECRET ??= "test-cookie-secret-012345678901234567890";
process.env.JWT_SECRET ??= "test-jwt-secret-012345678901234567890123";
process.env.JWT_EXPIRES_IN ??= "3600s";
process.env.JWT_ISSUER ??= "eunoia-test";
process.env.JWT_REFRESH_EXPIRES_IN ??= "7d";
