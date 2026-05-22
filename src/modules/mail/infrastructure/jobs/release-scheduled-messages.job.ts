import { Injectable, Logger } from '@nestjs/common';
import { NotificationsService } from '../../application/use-cases/notifications.service';

@Injectable()
export class ReleaseScheduledMessagesJob {
  private readonly logger = new Logger(ReleaseScheduledMessagesJob.name);

  constructor(private readonly notificationsService: NotificationsService) {}

  async run() {
    const result = await this.notificationsService.releaseDueScheduledMessages(100);
    this.logger.debug(`release-scheduled-messages released=${result.released ?? 0}`);
    return result;
  }
}

