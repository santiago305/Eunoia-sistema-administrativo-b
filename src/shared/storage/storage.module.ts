import { Global, Module } from '@nestjs/common';
import { FILE_STORAGE } from 'src/shared/application/ports/file-storage.port';
import { LocalFileStorageService } from 'src/shared/utilidades/services/local-file-storage.service';

@Global()
@Module({
  providers: [{ provide: FILE_STORAGE, useClass: LocalFileStorageService }],
  exports: [FILE_STORAGE],
})
export class StorageModule {}
