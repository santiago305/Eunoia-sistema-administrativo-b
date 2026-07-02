import { Injectable } from "@nestjs/common";
import { InjectEntityManager } from "@nestjs/typeorm";
import { EntityManager, SelectQueryBuilder } from "typeorm";

import { ClientEntity } from "src/modules/clients/adapters/out/persistence/typeorm/entities/client.entity";

import {
  DashboardSaleOrdersUbigeoBaseInput,
  DashboardSaleOrdersUbigeoDistrictInput,
  DashboardSaleOrdersUbigeoProvinceInput,
} from "src/modules/dashboard/application/dtos/dashboard-sale-orders-ubigeo.input";

import {
  DashboardSaleOrdersUbigeoGroupOutput,
  DashboardSaleOrdersUbigeoOutput,
} from "src/modules/dashboard/application/dtos/dashboard-sale-orders-ubigeo.output";

import { DashboardSaleOrdersRepository } from "src/modules/dashboard/domain/ports/dashboard-sale-orders.repository";

import { SaleOrderEntity } from "src/modules/sale-orders/adapters/out/persistence/typeorm/entities/sale-order.entity";
import { SalePaymentEntity } from "src/modules/sale-orders/adapters/out/persistence/typeorm/entities/sale-payment.entity";
import {
  SaleOrderSearchFields,
  SaleOrderSearchOperators,
  SaleOrderSearchRule,
} from "src/modules/sale-orders/application/dtos/sale-order-search/sale-order-search-snapshot";
import {
  getSaleOrderCalendarWeekRange,
  getSaleOrderMonthRange,
  sanitizeSaleOrderSearchFilters,
} from "src/modules/sale-orders/application/support/sale-order-search.utils";

import { UbigeoDepartmentEntity } from "src/modules/ubigeo/adapters/out/persistence/typeorm/entities/ubigeo-department.entity";
import { UbigeoDistrictEntity } from "src/modules/ubigeo/adapters/out/persistence/typeorm/entities/ubigeo-district.entity";
import { UbigeoProvinceEntity } from "src/modules/ubigeo/adapters/out/persistence/typeorm/entities/ubigeo-province.entity";

import { SaleOrderStatesEntity } from "src/modules/workflow/adapters/out/persistence/typeorm/entities/sale-order-states.entity";
import { WorkflowStateEntity } from "src/modules/workflow/adapters/out/persistence/typeorm/entities/workflow-state.entity";

type RawNumericValue = string | number | null | undefined;

type RawGroupRow = {
  id: string | null;
  label: string | null;
  orders: RawNumericValue;
  total: RawNumericValue;
  deliveryCostSum: RawNumericValue;
  collected: RawNumericValue;
  pending: RawNumericValue;
};

