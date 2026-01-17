export class InvalidRoleIdError extends Error {
  constructor(message: string = 'RoleId invalido') {
    super(message);
    this.name = 'InvalidRoleIdError';
  }
}
