import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from "@nestjs/common";
import { InjectDataSource } from "@nestjs/typeorm";
import { DataSource } from "typeorm";
import { User } from "src/modules/users/adapters/out/persistence/typeorm/entities/user.entity";

@Injectable()
export class SuperAdminGuard implements CanActivate {
  constructor(
    @InjectDataSource()
    private readonly dataSource: DataSource,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const userId = request?.user?.id;
    if (!userId) {
      throw new ForbiddenException("Acceso denegado.");
    }

    const user = await this.dataSource.getRepository(User).findOne({
      where: { id: userId },
      select: ["id", "isSuperAdmin"],
    });

    if (!user?.isSuperAdmin) {
      throw new ForbiddenException("Solo el super administrador puede acceder a esta sección.");
    }

    return true;
  }
}
