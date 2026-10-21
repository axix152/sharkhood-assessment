import { Injectable, Inject, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { ConfigService } from '@nestjs/config';
import {
  DATA_FACTORY_QUEUE,
  JOB_PROCESS_BATCH,
  JOB_DISPATCH_RUN,
  BatchJobPayload,
  DispatchRunJobPayload,
} from './queue.constants';
import {
  IRawSourceRepository,
  IRunRepository,
  RAW_SOURCE_REPOSITORY,
  RUN_REPOSITORY,
} from '../core/ports/repository.ports';
import { ProviderRegistry } from '../providers/provider-registry';
import { RunStatus } from '../core/ports/models';

@Injectable()
export class DispatcherService {
  private readonly logger = new Logger(DispatcherService.name);
  private readonly runJobCounts = new Map<string, { dispatched: number; completed: number }>();

  constructor(
    @InjectQueue(DATA_FACTORY_QUEUE)
    private readonly queue: Queue,
    @Inject(RAW_SOURCE_REPOSITORY)
    private readonly rawSourceRepo: IRawSourceRepository,
    @Inject(RUN_REPOSITORY)
    private readonly runRepo: IRunRepository,
    private readonly providerRegistry: ProviderRegistry,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Enqueues the initial dispatch job onto BullMQ.
   */
  async enqueueRun(payload: DispatchRunJobPayload): Promise<void> {
    await this.queue.add(JOB_DISPATCH_RUN, payload, {
      attempts: this.configService.get<number>('app.QUEUE_MAX_ATTEMPTS', 3),
      backoff: {
        type: 'exponential',
        delay: this.configService.get<number>('app.QUEUE_BACKOFF_DELAY_MS', 2000),
      },
      removeOnComplete: 1000,
      removeOnFail: 1000,
    });
  }

  /**
   * Reads raw collections with a streaming cursor and enqueues batch jobs.
   * Does NOT load collections into memory.
   */
  async dispatch(
    runId: string,
    provider: string,
    collectionsFilter?: string[],
    batchSizeOverride?: number,
    limit?: number,
  ): Promise<{ totalBatches: number; collections: string[] }> {
    const adapter = this.providerRegistry.get(provider);
    const batchSize =
      batchSizeOverride || this.configService.get<number>('app.BATCH_SIZE', 50);

    const targetCollections = adapter.supportedCollections
      .map((c) => c.collectionName)
      .filter((c) => !collectionsFilter || collectionsFilter.includes(c));

    let totalBatches = 0;
    this.runJobCounts.set(runId, { dispatched: 0, completed: 0 });

    for (const collectionName of targetCollections) {
      this.logger.log(
        `[Run ${runId}] Streaming cursor for raw collection '${collectionName}' (batch size: ${batchSize})`,
      );

      let batchNumber = 0;
      const batchIterator = this.rawSourceRepo.streamBatches(
        collectionName,
        batchSize,
        {},
        limit,
      );

      for await (const rawDocs of batchIterator) {
        batchNumber++;
        totalBatches++;

        const jobPayload: BatchJobPayload = {
          runId,
          provider,
          sourceCollection: collectionName,
          batchNumber,
          rawDocuments: rawDocs,
        };

        await this.queue.add(JOB_PROCESS_BATCH, jobPayload, {
          attempts: this.configService.get<number>('app.QUEUE_MAX_ATTEMPTS', 3),
          backoff: {
            type: 'exponential',
            delay: this.configService.get<number>('app.QUEUE_BACKOFF_DELAY_MS', 2000),
          },
          removeOnComplete: 1000,
          removeOnFail: 1000,
        });

        const counts = this.runJobCounts.get(runId)!;
        counts.dispatched++;
      }

      this.logger.log(
        `[Run ${runId}] Enqueued ${batchNumber} batch jobs for collection '${collectionName}'`,
      );
    }

    if (totalBatches === 0) {
      // Empty run edge case
      await this.runRepo.updateStatus(runId, RunStatus.COMPLETED, {
        completedAt: new Date(),
        durationMs: 0,
      });
    }

    return { totalBatches, collections: targetCollections };
  }

  async checkAndFinalizeRun(runId: string): Promise<void> {
    const counts = this.runJobCounts.get(runId);
    if (!counts) return;

    counts.completed++;

    if (counts.completed >= counts.dispatched && counts.dispatched > 0) {
      const run = await this.runRepo.findByRunId(runId);
      if (run && run.status === RunStatus.RUNNING) {
        const completedAt = new Date();
        const startedAt = run.startedAt ? new Date(run.startedAt) : completedAt;
        const durationMs = completedAt.getTime() - startedAt.getTime();

        await this.runRepo.updateStatus(runId, RunStatus.COMPLETED, {
          completedAt,
          durationMs,
        });

        this.logger.log(
          `[Run ${runId}] Finalized! Status: COMPLETED, Duration: ${durationMs}ms, ` +
          `Read: ${run.counters.read}, Written: ${run.counters.written}, Failed: ${run.counters.failed}`,
        );

        this.runJobCounts.delete(runId);
      }
    }
  }
}
