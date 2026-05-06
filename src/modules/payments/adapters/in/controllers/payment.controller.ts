import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Post, Query, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "src/modules/auth/adapters/in/guards/jwt-auth.guard";
import { PermissionsGuard } from "src/modules/access-control/adapters/in/guards/permissions.guard";
import { RequirePermissions } from "src/modules/access-control/adapters/in/decorators/require-permissions.decorator";
import { CompanyConfiguredGuard } from "src/shared/utilidades/guards/company-configured.guard";
import { CreatePaymentUsecase } from "src/modules/payments/application/usecases/payment/create.usecase";
import { DeletePaymentUsecase } from "src/modules/payments/application/usecases/payment/delete.usecase";
import { GetPaymentUsecase } from "src/modules/payments/application/usecases/payment/get-by-id.usecase";
import { GetPaymentsByPoIdUsecase } from "src/modules/payments/application/usecases/payment/get-by-po-id.usecase";
import { ListPaymentsUsecase } from "src/modules/payments/application/usecases/payment/list.usecase";
import { PaymentsHttpMapper } from "src/modules/payments/application/mappers/payments-http.mapper";
import { HttpCreatePaymentDto } from "../dtos/payment/http-payment-create.dto";
import { HttpListPaymentsQueryDto } from "../dtos/payment/http-payment-list.dto";
import { User as CurrentUser } from "src/shared/utilidades/decorators/user.decorator";
import { AccessControlService } from "src/modules/access-control/application/services/access-control.service";
import { NotificationsService } from "src/modules/notifications/application/use-cases/notifications.service";
import { PURCHASE_NOTIFICATION_TYPES } from "src/modules/notifications/domain/constants/purchase-notification-types";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { PaymentDocumentEntity } from "../../out/persistence/typeorm/entities/payment-document.entity";
import { ApprovalRequestEntity } from "src/modules/purchases/adapters/out/persistence/typeorm/entities/approval-request.entity";
import { PurchaseHistoryEventEntity } from "src/modules/purchases/adapters/out/persistence/typeorm/entities/purchase-history-event.entity";
import { PurchaseOrderEntity } from "src/modules/purchases/adapters/out/persistence/typeorm/entities/purchase-order.entity";
import { CREDIT_QUOTA_REPOSITORY, CreditQuotaRepository } from "src/modules/payments/domain/ports/credit-quota.repository";
import { Inject } from "@nestjs/common";

@Controller("payments")
@UseGuards(JwtAuthGuard, CompanyConfiguredGuard, PermissionsGuard)
export class PaymentsController {
  constructor(
    private readonly createPayment: CreatePaymentUsecase,
    private readonly deletePayment: DeletePaymentUsecase,
    private readonly getPayment: GetPaymentUsecase,
    private readonly getPaymentsByPoId: GetPaymentsByPoIdUsecase,
    private readonly listPayments: ListPaymentsUsecase,
    private readonly accessControlService: AccessControlService,
    private readonly notificationsService: NotificationsService,
    @InjectRepository(PaymentDocumentEntity)
    private readonly paymentEntityRepo: Repository<PaymentDocumentEntity>,
    @InjectRepository(ApprovalRequestEntity)
    private readonly approvalRequestRepo: Repository<ApprovalRequestEntity>,
    @InjectRepository(PurchaseHistoryEventEntity)
    private readonly purchaseHistoryRepo: Repository<PurchaseHistoryEventEntity>,
    @InjectRepository(PurchaseOrderEntity)
    private readonly purchaseOrderRepo: Repository<PurchaseOrderEntity>,
    @Inject(CREDIT_QUOTA_REPOSITORY)
    private readonly creditQuotaRepo: CreditQuotaRepository,
  ) {}

