import { formatRoleDescription, normalizeRoleDescription } from './role-description.util';

describe('role description normalization', () => {
  it('preserves accents for display and ignores them for comparisons', () => {
    expect(formatRoleDescription('  PRODUCCIÓN  ')).toBe('producción');
    expect(normalizeRoleDescription('Producción')).toBe('produccion');
    expect(normalizeRoleDescription('produccion')).toBe('produccion');
  });

  it('collapses repeated spaces and preserves enye', () => {
    expect(formatRoleDescription('GESTIÓN   DE   DISEÑO')).toBe('gestión de diseño');
    expect(normalizeRoleDescription('Gestión de diseño')).toBe('gestion de diseño');
  });
});
