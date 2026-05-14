export const ACCESS_CONTROL_PORT = Symbol('ACCESS_CONTROL_PORT');

export interface AccessControlPort {
  canViewModuleMessages(userId: string, requiredPermissions: string[]): Promise<boolean>;
  canOpenMessage(userId: string, requiredPermissions: string[]): Promise<boolean>;
  canDownloadAttachment(userId: string, requiredPermissions: string[]): Promise<boolean>;
}
