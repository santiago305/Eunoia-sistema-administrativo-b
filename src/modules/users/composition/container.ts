import { Provider } from "@nestjs/common";
import { IMAGE_PROCESSOR } from "src/shared/application/ports/image-processor.port";
import { SharpImageProcessorService } from "src/shared/utilidades/services/sharp-image-processor.service";
import { TypeormUserReadRepository } from "../adapters/out/persistence/typeorm/repositories/typeorm-user-read.repository";
import { TypeormUserRepository } from "../adapters/out/persistence/typeorm/repositories/typeorm-user.repository";
import { USER_READ_REPOSITORY } from "../application/ports/user-read.repository";
import { USER_REPOSITORY } from "../application/ports/user.repository";
import { usersUsecasesProviders } from "../application/providers/users-usecases.providers";

export const usersModuleProviders: Provider[] = [
  ...usersUsecasesProviders,
  {
    provide: IMAGE_PROCESSOR,
    useClass: SharpImageProcessorService,
  },
  {
    provide: USER_REPOSITORY,
    useClass: TypeormUserRepository,
  },
  {
    provide: USER_READ_REPOSITORY,
    useClass: TypeormUserReadRepository,
  },
];
