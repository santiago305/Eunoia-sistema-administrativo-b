import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { IpViolation } from '../../adapters/out/persistence/typeorm/entities/ip-violation.entity';
import { SecurityReasonCatalog } from '../../adapters/out/persistence/typeorm/entities/security-reason-catalog.entity';
import { humanizeReason, resolveWindow, SECURITY_TIMEZONE } from './security-insights.utils';

@Injectable()
export class GetReasonDistributionSecurityUseCase {
  constructor(
    @InjectRepository(IpViolation)
    private readonly violationRepository: Repository<IpViolation>,
    @InjectRepository(SecurityReasonCatalog)
    private readonly reasonCatalogRepository: Repository<SecurityReasonCatalog>,
  ) {}

  async execute(params: { hours?: number }) {
    const { from, to } = resolveWindow(params.hours);

    const rows = await this.violationRepository
      .createQueryBuilder('v')
      .select('v.reason', 'name')
      .addSelect('COUNT(*)', 'value')
      .where('v.created_at >= :from AND v.created_at <= :to', { from, to })
      .groupBy('v.reason')
      .orderBy('value', 'DESC')
      .getRawMany<{ name: string; value: string }>();

    const catalogRows = await this.reasonCatalogRepository.find();
    const labelByKey = new Map(catalogRows.map((item) => [item.key, item.label]));

    return {
      from: from.toISOString(),
      to: to.toISOString(),
      generatedAt: new Date().toISOString(),
      timeZone: SECURITY_TIMEZONE,
      data: rows.map((row) => ({
        key: row.name,
        name: row.name,
        label: labelByKey.get(row.name) ?? humanizeReason(row.name),
        value: Number(row.value) || 0,
      })),
    };
  }
}
