import { BadRequestException, Body, Controller, Delete, Get, NotFoundException, Optional, Param, ParseUUIDPipe, Post, Query, Res, UploadedFile, UseGuards, UseInterceptors } from "@nestjs/common";
import type { Response } from "express";
import { FileInterceptor } from "@nestjs/platform-express";
import { memoryStorage } from "multer";
import { RequirePermissions } from "src/modules/access-control/adapters/in/decorators/require-permissions.decorator";
import { PermissionsGuard } from "src/modules/access-control/adapters/in/guards/permissions.guard";
import { JwtAuthGuard } from "src/modules/auth/adapters/in/guards/jwt-auth.guard";
import { CompanyConfiguredGuard } from "src/shared/utilidades/guards/company-configured.guard";
import { User as CurrentUser } from "src/shared/utilidades/decorators/user.decorator";
import { FILE_STORAGE, FileStorage } from "src/shared/application/ports/file-storage.port";
import { Inject } from "@nestjs/common";
import { IncomeFilterInput } from "../../../application/dtos/income-filter.input";
import { GetIncomeSummaryUsecase } from "../../../application/usecases/get-income-summary.usecase";
import { ListIncomeUsecase } from "../../../application/usecases/list-income.usecase";
import { GetIncomeEvidenceUsecase, UploadIncomeEvidenceUsecase } from "../../../application/usecases/get-income-evidence.usecase";
import { GetIncomeSearchStateUsecase } from "../../../application/usecases/income-search/get-state.usecase";
import { SaveIncomeSearchMetricUsecase } from "../../../application/usecases/income-search/save-metric.usecase";
import { DeleteIncomeSearchMetricUsecase } from "../../../application/usecases/income-search/delete-metric.usecase";
import { HttpCreateIncomeSearchMetricDto } from "../dtos/http-income-search-metric-create.dto";
import { sanitizeIncomeSearchSnapshot } from "../../../application/support/income-search.utils";

@Controller("income")
@UseGuards(JwtAuthGuard, CompanyConfiguredGuard, PermissionsGuard)
export class IncomeController {
  constructor(
    private readonly listIncome: ListIncomeUsecase,
    private readonly getSummary: GetIncomeSummaryUsecase,
    private readonly getEvidence: GetIncomeEvidenceUsecase,
    private readonly uploadEvidence: UploadIncomeEvidenceUsecase,
    @Inject(FILE_STORAGE) private readonly fileStorage: FileStorage,
    @Optional() private readonly getSearchState?: GetIncomeSearchStateUsecase,
    @Optional() private readonly saveSearchMetric?: SaveIncomeSearchMetricUsecase,
    @Optional() private readonly deleteSearchMetric?: DeleteIncomeSearchMetricUsecase,
  ) {}

  @RequirePermissions("income.read")
  @Get()
  list(@Query() query: IncomeFilterInput, @CurrentUser() user: { id: string }) {
    return this.listIncome.execute({ ...query, requestedBy: user?.id });
  }

  @RequirePermissions("income.read")
  @Get("search-state")
  getSearchStateForUser(@CurrentUser() user: { id: string }) {
    return this.getSearchState?.execute(user.id);
  }

  @RequirePermissions("income.read")
  @Post("search-metrics")
  saveMetric(@Body() dto: HttpCreateIncomeSearchMetricDto, @CurrentUser() user: { id: string }) {
    return this.saveSearchMetric?.execute({
      userId: user.id,
      name: dto.name,
      snapshot: sanitizeIncomeSearchSnapshot({
        q: dto.snapshot?.q,
        filters: dto.snapshot?.filters,
      }),
    });
  }

  @RequirePermissions("income.read")
  @Delete("search-metrics/:metricId")
  deleteMetric(@Param("metricId", ParseUUIDPipe) metricId: string, @CurrentUser() user: { id: string }) {
    return this.deleteSearchMetric?.execute(user.id, metricId);
  }

  @RequirePermissions("income.read")
  @Get("summary")
  summary(@Query() query: IncomeFilterInput) {
    return this.getSummary.execute(query);
  }

  @RequirePermissions("income.read", "payments.view_evidence")
  @Get(":incomeId/evidence")
  evidence(@Param("incomeId", ParseUUIDPipe) incomeId: string) {
    return this.getEvidence.execute(incomeId);
  }

  @RequirePermissions("income.read", "payments.view_evidence")
  @Get(":incomeId/evidence/content")
  async evidenceContent(@Param("incomeId", ParseUUIDPipe) incomeId: string, @Res() response: Response) {
    const evidence = await this.getEvidence.execute(incomeId);
    if (!evidence.url || /^https?:\/\//i.test(evidence.url)) throw new NotFoundException("Contenido de evidencia no disponible");
    const content = await this.fileStorage.read(evidence.url);
    response.setHeader("Content-Type", evidence.mimeType ?? "image/jpeg");
    response.setHeader("Content-Length", content.byteLength);
    response.setHeader("Content-Disposition", "inline");
    response.setHeader("Cross-Origin-Resource-Policy", "cross-origin");
    response.setHeader("Cache-Control", "private, no-store");
    response.send(content);
  }

  @RequirePermissions("income.read", "payments.attach_evidence")
  @Post(":incomeId/evidence")
  @UseInterceptors(FileInterceptor("file", {
    storage: memoryStorage(),
    limits: { fileSize: 15 * 1024 * 1024 },
    fileFilter: (_req, file, cb) => {
      if (!["image/jpeg", "image/png", "image/webp"].includes(file.mimetype)) {
        return cb(new BadRequestException("Solo se permiten imagenes JPEG, PNG o WEBP"), false);
      }
      cb(null, true);
    },
  }))
  uploadEvidenceFile(
    @Param("incomeId", ParseUUIDPipe) incomeId: string,
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser() user: { id: string },
  ) {
    return this.uploadEvidence.execute(incomeId, file, user.id);
  }
}
