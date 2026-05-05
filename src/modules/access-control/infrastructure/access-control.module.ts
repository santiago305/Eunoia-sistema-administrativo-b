import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Role } from 'src/modules/roles/adapters/out/persistence/typeorm/entities/role.entity';
import { User } from 'src/modules/users/adapters/out/persistence/typeorm/entities/user.entity';
import { AccessControlController } from '../adapters/in/controllers/access-control.controller';
import { Permission } from '../adapters/out/persistence/typeorm/entities/permission.entity';
import { RolePermission } from '../adapters/out/persistence/typeorm/entities/role-permission.entity';
import { UserPermissionOverride } from '../adapters/out/persistence/typeorm/entities/user-permission-override.entity';
import { AccessControlService } from '../application/services/access-control.service';
import { AccessControlSeeder } from './seed/access-control.seeder';
import { PermissionsGuard } from '../adapters/in/guards/permissions.guard';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, Role, Permission, RolePermission, UserPermissionOverride]),
  ],
  controllers: [AccessControlController],
  providers: [AccessControlService, AccessControlSeeder, PermissionsGuard],
  exports: [AccessControlService, PermissionsGuard],
})
export class AccessControlModule {}

