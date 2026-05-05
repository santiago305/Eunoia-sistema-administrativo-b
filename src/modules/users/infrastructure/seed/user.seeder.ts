import { DataSource } from 'typeorm';
import * as argon2 from 'argon2';
import { User } from '../../adapters/out/persistence/typeorm/entities/user.entity';
import { Role } from '../../../roles/adapters/out/persistence/typeorm/entities/role.entity';
import { RoleType } from 'src/shared/constantes/constants';

/**
 * Seeder para insertar usuarios por defecto (admin y adviser).
 */
export const seedUser = async (dataSource: DataSource) => {
  const userRepo = dataSource.getRepository(User);
  const roleRepo = dataSource.getRepository(Role);

  const protectedUsers = [
    {
      name: 'Santiago',
      email: 'minecratf633@gmail.com',
      password: '123123123',
      roleDescription: RoleType.ADMIN,
      avatarUrl: '',
      isSuperAdmin: true,
    },
    {
      name: 'ADMIN_INTERNAL',
      email: 'admin@gmail.com',
      password: '12345678',
      roleDescription: RoleType.ADMIN,
      avatarUrl: '',
      isSuperAdmin: false,
    },
    {
      name: 'MarAa',
      email: 'maria@example.com',
      password: '123123123',
      roleDescription: RoleType.ADVISER,
      avatarUrl: '',
      isSuperAdmin: false,
    },
  ];

  const roles = await roleRepo
    .createQueryBuilder('role')
    .select(['role.roleId', 'role.description'])
    .where('role.description IN (:...descriptions)', {
      descriptions: [RoleType.ADMIN, RoleType.MODERATOR, RoleType.ADVISER],
    })
    .getMany();

  const roleMap = new Map(roles.map((r) => [r.description, r]));
  const adminRole = roleMap.get(RoleType.ADMIN);
  const moderatorRole = roleMap.get(RoleType.MODERATOR);
  const adviserRole = roleMap.get(RoleType.ADVISER);

  if (!adminRole || !adviserRole || !moderatorRole) {
    return;
  }

  for (const { name, email, password, roleDescription, avatarUrl, isSuperAdmin } of protectedUsers) {
    const role = roleMap.get(roleDescription);
    if (!role) {
      continue;
    }

    const hashedPassword = await argon2.hash(password, { type: argon2.argon2id });
    const existing = await userRepo.findOne({
      where: { email },
      relations: { role: true },
    });

    if (existing) {
      existing.name = name;
      existing.password = hashedPassword;
      existing.role = role;
      existing.avatarUrl = avatarUrl;
      existing.isSuperAdmin = Boolean(isSuperAdmin);
      await userRepo.save(existing);
      console.log(`A Usuario protegido ${email} actualizado`);
      continue;
    }

    const user = userRepo.create({
      name,
      email,
      password: hashedPassword,
      role,
      avatarUrl,
      isSuperAdmin: Boolean(isSuperAdmin),
    });

    await userRepo.save(user);
    console.log(`A Usuario ${name} creado exitosamente`);
  }
};

