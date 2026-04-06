import { Provider } from "@nestjs/common";
import { FILE_STORAGE } from "src/shared/application/ports/file-storage.port";
import { IMAGE_PROCESSOR } from "src/shared/application/ports/image-processor.port";
import { LocalFileStorageService } from "src/shared/utilidades/services/local-file-storage.service";
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
    provide: FILE_STORAGE,
    useClass: LocalFileStorageService,
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
