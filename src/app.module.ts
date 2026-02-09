import { MiddlewareConsumer, 
  Module, 
  RequestMethod 
} from '@nestjs/common';
import { AuthModule } from './modules/auth/infrastructure/auth.module';
import { RolesModule } from './modules/roles/infrastructure/roles.module';
import { UsersModule } from './modules/users/infrastructure/users.module';
import { SessionsModule } from './modules/sessions/infrastructure/sessions.module';
import { InventoryModule } from './modules/inventory/infrastructure/inventory.module';
import { CatalagModule } from './modules/catalag/infrastructure/catalag.module';
import { AppConfigModule } from './infrastructure/config/config.module';
import { CommonModule } from './shared/common.module';
import { DatabaseModule } from './infrastructure/database/database.module';


@Module({
  imports: [
    AppConfigModule,
    CommonModule,
    DatabaseModule,
    AuthModule, 
    RolesModule, 
    UsersModule,
    SessionsModule,
    InventoryModule,
    CatalagModule,
  ],
})
export class AppModule {

  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply()
      .forRoutes({ path: '*', method: RequestMethod.ALL });
  }
}
