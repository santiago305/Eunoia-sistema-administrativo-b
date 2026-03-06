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
    },
    {
      name: 'MarAa',
      email: 'maria@example.com',
      password: '123123123',
      roleDescription: RoleType.ADVISER,
      avatarUrl: '',
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
    console.error('A Faltan roles base (admin/moderator/adviser). Ejecuta seed de roles primero.');
    return;
  }

  for (const { name, email, password, roleDescription, avatarUrl } of protectedUsers) {
    const role = roleMap.get(roleDescription);
    if (!role) {
      console.error(`A Rol "${roleDescription}" no existe. Crea los roles primero.`);
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
    });

    await userRepo.save(user);
    console.log(`A Usuario ${name} creado exitosamente`);
  }

  const TARGET_TOTAL_USERS = 10000;
  const existingCount = await userRepo.count();
  const usersToGenerate = Math.max(0, TARGET_TOTAL_USERS - existingCount);

  if (usersToGenerate === 0) {
    console.log(`A Ya existen ${existingCount} usuarios. No se generan usuarios aleatorios.`);
    return;
  }

  const randomPasswordHash = await argon2.hash('123123123', { type: argon2.argon2id });
  const firstNames = ['Luis', 'Ana', 'Carlos', 'Maria', 'Jose', 'Lucia', 'Pedro', 'Sofia', 'Diego', 'Camila'];
  const lastNames = ['Garcia', 'Perez', 'Ramirez', 'Torres', 'Flores', 'Vega', 'Lopez', 'Diaz', 'Ruiz', 'Castro'];
  const now = Date.now();
  const generated: User[] = [];

  for (let i = 0; i < usersToGenerate; i++) {
    const firstName = firstNames[Math.floor(Math.random() * firstNames.length)];
    const lastName = lastNames[Math.floor(Math.random() * lastNames.length)];
    const randomNumber = Math.floor(Math.random() * 9000) + 1000;
    const role = Math.random() < 0.85 ? adviserRole : moderatorRole;

    generated.push(
      userRepo.create({
        name: `${firstName} ${lastName} ${randomNumber}`,
        email: `seed.user.${now}.${i}@example.com`,
        password: randomPasswordHash,
        role,
        avatarUrl: '',
        telefono: `9${Math.floor(10000000 + Math.random() * 90000000)}`,
      }),
    );
  }

  await userRepo.save(generated, { chunk: 500 });
  console.log(`A Se crearon ${generated.length} usuarios aleatorios.`);
};

