import { DataSource } from 'typeorm';
import * as argon2 from 'argon2';
import { User } from '../entities/user.entity';
import { Role } from 'src/roles/entities/role.entity';
import { RoleType } from 'src/common/constants';

/**
 * Seeder para insertar usuarios por defecto (admin y usuario).
 */
export const seedUser = async (dataSource: DataSource) => {
  const userRepo = dataSource.getRepository(User);
  const roleRepo = dataSource.getRepository(Role);

  const usersToSeed = [
    {
      name: 'Santiago',
      email: 'minecratf633@gmail.com',
      password: '123123123',
      roleDescription: RoleType.ADMIN,
      avatarUrl: 'https://res.cloudinary.com/demo/image/upload/v1730059489/default-admin.png',
    },
    {
      name: 'MarAa',
      email: 'maria@example.com',
      password: '123123123',
      roleDescription: RoleType.USER,
      avatarUrl: 'https://res.cloudinary.com/demo/image/upload/v1730059490/default-user.png',
    },
  ];

  for (const { name, email, password, roleDescription, avatarUrl } of usersToSeed) {
    const existing = await userRepo.findOneBy({ email });
    if (existing) {
      console.log(` Usuario con email ${email} ya existe, omitiendo...`);
      continue;
    }

    const role = await roleRepo
      .createQueryBuilder('role')
      .select(['role.id'])
      .where('role.description = :description', { description: roleDescription })
      .getOne();

    if (!role) {
      console.error(`A Rol "${roleDescription}" no existe. Crea los roles primero.`);
      continue;
    }

    const hashedPassword = await argon2.hash(password, { type: argon2.argon2id });

    const user = userRepo.create({
      name,
      email,
      password: hashedPassword,
      role,
      avatarUrl,
    });

    await userRepo.save(user);
    console.log(`A Usuario ${name} creado exitosamente`);
  }
};

