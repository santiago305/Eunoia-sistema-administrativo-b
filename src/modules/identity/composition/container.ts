import { Provider } from "@nestjs/common";
import { DecolectaIdentityClient } from "../adapters/out/http/identity.client";
import { identityUsecasesProviders } from "../application/providers/identity-usecases.providers";
import { IDENTITY_LOOKUP_REPOSITORY } from "../domain/ports/identity-lookup.repository";

export const identityModuleProviders: Provider[] = [
  ...identityUsecasesProviders,
  { provide: IDENTITY_LOOKUP_REPOSITORY, useClass: DecolectaIdentityClient },
];
