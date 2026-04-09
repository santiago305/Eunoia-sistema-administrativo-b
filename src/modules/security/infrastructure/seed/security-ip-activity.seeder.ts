import { DataSource, In } from 'typeorm';
import { IpBan } from '../../adapters/out/persistence/typeorm/entities/ip-ban.entity';
import { IpViolation } from '../../adapters/out/persistence/typeorm/entities/ip-violation.entity';

type SeedViolationInput = {
  ip: string;
  reason: string;
  path: string | null;
  method: string | null;
  userAgent: string | null;
  createdAt: Date;
};

type SeedBanInput = {
  ip: string;
  banLevel: number;
  bannedUntil: Date | null;
  manualPermanentBan: boolean;
  notes: string | null;
  createdBy: string | null;
  reviewedBy: string | null;
  lastReason: string | null;
};

const now = new Date();

const buildViolations = (
  ip: string,
  count: number,
  config: Omit<SeedViolationInput, 'ip' | 'createdAt'>,
  startOffsetMinutes: number,
): SeedViolationInput[] =>
  Array.from({ length: count }, (_, index) => ({
    ip,
    reason: config.reason,
    path: config.path,
    method: config.method,
    userAgent: config.userAgent,
    createdAt: new Date(now.getTime() - (startOffsetMinutes + index * 7) * 60_000),
  }));

const SEEDED_IPS = [
  '203.0.113.10',
  '198.51.100.24',
  '192.0.2.45',
  '203.0.113.77',
  '198.51.100.200',
];

const VIOLATIONS: SeedViolationInput[] = [
  ...buildViolations(
    '203.0.113.10',
    6,
    {
      reason: 'rate_limit_exceeded',
      path: '/api/auth/login',
      method: 'POST',
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
    },
    15,
  ),
  ...buildViolations(
    '203.0.113.10',
    2,
    {
      reason: 'high_frequency_same_route',
      path: '/api/products',
      method: 'GET',
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
    },
    75,
  ),
  ...buildViolations(
    '198.51.100.24',
    5,
    {
      reason: 'auth_bruteforce_suspected',
      path: '/api/auth/login',
      method: 'POST',
      userAgent: 'python-requests/2.31',
    },
    20,
  ),
  ...buildViolations(
    '198.51.100.24',
    2,
    {
      reason: 'token_abuse_suspected',
      path: '/api/auth/refresh',
      method: 'POST',
      userAgent: 'python-requests/2.31',
    },
    80,
  ),
  ...buildViolations(
    '192.0.2.45',
    4,
    {
      reason: 'invalid_csrf_repeated',
      path: '/api/purchases',
      method: 'POST',
      userAgent: 'Mozilla/5.0 (X11; Linux x86_64)',
    },
    30,
  ),
  ...buildViolations(
    '192.0.2.45',
    1,
    {
      reason: 'suspicious_user_agent',
      path: '/api/users/profile',
      method: 'PATCH',
      userAgent: '',
    },
    95,
  ),
  ...buildViolations(
    '203.0.113.77',
    3,
    {
      reason: 'burst_multi_route_scan',
      path: '/api/admin/export',
      method: 'GET',
      userAgent: 'curl/8.6.0',
    },
    10,
  ),
  ...buildViolations(
    '203.0.113.77',
    3,
    {
      reason: 'suspicious_user_agent',
      path: '/api/security/audit',
      method: 'GET',
      userAgent: 'curl/8.6.0',
    },
    55,
  ),
  ...buildViolations(
    '198.51.100.200',
    2,
    {
      reason: 'known_bad_ip_match',
      path: '/api/auth/login',
      method: 'POST',
      userAgent: 'Masscan/1.3',
    },
    25,
  ),
  ...buildViolations(
    '198.51.100.200',
    2,
    {
      reason: 'manual_permanent_ban_request',
      path: '/api/security/dashboard',
      method: 'GET',
      userAgent: 'Masscan/1.3',
    },
    70,
  ),
];

const BANS: SeedBanInput[] = [
  {
    ip: '203.0.113.10',
    banLevel: 2,
    bannedUntil: new Date(now.getTime() + 45 * 60_000),
    manualPermanentBan: false,
    notes: 'IP con exceso de requests en autenticacion y busqueda',
    createdBy: 'seed',
    reviewedBy: 'seed',
    lastReason: 'rate_limit_exceeded',
  },
  {
    ip: '198.51.100.24',
    banLevel: 3,
    bannedUntil: new Date(now.getTime() + 120 * 60_000),
    manualPermanentBan: false,
    notes: 'Patron de fuerza bruta y abuso de refresh token',
    createdBy: 'seed',
    reviewedBy: 'seed',
    lastReason: 'auth_bruteforce_suspected',
  },
  {
    ip: '203.0.113.77',
    banLevel: 2,
    bannedUntil: new Date(now.getTime() + 60 * 60_000),
    manualPermanentBan: false,
    notes: 'Escaneo rapido de rutas y user agent sospechoso',
    createdBy: 'seed',
    reviewedBy: 'seed',
    lastReason: 'burst_multi_route_scan',
  },
  {
    ip: '198.51.100.200',
    banLevel: 4,
    bannedUntil: null,
    manualPermanentBan: true,
    notes: 'IP marcada manualmente por reputacion negativa',
    createdBy: 'seed-admin',
    reviewedBy: 'seed-admin',
    lastReason: 'manual_permanent_ban',
  },
];

export const seedSecurityIpActivity = async (dataSource: DataSource): Promise<void> => {
  const violationRepo = dataSource.getRepository(IpViolation);
  const banRepo = dataSource.getRepository(IpBan);

  await violationRepo.delete({ ip: In(SEEDED_IPS) });
  await banRepo.delete({ ip: In(SEEDED_IPS) });

  await violationRepo.save(
    VIOLATIONS.map((violation) =>
      violationRepo.create({
        ...violation,
      }),
    ),
  );

  for (const ban of BANS) {
    await banRepo.save(
      banRepo.create({
        ...ban,
      }),
    );
  }
};
