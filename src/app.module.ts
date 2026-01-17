import { MiddlewareConsumer, 
  Module, 
  RequestMethod 
} from '@nestjs/common';
import { AuthModule } from './modules/auth/infrastructure/auth.module';
import { RolesModule } from './modules/roles/infrastructure/roles.module';
import { UsersModule } from './modules/users/infrastructure/users.module';
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
  ],
})
export class AppModule {

  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply()
      .forRoutes({ path: '*', method: RequestMethod.ALL });
  }
}
