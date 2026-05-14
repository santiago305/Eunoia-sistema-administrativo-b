import { Injectable } from '@nestjs/common';
import { AccessControlService } from 'src/modules/access-control/application/services/access-control.service';
import { AccessControlPort } from 'src/modules/mail/application/ports/access-control.port';

@Injectable()
export class AccessControlAdapter implements AccessControlPort {
  constructor(private readonly accessControlService: AccessControlService) {}

  async canViewModuleMessages(userId: string, _originModule: string, requiredPermissions: string[]): Promise<boolean> {
    return this.accessControlService.userHasAllPermissions(userId, requiredPermissions);
  }

  async canOpenMessage(
    userId: string,
    _messageId: string,
    _originModule: string,
    requiredPermissions: string[],
  ): Promise<boolean> {
    return this.accessControlService.userHasAllPermissions(userId, requiredPermissions);
  }

  async canDownloadAttachment(
    userId: string,
    _attachmentId: string,
    _originModule: string,
    requiredPermissions: string[],
  ): Promise<boolean> {
    return this.accessControlService.userHasAllPermissions(userId, requiredPermissions);
  }
}