@Injectable()
export class DashboardSaleOrdersTypeormRepository
  implements DashboardSaleOrdersRepository
{
  constructor(
    @InjectEntityManager()
    private readonly manager: EntityManager,
  ) {}

  groupByDepartment(
    input: DashboardSaleOrdersUbigeoBaseInput,
  ): Promise<DashboardSaleOrdersUbigeoOutput> {
    const qb = this.baseQuery(input)
      .leftJoin(
        UbigeoDepartmentEntity,
        "department",
        "department.id = client.departmentId",
      )
      .select("department.id", "id")
      .addSelect(
        "COALESCE(department.name, 'Sin departamento')",
        "label",
      )
      .groupBy("department.id")
      .addGroupBy("department.name")
      .orderBy("COUNT(so.id)", "DESC");

    this.addMetricSelects(qb);

    return this.toOutput(qb);
  }

  groupByProvince(
    input: DashboardSaleOrdersUbigeoProvinceInput,
  ): Promise<DashboardSaleOrdersUbigeoOutput> {
    const qb = this.baseQuery(input)
      .leftJoin(
        UbigeoProvinceEntity,
        "province",
        "province.id = client.provinceId",
      )
      .andWhere("client.departmentId = :departmentId", {
        departmentId: input.departmentId,
      })
      .select("province.id", "id")
      .addSelect(
        "COALESCE(province.name, 'Sin provincia')",
        "label",
      )
      .groupBy("province.id")
      .addGroupBy("province.name")
      .orderBy("COUNT(so.id)", "DESC");

    this.addMetricSelects(qb);

    return this.toOutput(qb);
  }

  groupByDistrict(
    input: DashboardSaleOrdersUbigeoDistrictInput,
  ): Promise<DashboardSaleOrdersUbigeoOutput> {
    const qb = this.baseQuery(input)
      .leftJoin(
        UbigeoDistrictEntity,
        "district",
        "district.id = client.districtId",
      )
      .andWhere("client.provinceId = :provinceId", {
        provinceId: input.provinceId,
      })
      .select("district.id", "id")
      .addSelect(
        "COALESCE(district.name, 'Sin distrito')",
        "label",
      )
      .groupBy("district.id")
      .addGroupBy("district.name")
      .orderBy("COUNT(so.id)", "DESC");

    this.addMetricSelects(qb);

    return this.toOutput(qb);
  }

  private baseQuery(
    input: DashboardSaleOrdersUbigeoBaseInput,
  ): SelectQueryBuilder<SaleOrderEntity> {
    const qb = this.manager
      .getRepository(SaleOrderEntity)
      .createQueryBuilder("so")
      .leftJoin(
        ClientEntity,
        "client",
        "client.id = so.clientId",
      )
      .leftJoin(
        WorkflowStateEntity,
        "state",
        "state.id = so.currentStateId",
      )
      .leftJoin(
        SaleOrderStatesEntity,
        "globalState",
        "globalState.id = state.saleOrderStateId",
      )
      .leftJoin(
        (subQuery) =>
          subQuery
            .select(
              "payment.saleOrderId",
              "sale_order_id",
            )
            .addSelect(
              "COALESCE(SUM(payment.amount), 0)",
              "collected",
            )
            .from(
              SalePaymentEntity,
              "payment",
            )
            .groupBy("payment.saleOrderId"),
        "payment_sum",
        "payment_sum.sale_order_id = so.id",
      )
      .where("so.isActive = true");

    if (input.cancelBool !== true) {
      qb.andWhere(
        `
          (
            globalState.code IS NULL
            OR UPPER(globalState.code) <> :cancelCode
          )
        `,
        {
          cancelCode: "CANCELLED",
        },
      );
    }

    this.applyMonthFilter(qb, input.month);
    this.applyDateFilters(qb, input.filters);

    return qb;
  }

  private applyDateFilters(
    qb: SelectQueryBuilder<SaleOrderEntity>,
    filters?: SaleOrderSearchRule[],
  ): void {
    sanitizeSaleOrderSearchFilters(filters ?? [])
      .filter(
        (filter) =>
          filter.field === SaleOrderSearchFields.SCHEDULE_DATE ||
          filter.field === SaleOrderSearchFields.DELIVERY_DATE,
      )
      .forEach((filter, index) => {
        const column =
          filter.field === SaleOrderSearchFields.SCHEDULE_DATE
            ? "so.scheduleDate"
            : "so.deliveryDate";
        const prefix = `dashboard_filter_${index}`;

        if (filter.operator === SaleOrderSearchOperators.BETWEEN) {
          if (!filter.range?.start || !filter.range.end) return;
          qb.andWhere(`${column} BETWEEN :${prefix}_start AND :${prefix}_end`, {
            [`${prefix}_start`]: filter.range.start,
            [`${prefix}_end`]: filter.range.end,
          });
          return;
        }

        const range =
          filter.operator === SaleOrderSearchOperators.IN_MONTH
            ? getSaleOrderMonthRange(filter.value)
            : filter.operator === SaleOrderSearchOperators.IN_WEEK
              ? getSaleOrderCalendarWeekRange(filter.value)
              : null;
        if (range) {
          qb.andWhere(`${column} BETWEEN :${prefix}_start AND :${prefix}_end`, {
            [`${prefix}_start`]: range.start,
            [`${prefix}_end`]: range.end,
          });
          return;
        }

        if (!filter.value) return;
        const operators = {
          [SaleOrderSearchOperators.ON]: "=",
          [SaleOrderSearchOperators.BEFORE]: "<",
          [SaleOrderSearchOperators.AFTER]: ">",
          [SaleOrderSearchOperators.ON_OR_BEFORE]: "<=",
          [SaleOrderSearchOperators.ON_OR_AFTER]: ">=",
        } as const;
        const comparator = operators[filter.operator as keyof typeof operators];
        if (!comparator) return;
        qb.andWhere(`${column} ${comparator} :${prefix}_value`, {
          [`${prefix}_value`]: filter.value,
        });
      });
  }

  private addMetricSelects(
    qb: SelectQueryBuilder<SaleOrderEntity>,
  ): SelectQueryBuilder<SaleOrderEntity> {
    return qb
      .addSelect(
        "COUNT(so.id)",
        "orders",
      )
      .addSelect(
        "COALESCE(SUM(COALESCE(so.total, 0)), 0)",
        "total",
      )
      .addSelect(
        "COALESCE(SUM(COALESCE(so.deliveryCost, 0)), 0)",
        "deliveryCostSum",
      )
      .addSelect(
        `
          COALESCE(
            SUM(
              COALESCE(payment_sum.collected, 0)
            ),
            0
          )
        `,
        "collected",
      )
      .addSelect(
        `
          COALESCE(
            SUM(
              GREATEST(
                COALESCE(so.total, 0)
                - COALESCE(payment_sum.collected, 0),
                0
              )
            ),
            0
          )
        `,
        "pending",
      );
  }

  private applyMonthFilter(
    qb: SelectQueryBuilder<SaleOrderEntity>,
    month?: string,
  ): void {
    if (!month) {
      return;
    }

    const validMonthFormat = /^\d{4}-(0[1-9]|1[0-2])$/;

    if (!validMonthFormat.test(month)) {
      return;
    }

    const [yearText, monthText] = month.split("-");

    const year = Number(yearText);
    const monthNumber = Number(monthText);

    const monthStart = new Date(
      Date.UTC(
        year,
        monthNumber - 1,
        1,
        0,
        0,
        0,
        0,
      ),
    );

    const monthEnd = new Date(
      Date.UTC(
        year,
        monthNumber,
        1,
        0,
        0,
        0,
        0,
      ),
    );

    qb.andWhere(
      `
        so.scheduleDate >= :monthStart
        AND so.scheduleDate < :monthEnd
      `,
      {
        monthStart,
        monthEnd,
      },
    );
  }

  private async toOutput(
    qb: SelectQueryBuilder<SaleOrderEntity>,
  ): Promise<DashboardSaleOrdersUbigeoOutput> {
    const rows = await qb.getRawMany<RawGroupRow>();

    const groups = rows.map(
      (row): DashboardSaleOrdersUbigeoGroupOutput => ({
        id: row.id ?? null,
        label: row.label ?? "Sin ubicación",
        orders: this.toNumber(row.orders),
        total: this.toNumber(row.total),
        deliveryCostSum: this.toNumber(
          row.deliveryCostSum,
        ),
        collected: this.toNumber(row.collected),
        pending: this.toNumber(row.pending),
      }),
    );

    const totals = groups.reduce(
      (accumulator, group) => {
        accumulator.orders += group.orders;
        accumulator.total += group.total;
        accumulator.deliveryCostSum +=
          group.deliveryCostSum;
        accumulator.collected += group.collected;
        accumulator.pending += group.pending;

        return accumulator;
      },
      {
        orders: 0,
        total: 0,
        deliveryCostSum: 0,
        collected: 0,
        pending: 0,
      },
    );

    return {
      groups,
      totals,
    };
  }

  private toNumber(
    value: RawNumericValue,
  ): number {
    const result = Number(value ?? 0);

    return Number.isFinite(result)
      ? result
      : 0;
  }
}
