import { PartialType } from "@nestjs/mapped-types";
import { HttpCreateCompanyDto } from "./http-company-create.dto";

export class HttpUpdateCompanyDto extends PartialType(HttpCreateCompanyDto) {}
