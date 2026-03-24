import { CompanyId } from "../value-objects/company-id.vo";
import { CompanyEmail } from "../value-objects/company-email.vo";
import { CompanyName } from "../value-objects/company-name.vo";
import { CompanyPhone } from "../value-objects/company-phone.vo";
import { CompanyRuc } from "../value-objects/company-ruc.vo";
import { UpdateCompanyParams } from "../types/update-company.params";
import { CreateCompanyParams } from "../types/create-company.params";

export class Company {
  constructor(
    public readonly companyId: string | undefined,
    public readonly name: string,
    public readonly ruc: string,
    public readonly ubigeo?: string,
    public readonly department?: string,
    public readonly province?: string,
    public readonly district?: string,
    public readonly urbanization?: string,
    public readonly address?: string,
    public readonly phone?: string,
    public readonly email?: string,
    public readonly codLocal?: string,
    public readonly solUser?: string,
    public readonly solPass?: string,
    public readonly logoPath?: string,
    public readonly certPath?: string,
    public readonly production: boolean = true,
    public readonly isActive: boolean = true,
    public readonly createdAt?: Date,
    public readonly updatedAt?: Date,
  ) {
    const normalizedCompanyId = companyId ? new CompanyId(companyId).value : undefined;
    const normalizedName = new CompanyName(name).value;
    const normalizedRuc = new CompanyRuc(ruc).value;
    const normalizedEmail = email ? new CompanyEmail(email).value : undefined;
    const normalizedPhone = phone ? new CompanyPhone(phone).value : undefined;

    this.companyId = normalizedCompanyId;
    this.name = normalizedName;
    this.ruc = normalizedRuc;
    this.ubigeo = ubigeo;
    this.department = department;
    this.province = province;
    this.district = district;
    this.urbanization = urbanization;
    this.address = address;
    this.phone = normalizedPhone;
    this.email = normalizedEmail;
    this.codLocal = codLocal;
    this.solUser = solUser;
    this.solPass = solPass;
    this.logoPath = logoPath;
    this.certPath = certPath;
    this.production = production;
    this.isActive = isActive;
    this.createdAt = createdAt;
    this.updatedAt = updatedAt;
  }

  static create(params: CreateCompanyParams): Company {
    const name = new CompanyName(params.name);
    const ruc = new CompanyRuc(params.ruc);
    const email = params.email ? new CompanyEmail(params.email) : undefined;

    const now = new Date();

    return new Company(
      undefined,
      name.value,
      ruc.value,
      params.ubigeo,
      params.department,
      params.province,
      params.district,
      params.urbanization,
      params.address,
      params.phone,
      email?.value,
      params.codLocal,
      params.solUser,
      params.solPass,
      params.logoPath,
      params.certPath,
      params.production ?? true,
      params.isActive ?? true,
      now,
      now,
    );
  }

  static reconstitute(params: {
    companyId: string;
    name: string;
    ruc: string;
    ubigeo?: string;
    department?: string;
    province?: string;
    district?: string;
    urbanization?: string;
    address?: string;
    phone?: string;
    email?: string;
    codLocal?: string;
    solUser?: string;
    solPass?: string;
    logoPath?: string;
    certPath?: string;
    production: boolean;
    isActive: boolean;
    createdAt?: Date;
    updatedAt?: Date;
  }): Company {
    return new Company(
      params.companyId,
      params.name,
      params.ruc,
      params.ubigeo,
      params.department,
      params.province,
      params.district,
      params.urbanization,
      params.address,
      params.phone,
      params.email,
      params.codLocal,
      params.solUser,
      params.solPass,
      params.logoPath,
      params.certPath,
      params.production,
      params.isActive,
      params.createdAt,
      params.updatedAt,
    );
  }

  update(params: UpdateCompanyParams): Company {
    const nextName = params.name ? new CompanyName(params.name).value : this.name;
    const nextRuc = params.ruc ? new CompanyRuc(params.ruc).value : this.ruc;
    const nextEmail = params.email
      ? new CompanyEmail(params.email).value
      : params.email === undefined
        ? this.email
        : undefined;

    return new Company(
      this.companyId,
      nextName,
      nextRuc,
      params.ubigeo ?? this.ubigeo,
      params.department ?? this.department,
      params.province ?? this.province,
      params.district ?? this.district,
      params.urbanization ?? this.urbanization,
      params.address ?? this.address,
      params.phone ?? this.phone,
      nextEmail,
      params.codLocal ?? this.codLocal,
      params.solUser ?? this.solUser,
      params.solPass ?? this.solPass,
      params.logoPath ?? this.logoPath,
      params.certPath ?? this.certPath,
      params.production ?? this.production,
      params.isActive ?? this.isActive,
      this.createdAt,
      new Date(),
    );
  }
}
