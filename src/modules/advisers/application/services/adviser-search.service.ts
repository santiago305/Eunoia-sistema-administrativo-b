import { Inject, Injectable } from '@nestjs/common';
import { LISTING_SEARCH_STORAGE, ListingSearchStorageRepository } from 'src/shared/listing-search/domain/listing-search.repository';
import { AdviserSearchSnapshot, buildAdviserSearchLabel, sanitizeAdviserSearchSnapshot } from '../support/adviser-search';

const TABLE_KEY = 'advisers';
@Injectable()
export class AdviserSearchService {
  constructor(@Inject(LISTING_SEARCH_STORAGE) private readonly storage: ListingSearchStorageRepository) {}
  async state(userId: string) {
    const state = await this.storage.listState({ userId, tableKey: TABLE_KEY });
    const mapSnapshot = (snapshot: unknown) => sanitizeAdviserSearchSnapshot(snapshot as AdviserSearchSnapshot);
    return {
      recent: state.recent.map((item) => { const snapshot = mapSnapshot(item.snapshot); return { recentId: item.recentId, label: buildAdviserSearchLabel(snapshot), snapshot, lastUsedAt: item.lastUsedAt }; }),
      saved: state.metrics.map((item) => { const snapshot = mapSnapshot(item.snapshot); return { metricId: item.metricId, name: item.name, label: buildAdviserSearchLabel(snapshot), snapshot, updatedAt: item.updatedAt }; }),
      catalogs: { activeStates: [{ id: 'true', label: 'Activos', keywords: ['activo'] }, { id: 'false', label: 'Inactivos', keywords: ['inactivo'] }] },
    };
  }
  async save(userId: string, name: string, raw: AdviserSearchSnapshot) {
    const snapshot = sanitizeAdviserSearchSnapshot(raw);
    if (!snapshot.q && !snapshot.filters.length) return { type: 'error', message: 'No hay filtros para guardar' };
    if (!name?.trim()) return { type: 'error', message: 'El nombre de la métrica es obligatorio' };
    await this.storage.createMetric({ userId, tableKey: TABLE_KEY, name: name.trim(), snapshot });
    return { type: 'success', message: 'Métrica guardada correctamente' };
  }
  async remove(userId: string, metricId: string) {
    const deleted = await this.storage.deleteMetric({ userId, tableKey: TABLE_KEY, metricId });
    return { type: deleted ? 'success' : 'error', message: deleted ? 'Métrica eliminada correctamente' : 'No se encontró la métrica' };
  }
}
