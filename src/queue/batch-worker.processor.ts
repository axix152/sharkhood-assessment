import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Inject, Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import {
  DATA_FACTORY_QUEUE,
  JOB_PROCESS_BATCH,
  JOB_DISPATCH_RUN,
  BatchJobPayload,
  DispatchRunJobPayload,
} from './queue.constants';
import { ProviderRegistry } from '../providers/provider-registry';
import {
  ILocationRepository,
  IRestaurantRepository,
  IMenuItemRepository,
  IRunRepository,
  IQuarantineRepository,
  LOCATION_REPOSITORY,
  RESTAURANT_REPOSITORY,
  MENU_ITEM_REPOSITORY,
  RUN_REPOSITORY,
  QUARANTINE_REPOSITORY,
} from '../core/ports/repository.ports';
import { PipelineRunner } from '../core/pipeline/pipeline-runner';
import { ValidationStep } from '../core/transform/validation.step';
import { MappingStep } from '../core/transform/mapping.step';
import { NormalizationStep } from '../core/transform/normalization.step';
import { DeduplicationStep } from '../core/transform/deduplication.step';
import { ProjectionStep } from '../core/transform/projection.step';
import { PipelineContext, QuarantinedItem } from '../core/pipeline/pipeline.types';
import { DomainLocation, DomainRestaurant, DomainMenuItem, RunStatus } from '../core/ports/models';
import { DispatcherService } from './dispatcher.service';

@Processor(DATA_FACTORY_QUEUE)
export class BatchWorkerProcessor extends WorkerHost {
  private readonly logger = new Logger(BatchWorkerProcessor.name);

  constructor(
    private readonly providerRegistry: ProviderRegistry,
    private readonly dispatcherService: DispatcherService,
    @Inject(LOCATION_REPOSITORY)
    private readonly locationRepo: ILocationRepository,
    @Inject(RESTAURANT_REPOSITORY)
    private readonly restaurantRepo: IRestaurantRepository,
    @Inject(MENU_ITEM_REPOSITORY)
    private readonly menuItemRepo: IMenuItemRepository,
    @Inject(RUN_REPOSITORY)
    private readonly runRepo: IRunRepository,
    @Inject(QUARANTINE_REPOSITORY)
    private readonly quarantineRepo: IQuarantineRepository,
  ) {
    super();
  }

  async process(job: Job): Promise<unknown> {
    switch (job.name) {
      case JOB_DISPATCH_RUN:
        return this.handleDispatchRun(job);

      case JOB_PROCESS_BATCH:
        return this.handleProcessBatch(job);

      default:
        this.logger.warn(`Unknown job name: ${job.name}`);
        return { status: 'ignored' };
    }
  }

  private async handleDispatchRun(job: Job<DispatchRunJobPayload>): Promise<unknown> {
    const { runId, provider, collections, batchSize, limit } = job.data;
    this.logger.log(`[Run ${runId}] Dispatching ingestion run for provider '${provider}'`);

    await this.runRepo.updateStatus(runId, RunStatus.RUNNING, {
      startedAt: new Date(),
    });

    try {
      const dispatchSummary = await this.dispatcherService.dispatch(
        runId,
        provider,
        collections,
        batchSize,
        limit,
      );

      this.logger.log(
        `[Run ${runId}] Dispatched ${dispatchSummary.totalBatches} batches across ${dispatchSummary.collections.length} collections`,
      );

      return dispatchSummary;
    } catch (err: any) {
      this.logger.error(`[Run ${runId}] Dispatch failed: ${err.message}`, err.stack);
      await this.runRepo.updateStatus(runId, RunStatus.FAILED);
      throw err; // Allow BullMQ retry according to backoff configuration
    }
  }

