import { Injectable } from "@nestjs/common";
import { CreateSourceUsecase } from "src/modules/sources/application/usecases/source/create.usecase";
import { normalizeTextForMatch } from "src/modules/excel/application/orders-import/normalization";
import { TransactionContext } from "src/shared/domain/ports/unit-of-work.port";

@Injectable()
export class SaleOrderImportSourceResolverService {
  constructor(private readonly createSourceUsecase: CreateSourceUsecase) {}

  async resolveOrCreate(internalNote: string | null | undefined, tx: TransactionContext): Promise<string> {
    const sourceName = this.getSourceName(internalNote);
    return this.createSourceUsecase.executeInTransaction(
      { name: sourceName, detail: sourceName, isActive: true },
      tx,
    );
  }

  async resolveOrCreateByName(sourceName: string, tx: TransactionContext): Promise<string> {
    return this.createSourceUsecase.executeInTransaction(
      { name: sourceName, detail: sourceName, isActive: true },
      tx,
    );
  }

  private getSourceName(note: unknown) {
    const text = normalizeTextForMatch(note);
    const tokens = text.split(/[\s,.;:_\-]+/).filter(Boolean);

    let sourceName = "SIN CODIGO";

    if (tokens.includes("whatsapp") || tokens.includes("wsp") || tokens.includes("wa")) {
      sourceName = "WHATSAPP";
    } else if (tokens.includes("instagram") || tokens.includes("ig")) {
      sourceName = "INSTAGRAM";
    } else if (tokens.includes("facebook") || tokens.includes("fb")) {
      sourceName = "FACEBOOK";
    } else if (tokens.includes("shopify")) {
      sourceName = "SHOPIFY";
    } else if (tokens.includes("organico") || tokens.includes("org")) {
      sourceName = "ORGANICO";
    }

    return sourceName;
  }
}
