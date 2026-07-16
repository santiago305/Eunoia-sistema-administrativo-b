import { CanActivate, ExecutionContext, ForbiddenException, Inject, Injectable } from "@nestjs/common";
import { AccessControlService } from "src/modules/access-control/application/services/access-control.service";
import {
  COMPANY_REPOSITORY,
  CompanyRepository,
} from "src/modules/companies/domain/ports/company.repository";

@Injectable()
export class FirstCompanyCreationGuard implements CanActivate {
  constructor(
    @Inject(COMPANY_REPOSITORY)
    private readonly companyRepo: CompanyRepository,
    private readonly accessControlService: AccessControlService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const company = await this.companyRepo.findSingle();
    if (!company) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user as { id?: string; sub?: string } | undefined;
    const userId = user?.id || user?.sub;

    if (!userId) {
      throw new ForbiddenException("Usuario no autenticado");
    }

    const allowed = await this.accessControlService.userHasAllPermissions(userId, ["company.manage"]);
    if (!allowed) {
      throw new ForbiddenException("Acceso denegado: permisos insuficientes");
    }

    return true;
  }
}
