import { Module, forwardRef } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { DATA_FACTORY_QUEUE } from './queue.constants';
import { DispatcherService } from './dispatcher.service';
import { BatchWorkerProcessor } from './batch-worker.processor';
import { LocationsModule } from '../domain/locations/locations.module';
import { RestaurantsModule } from '../domain/restaurants/restaurants.module';
import { MenusModule } from '../domain/menus/menus.module';
import { RawModule } from '../domain/raw/raw.module';
import { RunsModule } from '../runs/runs.module';
import { ProvidersModule } from '../providers/providers.module';

@Module({
  imports: [
    BullModule.registerQueue({
      name: DATA_FACTORY_QUEUE,
    }),
    LocationsModule,
    RestaurantsModule,
    MenusModule,
    RawModule,
    forwardRef(() => RunsModule),
    ProvidersModule,
  ],
  providers: [DispatcherService, BatchWorkerProcessor],
  exports: [DispatcherService],
})
export class QueueModule {}
