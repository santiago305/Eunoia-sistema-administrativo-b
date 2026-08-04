export const formatRoleDescription = (value: string): string =>
  value.trim().replace(/\s+/gu, ' ').toLocaleLowerCase('es');

export const normalizeRoleDescription = (value: string): string =>
  formatRoleDescription(value)
    .replace(/[áàäâãå]/gu, 'a')
    .replace(/[éèëê]/gu, 'e')
    .replace(/[íìïî]/gu, 'i')
    .replace(/[óòöôõ]/gu, 'o')
    .replace(/[úùüû]/gu, 'u');
