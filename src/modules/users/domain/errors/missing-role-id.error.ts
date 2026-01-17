export class MissingRoleIdError extends Error {
  constructor(message: string = 'RoleId requerido para mapear User') {
    super(message);
    this.name = 'MissingRoleIdError';
  }
}
