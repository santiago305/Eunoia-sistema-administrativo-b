import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { IpViolation } from '../../adapters/out/persistence/typeorm/entities/ip-violation.entity';
import { SecurityReasonCatalog } from '../../adapters/out/persistence/typeorm/entities/security-reason-catalog.entity';
import { humanizeReason, resolveWindow } from './security-insights.utils';

@Injectable()
export class GetSecurityReasonsCatalogUseCase {
  constructor(
    @InjectRepository(IpViolation)
    private readonly violationRepository: Repository<IpViolation>,
    @InjectRepository(SecurityReasonCatalog)
    private readonly reasonCatalogRepository: Repository<SecurityReasonCatalog>,
  ) {}

  async execute(params: { hours?: number; activeOnly?: boolean }) {
    const { from, to } = resolveWindow(params.hours);

    const rows = await this.violationRepository
      .createQueryBuilder('v')
      .select('v.reason', 'key')
      .addSelect('COUNT(*)', 'count')
      .where('v.created_at >= :from AND v.created_at <= :to', { from, to })
      .groupBy('v.reason')
      .orderBy('count', 'DESC')
      .getRawMany<{ key: string; count: string }>();

    const countsByKey = new Map(rows.map((row) => [row.key, Number(row.count) || 0]));
    const catalog = params.activeOnly
      ? await this.reasonCatalogRepository.find({ where: { active: true }, order: { key: 'ASC' } })
      : await this.reasonCatalogRepository.find({ order: { key: 'ASC' } });

    const catalogMap = new Map(catalog.map((item) => [item.key, item]));
    const mergedKeys = new Set<string>([...catalogMap.keys(), ...countsByKey.keys()]);

    const data = Array.from(mergedKeys)
      .map((key) => {
        const catalogItem = catalogMap.get(key);
        const count = countsByKey.get(key) ?? 0;
        return {
          key,
          label: catalogItem?.label ?? humanizeReason(key),
          count,
          active: catalogItem?.active ?? true,
        };
      })
      .filter((item) => (params.activeOnly ? item.count > 0 && item.active : true))
      .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));

    return {
      from: from.toISOString(),
      to: to.toISOString(),
      generatedAt: new Date().toISOString(),
      data,
    };
  }
}