  @RequirePermissions("payments.manage")
  @Post()
  async create(@Body() dto: HttpCreatePaymentDto, @CurrentUser() user: { id: string }) {
    const canApprovePayment = await this.accessControlService.userHasAllPermissions(user.id, ["purchases.approve_payment"]);
    const input = PaymentsHttpMapper.toCreatePaymentInput(dto);

    if (input.poId) {
      const purchase = await this.purchaseOrderRepo.findOne({
        where: { id: input.poId },
        select: ["id", "approvalStatus"],
      });
      if (!purchase) {
        return { type: "error", message: "Compra no encontrada para registrar el pago." };
      }

      if (!canApprovePayment && purchase.approvalStatus === "PENDING") {
        return {
          type: "error",
          message: "La compra está pendiente de aprobación. No puedes registrar pagos hasta que sea aprobada.",
        };
      }

      if (!canApprovePayment && purchase.approvalStatus === "REJECTED") {
        return {
          type: "error",
          message: "La compra fue rechazada. No puedes registrar pagos en esta compra.",
        };
      }
    }

    const result = await this.createPayment.execute(
      input,
      undefined,
      {
        status: canApprovePayment ? "APPROVED" : "PENDING_APPROVAL",
        requestedByUserId: user.id,
        approvedByUserId: canApprovePayment ? user.id : undefined,
        approvedAt: canApprovePayment ? new Date() : undefined,
      },
    );

    if (!canApprovePayment && input.poId) {
      const approval = await this.approvalRequestRepo.save(
        this.approvalRequestRepo.create({
          module: "purchases",
          action: "PURCHASE_PAYMENT_CREATION",
          entityType: "purchase_payment",
          entityId: input.poId,
          requestedByUserId: user.id,
          status: "PENDING",
          payloadSnapshot: { poId: input.poId, amount: input.amount },
        }),
      );
      await this.purchaseHistoryRepo.save(
        this.purchaseHistoryRepo.create({
          purchaseId: input.poId,
          eventType: "PAYMENT_REQUESTED",
          description: "Se solicitó registrar un pago pendiente de aprobación.",
          performedByUserId: user.id,
          targetUserId: user.id,
          approvalRequestId: approval.id,
          metadata: { amount: input.amount },
        }),
      );
      const approvers = await this.accessControlService.getUserIdsWithPermission("purchases.approve_payment");
      const recipients = approvers.filter((id) => id !== user.id);
      if (recipients.length) {
        await this.notificationsService.createNotificationForUsers({
          recipientUserIds: recipients,
          type: PURCHASE_NOTIFICATION_TYPES.PURCHASE_PAYMENT_PENDING_APPROVAL,
          category: "PURCHASES",
          title: "Aprobación pendiente de pago",
          message: "Un usuario solicitó registrar un pago en una compra.",
          priority: "HIGH",
          actionUrl: `/compras?purchaseId=${input.poId}&modal=payments`,
          actionLabel: "Ver pago",
          sourceModule: "payments",
          sourceEntityType: "payment_document",
          sourceEntityId: input.poId,
          metadata: {
            poId: input.poId,
            approvalRequestId: approval.id,
            paymentId: result.paymentId ?? null,
            showAsToast: true,
          },
          showAsToast: true,
        });
      }
      await this.notificationsService.createNotificationForUsers({
        recipientUserIds: [user.id],
        type: PURCHASE_NOTIFICATION_TYPES.PURCHASE_PAYMENT_PENDING_APPROVAL,
        category: "PURCHASES",
        title: "Pago pendiente de aprobación",
        message: "Tu pago será ingresado tras aprobación.",
        priority: "NORMAL",
        sourceModule: "payments",
        sourceEntityType: "payment_document",
        sourceEntityId: input.poId ?? null,
        metadata: { poId: input.poId, showAsToast: true },
        showAsToast: true,
      });
    }

    return result;
  }

  @RequirePermissions("purchases.approve_payment")
  @Post(":id/approve")
  async approvePayment(
    @Param("id", ParseUUIDPipe) id: string,
    @CurrentUser() user: { id: string },
  ) {
    const existing = await this.paymentEntityRepo.findOne({ where: { id } });
    if (!existing) {
      return { type: "error", message: "Pago no encontrado" };
    }
    if (existing.status !== "PENDING_APPROVAL") {
      return { type: "error", message: "El pago no está pendiente de aprobación" };
    }

    existing.status = "APPROVED";
    existing.approvedByUserId = user.id;
    existing.approvedAt = new Date();
    await this.paymentEntityRepo.save(existing);

    if (existing.quotaId) {
      const quota = await this.creditQuotaRepo.findById(existing.quotaId);
      if (quota) {
        await this.creditQuotaRepo.updateTotalPaid(quota.quotaId, quota.totalPaid + Number(existing.amount));
        await this.creditQuotaRepo.updatePaymentDate(quota.quotaId, existing.date);
      }
    }

    if (existing.poId) {
      const purchase = await this.purchaseOrderRepo.findOne({
        where: { id: existing.poId },
        select: ["id", "approvalStatus"],
      });
      if (purchase?.approvalStatus === "PENDING") {
        await this.purchaseOrderRepo.update({ id: existing.poId }, { approvalStatus: "APPROVED" });
        const creationApproval = await this.approvalRequestRepo.findOne({
          where: {
            entityId: existing.poId,
            action: "PURCHASE_CREATION_WITH_PAYMENT",
            status: "PENDING",
          },
          order: { createdAt: "DESC" },
        });
        if (creationApproval) {
          creationApproval.status = "APPROVED";
          creationApproval.reviewedByUserId = user.id;
          creationApproval.reviewedAt = new Date();
          await this.approvalRequestRepo.save(creationApproval);
        }
      }

      await this.purchaseHistoryRepo.save(
        this.purchaseHistoryRepo.create({
          purchaseId: existing.poId,
          eventType: "PAYMENT_APPROVED",
          description: "Se aprobó un pago pendiente.",
          performedByUserId: user.id,
          targetUserId: existing.requestedByUserId ?? null,
          metadata: { paymentId: existing.id, amount: Number(existing.amount) },
        }),
      );
    }

    if (existing.requestedByUserId) {
      await this.notificationsService.createNotificationForUsers({
        recipientUserIds: [existing.requestedByUserId],
        type: PURCHASE_NOTIFICATION_TYPES.PURCHASE_PAYMENT_APPROVED,
        category: "PURCHASES",
        title: "Pago aprobado",
        message: "Tu pago fue aprobado.",
        priority: "NORMAL",
        actionUrl: existing.poId ? `/compras?purchaseId=${existing.poId}&modal=payments` : "/compras",
        actionLabel: "Ver pago",
        sourceModule: "payments",
        sourceEntityType: "payment_document",
        sourceEntityId: existing.id,
        metadata: { paymentId: existing.id, poId: existing.poId, showAsToast: true },
        showAsToast: true,
      });
    }

    return { type: "success", message: "Pago aprobado correctamente" };
  }

