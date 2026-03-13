import { Global, Module } from '@nestjs/common';
import { CatalogCopyService } from './catalog-copy.service';
import { CleanupService } from './cleanup.service';
import { NotifyService } from './notify.service';

@Global()
@Module({
  providers: [CatalogCopyService, CleanupService, NotifyService],
  exports: [CatalogCopyService, NotifyService],
})
export class SharedModule {}
