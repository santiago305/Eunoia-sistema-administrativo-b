import { BadRequestException, Inject, Injectable, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';
import { MessageLabelEntity } from '../../adapters/out/persistence/typeorm/entities/message-label.entity';
import { MessageLabelAssignmentEntity } from '../../adapters/out/persistence/typeorm/entities/message-label-assignment.entity';
import { MessageUserStateEntity } from '../../adapters/out/persistence/typeorm/entities/message-user-state.entity';
import { MessageSearchHistoryEntity } from '../../adapters/out/persistence/typeorm/entities/message-search-history.entity';
import { ACCESS_CONTROL_PORT, AccessControlPort } from '../ports/access-control.port';
import { NOTIFICATION_MODULE_PERMISSIONS } from '../constants/notification-module-permissions';

@Injectable()
export class NotificationLabelsService {
  constructor(
    @InjectRepository(MessageLabelEntity)
    private readonly messageLabelRepository: Repository<MessageLabelEntity>,
    @InjectRepository(MessageLabelAssignmentEntity)
    private readonly messageLabelAssignmentRepository: Repository<MessageLabelAssignmentEntity>,
    @InjectRepository(MessageUserStateEntity)
    private readonly messageUserStateRepository: Repository<MessageUserStateEntity>,
    @InjectRepository(MessageSearchHistoryEntity)
    private readonly messageSearchHistoryRepository: Repository<MessageSearchHistoryEntity>,
    @Inject(ACCESS_CONTROL_PORT)
    private readonly accessControlPort: AccessControlPort,
  ) {}

  private async getAllowedModuleKeys(userId: string) {
    const entries = await Promise.all(
      Object.entries(NOTIFICATION_MODULE_PERMISSIONS).map(async ([moduleKey, requiredPermissions]) => ({
        moduleKey,
        allowed: await this.accessControlPort.canViewModuleMessages(userId, moduleKey, requiredPermissions),
      })),
    );
    return new Set(entries.filter((entry) => entry.allowed).map((entry) => entry.moduleKey));
  }

  async listMyLabels(userId: string) {
    const labels = await this.messageLabelRepository.find({
      where: [{ ownerUserId: null, isVisible: true }, { ownerUserId: userId, isVisible: true }],
      order: { sortOrder: 'ASC', createdAt: 'ASC' },
    });
    const allowedKeys = await this.getAllowedModuleKeys(userId);
    return labels.filter((label) => (label.type === 'MODULE' ? allowedKeys.has(label.key) : true));
  }

  async createCustomLabel(userId: string, name: string, color: string) {
    const normalizedName = name.trim();
    if (!normalizedName) throw new BadRequestException({ message: 'Nombre de etiqueta obligatorio.', identifier: 'LABEL_NAME_REQUIRED' });
    const key = normalizedName.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-_]/g, '');
    if (!key) throw new BadRequestException({ message: 'Nombre de etiqueta invalido.', identifier: 'LABEL_NAME_INVALID' });

    const exists = await this.messageLabelRepository.findOne({ where: { ownerUserId: userId, key } });
    if (exists?.isVisible) throw new BadRequestException({ message: 'Etiqueta ya existente.', identifier: 'LABEL_ALREADY_EXISTS' });

    if (exists && !exists.isVisible) {
      exists.isVisible = true;
      exists.color = color.trim();
      exists.name = normalizedName;
      exists.updatedAt = new Date();
      try { return await this.messageLabelRepository.save(exists); } catch { throw new InternalServerErrorException({ message: 'No se pudo reactivar la etiqueta.', identifier: 'LABEL_REACTIVATE_FAILED' }); }
    }

    const entity = this.messageLabelRepository.create({ ownerUserId: userId, key, name: normalizedName, type: 'CUSTOM', color: color.trim(), icon: 'Tag', isVisible: true, sortOrder: 1000 });
    try { return await this.messageLabelRepository.save(entity); } catch { throw new InternalServerErrorException({ message: 'No se pudo crear la etiqueta.', identifier: 'LABEL_CREATE_FAILED' }); }
  }

  async deactivateCustomLabel(userId: string, labelId: string) {
    const label = await this.messageLabelRepository.findOne({ where: { id: labelId, ownerUserId: userId, type: 'CUSTOM' } });
    if (!label) throw new NotFoundException({ message: 'Etiqueta no encontrada.', identifier: 'LABEL_NOT_FOUND' });
    label.isVisible = false;
    label.updatedAt = new Date();
    try { await this.messageLabelRepository.save(label); return { id: label.id, isVisible: label.isVisible }; } catch { throw new InternalServerErrorException({ message: 'No se pudo eliminar la etiqueta.', identifier: 'LABEL_DELETE_FAILED' }); }
  }

  async updateCustomLabel(userId: string, labelId: string, input: { name?: string; color?: string; isVisible?: boolean }) {
    const label = await this.messageLabelRepository.findOne({ where: { id: labelId, ownerUserId: userId, type: 'CUSTOM' } });
    if (!label) throw new NotFoundException({ message: 'Etiqueta no encontrada.', identifier: 'LABEL_NOT_FOUND' });

    if (typeof input.name === 'string') {
      const normalizedName = input.name.trim();
      if (!normalizedName) throw new BadRequestException({ message: 'Nombre de etiqueta obligatorio.', identifier: 'LABEL_NAME_REQUIRED' });
      const key = normalizedName.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-_]/g, '');
      if (!key) throw new BadRequestException({ message: 'Nombre de etiqueta invalido.', identifier: 'LABEL_NAME_INVALID' });
      const duplicated = await this.messageLabelRepository.findOne({ where: { ownerUserId: userId, key } });
      if (duplicated && duplicated.id !== label.id) throw new BadRequestException({ message: 'Etiqueta ya existente.', identifier: 'LABEL_ALREADY_EXISTS' });
      label.name = normalizedName;
      label.key = key;
    }

    if (typeof input.color === 'string') label.color = input.color.trim() || null;
    if (typeof input.isVisible === 'boolean') label.isVisible = input.isVisible;
    label.updatedAt = new Date();
    try { return await this.messageLabelRepository.save(label); } catch { throw new InternalServerErrorException({ message: 'No se pudo actualizar la etiqueta.', identifier: 'LABEL_UPDATE_FAILED' }); }
  }

  async assignLabelsToState(messageUserStateId: string, userId: string, labelIds: string[], manager?: EntityManager) {
    const labelRepo = manager ? manager.getRepository(MessageLabelEntity) : this.messageLabelRepository;
    const assignmentRepo = manager ? manager.getRepository(MessageLabelAssignmentEntity) : this.messageLabelAssignmentRepository;
    const ids = Array.from(new Set((labelIds ?? []).filter(Boolean)));
    if (!ids.length) return;

    const labels = await labelRepo.find({ where: ids.map((id) => ({ id })), select: ['id', 'ownerUserId', 'key', 'type'] });
    const allowedModuleKeys = await this.getAllowedModuleKeys(userId);
    const allowed = labels.filter((label) => {
      const ownerAllowed = !label.ownerUserId || label.ownerUserId === userId;
      if (!ownerAllowed) return false;
      if (label.type !== 'MODULE') return true;
      return allowedModuleKeys.has(label.key);
    });
    if (!allowed.length) return;

    const existing = await assignmentRepo.find({ where: allowed.map((label) => ({ messageUserStateId, userId, labelId: label.id })), select: ['labelId'] });
    const existingIds = new Set(existing.map((item) => item.labelId));
    const toInsert = allowed.filter((label) => !existingIds.has(label.id));
    if (!toInsert.length) return;

    await assignmentRepo.save(toInsert.map((label) => assignmentRepo.create({ labelId: label.id, messageUserStateId, userId })));
  }

  async assignLabelToMessage(userId: string, messageId: string, labelId: string) {
    const state = (await this.messageUserStateRepository.findOne({ where: { messageId, userId } })) ?? (await this.messageUserStateRepository.findOne({ where: { id: messageId, userId } }));
    if (!state) throw new NotFoundException('MESSAGE_NOT_FOUND');
    await this.assignLabelsToState(state.id, userId, [labelId]);
    return { assigned: true, state };
  }

  async removeLabelFromMessage(userId: string, messageId: string, labelId: string) {
    const state = (await this.messageUserStateRepository.findOne({ where: { messageId, userId } })) ?? (await this.messageUserStateRepository.findOne({ where: { id: messageId, userId } }));
    if (!state) throw new NotFoundException('MESSAGE_NOT_FOUND');
    await this.messageLabelAssignmentRepository.createQueryBuilder().delete().where('user_id = :userId', { userId }).andWhere('label_id = :labelId', { labelId }).andWhere('message_user_state_id = :stateId', { stateId: state.id }).execute();
    return { removed: true, state };
  }

  async listSearchHistory(userId: string) {
    return this.messageSearchHistoryRepository.find({ where: { userId }, order: { lastUsedAt: 'DESC', createdAt: 'DESC' }, take: 10 });
  }

  private async upsertSearchHistory(userId: string, queryRaw: string) {
    const query = queryRaw.trim();
    if (!query) return;
    const existing = await this.messageSearchHistoryRepository.findOne({ where: { userId, query } });
    if (existing) {
      existing.usedCount += 1;
      existing.lastUsedAt = new Date();
      await this.messageSearchHistoryRepository.save(existing);
    } else {
      await this.messageSearchHistoryRepository.save(this.messageSearchHistoryRepository.create({ userId, query, usedCount: 1, lastUsedAt: new Date() }));
    }

    const all = await this.messageSearchHistoryRepository.find({ where: { userId }, order: { lastUsedAt: 'DESC', createdAt: 'DESC' } });
    if (all.length > 10) {
      await this.messageSearchHistoryRepository.delete(all.slice(10).map((item) => item.id));
    }
  }

  async saveSearchHistory(userId: string, query: string) {
    const normalized = query.trim();
    if (!normalized) throw new BadRequestException('SEARCH_QUERY_REQUIRED');
    await this.upsertSearchHistory(userId, normalized);
    return this.listSearchHistory(userId);
  }

  async deleteSearchHistory(userId: string, id: string) {
    const history = await this.messageSearchHistoryRepository.findOne({ where: { id, userId } });
    if (!history) throw new NotFoundException('SEARCH_HISTORY_NOT_FOUND');
    await this.messageSearchHistoryRepository.delete({ id });
    return { deleted: true };
  }

  async trackSearch(userId: string, query?: string) {
    if (query?.trim()) await this.upsertSearchHistory(userId, query);
  }
}
