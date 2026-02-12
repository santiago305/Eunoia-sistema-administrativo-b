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
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';


@Module({
  imports: [
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
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
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

