import { Global, Module } from '@nestjs/common';
import { CatalogCopyService } from './catalog-copy.service';
import { CleanupService } from './cleanup.service';

@Global()
@Module({
  providers: [CatalogCopyService, CleanupService],
  exports: [CatalogCopyService],
})
export class SharedModule {}
