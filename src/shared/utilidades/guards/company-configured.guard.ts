import {
  CanActivate,
  ConflictException,
  ExecutionContext,
  Inject,
  Injectable,
} from "@nestjs/common";
import {
  COMPANY_REPOSITORY,
  CompanyRepository,
} from "src/modules/companies/domain/ports/company.repository";

const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

@Injectable()
export class CompanyConfiguredGuard implements CanActivate {
  constructor(
    @Inject(COMPANY_REPOSITORY)
    private readonly companyRepo: CompanyRepository,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<{ method?: string }>();
    const method = String(request?.method ?? "GET").toUpperCase();

    if (SAFE_METHODS.has(method)) {
      return true;
    }

    const company = await this.companyRepo.findSingle();
    if (company) {
      return true;
    }

    throw new ConflictException(
      "Debe registrar la empresa antes de realizar operaciones administrativas.",
    );
  }
}
