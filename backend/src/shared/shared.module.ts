import { Global, Module } from '@nestjs/common';
import { CatalogCopyService } from './catalog-copy.service';

@Global()
@Module({
  providers: [CatalogCopyService],
  exports: [CatalogCopyService],
})
export class SharedModule {}
