import { MiddlewareConsumer, 
  Module, 
  RequestMethod 
} from '@nestjs/common';
import { AuthModule } from './modules/auth/infrastructure/auth.module';
import { RolesModule } from './modules/roles/infrastructure/roles.module';
import { UsersModule } from './modules/users/infrastructure/users.module';
import { SessionsModule } from './modules/sessions/infrastructure/sessions.module';
import { InventoryModule } from './modules/inventory/infrastructure/inventory.module';
import { CatalogModule } from './modules/catalog/infrastructure/catalog.module';
import { AppConfigModule } from './infrastructure/config/config.module';
import { CommonModule } from './shared/common.module';
import { DatabaseModule } from './infrastructure/database/database.module';
import { getStorageToken, ThrottlerModule } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { WarehousesModule } from './modules/warehouses/warehouses.module';
import { ProductionModule } from './modules/production/infrastructure/production.module';
import { SuppliersModule } from './modules/suppliers/suppliers.module';
import { IdentityModule } from './modules/identity/identity.module';
import { PaymentsModule } from './modules/payments/payments.module';
import { PurchasesModule } from './modules/purchases/infrastructure/purchases.module';
import { CacheModule } from '@nestjs/cache-manager';
import { createKeyv } from '@keyv/redis';
import { envs } from './infrastructure/config/envs';
import { SecurityModule } from './modules/security/infrastructure/security.module';
import { SecurityThrottlerGuard } from './modules/security/adapters/in/guards/security-throttler.guard';
import { IpBanGuard } from './modules/security/adapters/in/guards/ip-ban.guard';
import { RedisThrottlerStorage } from './modules/security/infrastructure/providers/redis-throttler.storage';
import { CompaniesModule } from './modules/companies/companies.module';

const redisAuth = envs.redis.password ? `:${encodeURIComponent(envs.redis.password)}@` : '';
const redisUrl = `redis://${redisAuth}${envs.redis.host}:${envs.redis.port}/${envs.redis.db}`;


@Module({
  imports: [
    CacheModule.register({
      isGlobal: true,
      stores: [createKeyv(redisUrl)],
      ttl: envs.redis.ttlMs,
    }),
    AppConfigModule,
    CommonModule,
    ThrottlerModule.forRoot([
      {
        ttl: 60_000,
        limit: 120,
      },
    ]),
    DatabaseModule,
    AuthModule, 
    RolesModule, 
    UsersModule,
    SessionsModule,
    InventoryModule,
    CatalogModule,
    WarehousesModule,
    ProductionModule,
    SuppliersModule,
    IdentityModule,
    PaymentsModule,
    PurchasesModule,
    CompaniesModule,
    SecurityModule,
  ],
  providers: [
    {
      provide: getStorageToken(),
      useClass: RedisThrottlerStorage,
    },
    {
      provide: APP_GUARD,
      useClass: IpBanGuard,
    },
    {
      provide: APP_GUARD,
      useClass: SecurityThrottlerGuard,
    },
  ],
})
export class AppModule {

  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply()
      .forRoutes({ path: '*', method: RequestMethod.ALL });
  }
}

