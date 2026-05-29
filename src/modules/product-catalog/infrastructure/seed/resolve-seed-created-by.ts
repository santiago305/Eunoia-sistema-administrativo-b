import { DataSource } from "typeorm";
import { User } from "src/modules/users/adapters/out/persistence/typeorm/entities/user.entity";
import { RoleType } from "src/shared/constantes/constants";

export async function resolveSeedCreatedBy(
  dataSource: DataSource,
  explicitCreatedBy?: string | null,
): Promise<string> {
  if (explicitCreatedBy) {
    return explicitCreatedBy;
  }

  const userRepo = dataSource.getRepository(User);

  const superAdminUser = await userRepo.findOne({
    where: {
      isSuperAdmin: true,
      deleted: false,
    },
    select: ["id", "email"],
    order: { createdAt: "ASC" },
  });

  if (superAdminUser?.id) {
    return superAdminUser.id;
  }

  const adminUser = await userRepo
    .createQueryBuilder("user")
    .leftJoin("user.role", "role")
    .where("role.description = :roleDescription", { roleDescription: RoleType.ADMIN })
    .andWhere("user.deleted = :deleted", { deleted: false })
    .orderBy("user.createdAt", "ASC")
    .getOne();

  if (adminUser?.id) {
    return adminUser.id;
  }

  throw new Error(
    "No se encontro un usuario superadmin/admin para usar como createdBy. Ejecuta seedUser primero o envia options.createdBy.",
  );
}
