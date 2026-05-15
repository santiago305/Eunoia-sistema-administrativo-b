import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from 'src/modules/users/adapters/out/persistence/typeorm/entities/user.entity';

type RecipientBucket = 'TO' | 'CC' | 'BCC';

type ResolvedRecipient = {
  id: string;
  email: string;
  name: string;
  relationType: RecipientBucket;
};

@Injectable()
export class MessageRecipientsResolverService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  normalizeEmails(recipients: string[] | string | undefined | null) {
    if (!recipients) return [];
    const values = Array.isArray(recipients) ? recipients : recipients.split(',');
    return Array.from(new Set(values.map((email) => email.trim().toLowerCase()).filter(Boolean)));
  }

  private isValidEmail(email: string) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }

  hasAnyRecipient(input: { to?: string[] | string; cc?: string[] | string; bcc?: string[] | string; recipients?: string }) {
    return (
      this.normalizeEmails(input.to).length > 0 ||
      this.normalizeEmails(input.cc).length > 0 ||
      this.normalizeEmails(input.bcc).length > 0 ||
      Boolean(input.recipients?.trim())
    );
  }

  async resolveRecipientsByBucketsOrFail(input: {
    to?: string[] | string;
    cc?: string[] | string;
    bcc?: string[] | string;
    recipients?: string;
  }): Promise<{ recipients: ResolvedRecipient[]; byType: Map<RecipientBucket, string[]> }> {
    const ordered: Array<{ type: RecipientBucket; emails: string[] }> = [
      { type: 'TO', emails: this.normalizeEmails(input.to) },
      { type: 'CC', emails: this.normalizeEmails(input.cc) },
      { type: 'BCC', emails: this.normalizeEmails(input.bcc) },
    ];

    if (!ordered.some((entry) => entry.emails.length) && input.recipients) {
      ordered[0].emails = this.normalizeEmails(input.recipients);
    }

    const dedupedByPriority = new Set<string>();
    const byType = new Map<RecipientBucket, string[]>();
    ordered.forEach((entry) => {
      const list: string[] = [];
      entry.emails.forEach((email) => {
        if (dedupedByPriority.has(email)) return;
        dedupedByPriority.add(email);
        list.push(email);
      });
      byType.set(entry.type, list);
    });

    const recipientEmails = Array.from(dedupedByPriority);
    if (!recipientEmails.length) {
      throw new BadRequestException('RECIPIENT_EMAIL_NOT_FOUND');
    }
    const invalidFormat = recipientEmails.filter((email) => !this.isValidEmail(email));
    if (invalidFormat.length) {
      throw new BadRequestException({
        message: 'Uno o mas destinatarios no existen',
        identifier: 'RECIPIENT_EMAIL_NOT_FOUND',
        invalidRecipients: invalidFormat,
      });
    }

    const users = await this.userRepository.find({
      where: recipientEmails.map((email) => ({ email })),
      select: ['id', 'email', 'name'],
    });
    const foundByEmail = new Set(users.map((user) => user.email.toLowerCase()));
    const invalidRecipients = recipientEmails.filter((email) => !foundByEmail.has(email));
    if (invalidRecipients.length) {
      throw new BadRequestException({
        message: 'Uno o mas destinatarios no existen',
        identifier: 'RECIPIENT_EMAIL_NOT_FOUND',
        invalidRecipients,
      });
    }

    const usersByEmail = new Map(users.map((user) => [user.email.toLowerCase(), user]));
    const recipients = Array.from(byType.entries()).flatMap(([relationType, emails]) =>
      emails
        .map((email) => {
          const user = usersByEmail.get(email);
          if (!user) return null;
          return { id: user.id, email: user.email, name: user.name, relationType };
        })
        .filter((item): item is ResolvedRecipient => Boolean(item)),
    );

    return { recipients, byType };
  }
}