  @RequirePermissions("purchases.approve_payment")
  @Post(":id/reject")
  async rejectPayment(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() body: { reason?: string },
    @CurrentUser() user: { id: string },
  ) {
    const existing = await this.paymentEntityRepo.findOne({ where: { id } });
    if (!existing) {
      return { type: "error", message: "Pago no encontrado" };
    }
    if (existing.status !== "PENDING_APPROVAL") {
      return { type: "error", message: "El pago no está pendiente de aprobación" };
    }

    existing.status = "REJECTED";
    existing.rejectedByUserId = user.id;
    existing.rejectedAt = new Date();
    existing.rejectionReason = body?.reason?.trim() || null;
    await this.paymentEntityRepo.save(existing);

    if (existing.poId) {
      await this.purchaseHistoryRepo.save(
        this.purchaseHistoryRepo.create({
          purchaseId: existing.poId,
          eventType: "PAYMENT_REJECTED",
          description: "Se rechazó un pago pendiente.",
          performedByUserId: user.id,
          targetUserId: existing.requestedByUserId ?? null,
          metadata: { paymentId: existing.id, reason: existing.rejectionReason },
        }),
      );
    }

    if (existing.requestedByUserId) {
      await this.notificationsService.createNotificationForUsers({
        recipientUserIds: [existing.requestedByUserId],
        type: PURCHASE_NOTIFICATION_TYPES.PURCHASE_PAYMENT_REJECTED,
        category: "PURCHASES",
        title: "Pago rechazado",
        message: "Tu pago fue rechazado.",
        priority: "NORMAL",
        actionUrl: existing.poId ? `/compras?purchaseId=${existing.poId}&modal=payments` : "/compras",
        actionLabel: "Ver detalle",
        sourceModule: "payments",
        sourceEntityType: "payment_document",
        sourceEntityId: existing.id,
        metadata: {
          paymentId: existing.id,
          poId: existing.poId,
          reason: existing.rejectionReason,
          showAsToast: true,
        },
        showAsToast: true,
      });
    }

    return { type: "success", message: "Pago rechazado correctamente" };
  }

  @RequirePermissions("payments.read")
  @Get()
  list(@Query() query: HttpListPaymentsQueryDto) {
    return this.listPayments.execute(PaymentsHttpMapper.toListPaymentsInput({
      poId: query.poId,
      quotaId: query.quotaId,
      page: query.page,
      limit: query.limit,
    }));
  }

  @RequirePermissions("payments.read")
  @Get("get-by-po/:id")
  async listByPoId(@Param("id", ParseUUIDPipe) id: string, @CurrentUser() user: { id: string }) {
    const canApprovePayment = await this.accessControlService.userHasAllPermissions(user.id, ["purchases.approve_payment"]);
    const payments = await this.getPaymentsByPoId.execute({ poId: id });

    if (canApprovePayment) return payments;

    const purchase = await this.purchaseOrderRepo.findOne({
      where: { id },
      select: ["id", "approvalStatus"],
    });

    if (purchase?.approvalStatus === "PENDING") {
      return payments.filter((item) => item.status === "APPROVED");
    }

    return payments.filter((item) => item.status !== "REJECTED");
  }

  @RequirePermissions("payments.read")
  @Get(":id")
  getById(@Param("id", ParseUUIDPipe) id: string) {
    return this.getPayment.execute({ payDocId: id });
  }

  @RequirePermissions("payments.manage")
  @Delete(":id")
  remove(@Param("id", ParseUUIDPipe) id: string) {
    return this.deletePayment.execute(id);
  }
}
