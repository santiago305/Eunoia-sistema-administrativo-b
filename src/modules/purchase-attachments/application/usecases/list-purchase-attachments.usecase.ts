import { Inject, Injectable } from "@nestjs/common";
import {
  PURCHASE_ATTACHMENT_REPOSITORY,
  PurchaseAttachmentRepository,
} from "../../domain/ports/purchase-attachment.repository";
import { PurchaseAttachmentType } from "../../domain/value-objects/purchase-attachment-type";
import { PurchaseAttachmentOutput } from "../dtos/purchase-attachment.output";
import { PurchaseAttachmentOutputMapper } from "../mappers/purchase-attachment-output.mapper";

@Injectable()
export class ListPurchaseAttachmentsUsecase {
  constructor(
    @Inject(PURCHASE_ATTACHMENT_REPOSITORY)
    private readonly attachmentRepo: PurchaseAttachmentRepository,
  ) {}

  async execute(params: {
    purchaseId?: string;
    paymentId?: string;
    receptionId?: string;
    type?: PurchaseAttachmentType;
  }): Promise<PurchaseAttachmentOutput[]> {
    const rows = await this.attachmentRepo.list(params);
    return rows.map(PurchaseAttachmentOutputMapper.toOutput);
  }
}

