export const ACCESS_CONTROL_PORT = Symbol('ACCESS_CONTROL_PORT');

export interface AccessControlPort {
  getAllowedNotificationModules(
    userId: string,
    modulePermissions: Record<string, string[]>,
  ): Promise<string[]>;
  canViewModuleMessages(userId: string, originModule: string, requiredPermissions: string[]): Promise<boolean>;
  canOpenMessage(userId: string, messageId: string, originModule: string, requiredPermissions: string[]): Promise<boolean>;
  canDownloadAttachment(userId: string, attachmentId: string, originModule: string, requiredPermissions: string[]): Promise<boolean>;
}
