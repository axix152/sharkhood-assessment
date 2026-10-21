import { Module } from '@nestjs/common';
import { RawSourceRepository } from './repositories/raw-source.repository';
import { RAW_SOURCE_REPOSITORY } from '../../core/ports/repository.ports';

@Module({
  providers: [
    {
      provide: RAW_SOURCE_REPOSITORY,
      useClass: RawSourceRepository,
    },
    RawSourceRepository,
  ],
  exports: [RAW_SOURCE_REPOSITORY, RawSourceRepository],
})
export class RawModule {}