  private async handleProcessBatch(job: Job<BatchJobPayload>): Promise<unknown> {
    const { runId, provider, sourceCollection, batchNumber, rawDocuments } = job.data;

    this.logger.log(
      `[Run ${runId}] [Job ${job.id}] Processing batch #${batchNumber} (${rawDocuments.length} docs) for '${sourceCollection}'`,
    );

    const adapter = this.providerRegistry.get(provider);

    // Build the pure discrete transformation pipeline
    const pipeline = new PipelineRunner(
      [
        new ValidationStep(adapter),
        new MappingStep(adapter),
        new NormalizationStep(adapter),
        new DeduplicationStep(adapter),
        new ProjectionStep(adapter),
      ],
    );

    const validEntities: any[] = [];
    const quarantineRecords: QuarantinedItem[] = [];

    let readCount = 0;
    let transformedCount = 0;
    let failedCount = 0;

    for (const rawDoc of rawDocuments) {
      readCount++;

      const context: PipelineContext = {
        runId,
        jobId: String(job.id || 'direct'),
        provider,
        sourceCollection,
        sourceId: String(rawDoc._id?.$oid || rawDoc._id || Math.random().toString(36).slice(2)),
      };

      const result = await pipeline.processDocument(rawDoc, context);

      if (result.success) {
        transformedCount++;
        validEntities.push(result.entity);
      } else {
        failedCount++;
        quarantineRecords.push(result.quarantine);

        // Record error sample on the run document
        await this.runRepo.addErrorSample(runId, {
          sourceCollection,
          stage: result.quarantine.stage,
          reason: result.quarantine.reason,
          timestamp: new Date(),
        });
      }
    }

    // Persist quarantined records in the quarantine collection
    if (quarantineRecords.length > 0) {
      await this.quarantineRepo.createMany(
        quarantineRecords.map((q) => ({
          ...q,
          createdAt: new Date(),
        })),
      );
    }

    // Persist valid domain entities via domain repository ports
    let writtenCount = 0;
    let skippedCount = 0;

    if (validEntities.length > 0) {
      const writeResult = await this.persistDomainEntities(sourceCollection, validEntities);
      writtenCount = writeResult.written;
      skippedCount = writeResult.skipped;
    }

    // Atomically increment run counters
    await this.runRepo.incrementCounters(runId, sourceCollection, {
      read: readCount,
      transformed: transformedCount,
      written: writtenCount,
      skipped: skippedCount,
      failed: failedCount,
    });

    // Check if this run is complete and finalize timings
    await this.dispatcherService.checkAndFinalizeRun(runId);

    return {
      batchNumber,
      read: readCount,
      transformed: transformedCount,
      written: writtenCount,
      skipped: skippedCount,
      failed: failedCount,
    };
  }

  private async persistDomainEntities(
    collectionName: string,
    entities: any[],
  ): Promise<{ written: number; skipped: number }> {
    let written = 0;
    let skipped = 0;

    switch (collectionName) {
      case 'raw_locations': {
        // Flatten in case the projection is an array of locations
        const locations: DomainLocation[] = entities.flat();
        const res = await this.locationRepo.upsertMany(locations);
        written += res.written;
        skipped += res.skipped;
        break;
      }

      case 'raw_restaurants': {
        const restaurants: DomainRestaurant[] = entities.flat();
        const res = await this.restaurantRepo.upsertMany(restaurants);
        written += res.written;
        skipped += res.skipped;
        break;
      }

      case 'raw_menus': {
        // Entities are arrays of { restaurant, menuItems }
        const flattened = entities.flat();
        const restaurants: DomainRestaurant[] = [];
        const menuItems: DomainMenuItem[] = [];

        for (const item of flattened) {
          if (item.restaurant) restaurants.push(item.restaurant);
          if (item.menuItems && Array.isArray(item.menuItems)) {
            menuItems.push(...item.menuItems);
          }
        }

        if (restaurants.length > 0) {
          const restRes = await this.restaurantRepo.upsertMany(restaurants);
          written += restRes.written;
          skipped += restRes.skipped;
        }

        if (menuItems.length > 0) {
          const menuRes = await this.menuItemRepo.upsertMany(menuItems);
          written += menuRes.written;
          skipped += menuRes.skipped;
        }
        break;
      }
    }

    return { written, skipped };
  }
}
