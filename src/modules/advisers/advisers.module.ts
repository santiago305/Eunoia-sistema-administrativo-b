import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AccessControlModule } from 'src/modules/access-control/infrastructure/access-control.module';
import { User } from 'src/modules/users/adapters/out/persistence/typeorm/entities/user.entity';
import { AdvisersController } from './adapters/in/controllers/advisers.controller';
import { AdviserEntity } from './adapters/out/persistence/typeorm/entities/adviser.entity';
import { CreateAdviserUsecase } from './application/usecases/create-adviser.usecase';
import { ListAdvisersUsecase } from './application/usecases/list-advisers.usecase';

@Module({
  imports: [
    TypeOrmModule.forFeature([AdviserEntity, User]),
    AccessControlModule,
  ],
  controllers: [AdvisersController],
  providers: [ListAdvisersUsecase, CreateAdviserUsecase],
  exports: [ListAdvisersUsecase],
})
export class AdvisersModule {}
