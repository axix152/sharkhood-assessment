import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Run, RunSchema } from './schemas/run.schema';
import {
  QuarantineRecord,
  QuarantineRecordSchema,
} from './schemas/quarantine-record.schema';
import { RunRepository } from './repositories/run.repository';
import { QuarantineRepository } from './repositories/quarantine.repository';
import {
  RUN_REPOSITORY,
  QUARANTINE_REPOSITORY,
} from '../core/ports/repository.ports';
import { RunsService } from './runs.service';
import { RunsController } from './runs.controller';
import { QueueModule } from '../queue/queue.module';
import { ProvidersModule } from '../providers/providers.module';

@Module({
  imports: [
    MongooseModule.forFeature(
      [
        { name: Run.name, schema: RunSchema },
        { name: QuarantineRecord.name, schema: QuarantineRecordSchema },
      ],
      'target',
    ),
    forwardRef(() => QueueModule),
    ProvidersModule,
  ],
  controllers: [RunsController],
  providers: [
    {
      provide: RUN_REPOSITORY,
      useClass: RunRepository,
    },
    {
      provide: QUARANTINE_REPOSITORY,
      useClass: QuarantineRepository,
    },
    RunRepository,
    QuarantineRepository,
    RunsService,
  ],
  exports: [RUN_REPOSITORY, QUARANTINE_REPOSITORY, RunsService],
})
export class RunsModule {}
