import { DataSource } from 'typeorm';
import * as argon2 from 'argon2';
import { User } from '../../adapters/out/persistence/typeorm/entities/user.entity';
import { envs } from 'src/infrastructure/config/envs';

/**
 * Seeder para insertar usuario protegido por defecto (superadministrador).
 */
export const seedUser = async (dataSource: DataSource) => {
  const userRepo = dataSource.getRepository(User);
  const avatarUrl = '';
  const masterUsers = [
    {
      email: (process.env.MASTER_ADMIN_EMAIL ?? 'minecratf633@gmail.com').trim().toLowerCase(),
      name: (process.env.MASTER_ADMIN_NAME ?? 'Santiago').trim(),
    },
    {
      email: (process.env.MASTER_ADMIN_SECOND_EMAIL ?? 'josegerardo@eunoia.pe').trim().toLowerCase(),
      name: (process.env.MASTER_ADMIN_SECOND_NAME ?? 'Josegerardo').trim(),
    },
  ];

  const configuredPassword = String(envs.masterAdminInitialPassword ?? '').trim();
  const fallbackDevPassword = 'DevMaster_ChangeMe123!';
  const resolvedPassword = configuredPassword || fallbackDevPassword;

  if (envs.nodeEnv === 'production' && !configuredPassword) {
    throw new Error('MASTER_ADMIN_INITIAL_PASSWORD es obligatorio en producción');
  }
  if (resolvedPassword.length < 12) {
    throw new Error('MASTER_ADMIN_INITIAL_PASSWORD debe tener al menos 12 caracteres');
  }
  if (!configuredPassword && envs.nodeEnv !== 'production') {
    console.warn('[seedUser] MASTER_ADMIN_INITIAL_PASSWORD no definido. Usando password de desarrollo temporal.');
  }

  for (const user of masterUsers) {
    if (!user.email || !user.name) {
      throw new Error('Los usuarios maestros deben tener email y nombre configurados');
    }
  }

  const duplicatedEmails = masterUsers
    .map((user) => user.email)
    .filter((email, index, emails) => emails.indexOf(email) !== index);
  if (duplicatedEmails.length > 0) {
    throw new Error(`Emails de usuarios maestros duplicados: ${[...new Set(duplicatedEmails)].join(', ')}`);
  }

  const hashedPassword = await argon2.hash(resolvedPassword, { type: argon2.argon2id });

  for (const masterUser of masterUsers) {
    const existing = await userRepo.findOne({
      where: { email: masterUser.email },
      relations: { role: true },
    });

    if (existing) {
      existing.name = masterUser.name;
      existing.password = hashedPassword;
      existing.role = null;
      existing.avatarUrl = avatarUrl;
      existing.isSuperAdmin = true;
      existing.deleted = false;
      existing.deletedAt = null;
      await userRepo.save(existing);
      console.log(`Usuario maestro ${masterUser.email} actualizado`);
      continue;
    }

    const user = userRepo.create({
      name: masterUser.name,
      email: masterUser.email,
      password: hashedPassword,
      role: null,
      avatarUrl,
      isSuperAdmin: true,
    });

    await userRepo.save(user);
    console.log(`Usuario maestro ${masterUser.name} creado exitosamente`);
  }
};
