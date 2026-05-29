import { DataSource } from 'typeorm';
import * as argon2 from 'argon2';
import { User } from '../../adapters/out/persistence/typeorm/entities/user.entity';
import { envs } from 'src/infrastructure/config/envs';

/**
 * Seeder para insertar usuario protegido por defecto (superadministrador).
 */
export const seedUser = async (dataSource: DataSource) => {
  const userRepo = dataSource.getRepository(User);
  const email = 'minecratf633@gmail.com';
  const name = 'Santiago';
  const avatarUrl = '';

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

  const hashedPassword = await argon2.hash(resolvedPassword, { type: argon2.argon2id });
  const existing = await userRepo.findOne({
    where: { email },
    relations: { role: true },
  });

  if (existing) {
    existing.name = name;
    existing.password = hashedPassword;
    existing.role = null;
    existing.avatarUrl = avatarUrl;
    existing.isSuperAdmin = true;
    await userRepo.save(existing);
    console.log(`Usuario maestro ${email} actualizado`);
    return;
  }

  const user = userRepo.create({
    name,
    email,
    password: hashedPassword,
    role: null,
    avatarUrl,
    isSuperAdmin: true,
  });

  await userRepo.save(user);
  console.log(`Usuario maestro ${name} creado exitosamente`);
};

