import { Injectable, Inject, NotFoundException, Logger } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import {
  IRunRepository,
  IQuarantineRepository,
  RUN_REPOSITORY,
  QUARANTINE_REPOSITORY,
} from '../core/ports/repository.ports';
import { DomainRun, DomainQuarantineRecord, RunStatus } from '../core/ports/models';
import { DispatcherService } from '../queue/dispatcher.service';
import { ProviderRegistry } from '../providers/provider-registry';

export interface TriggerRunDto {
  provider?: string;
  collections?: string[];
  batchSize?: number;
  limit?: number;
}

@Injectable()
export class RunsService {
  private readonly logger = new Logger(RunsService.name);

  constructor(
    @Inject(RUN_REPOSITORY)
    private readonly runRepo: IRunRepository,
    @Inject(QUARANTINE_REPOSITORY)
    private readonly quarantineRepo: IQuarantineRepository,
    private readonly dispatcherService: DispatcherService,
    private readonly providerRegistry: ProviderRegistry,
  ) {}

  async triggerRun(dto: TriggerRunDto): Promise<{ runId: string; status: RunStatus; message: string }> {
    const provider = dto.provider || 'talabat';

    if (!this.providerRegistry.has(provider)) {
      throw new NotFoundException(
        `Provider '${provider}' is not supported. Available: [${this.providerRegistry.listProviders().join(', ')}]`,
      );
    }

    const runId = uuidv4();

    await this.runRepo.create({
      runId,
      provider,
      status: RunStatus.PENDING,
      options: {
        batchSize: dto.batchSize || 50,
        collections: dto.collections,
        limit: dto.limit,
      },
      counters: {
        read: 0,
        transformed: 0,
        written: 0,
        skipped: 0,
        failed: 0,
      },
      collectionCounters: {},
      errorsSample: [],
    });

    await this.dispatcherService.enqueueRun({
      runId,
      provider,
      collections: dto.collections,
      batchSize: dto.batchSize,
      limit: dto.limit,
    });

    this.logger.log(`[Run ${runId}] Ingestion run created and enqueued for provider '${provider}'`);

    return {
      runId,
      status: RunStatus.PENDING,
      message: `Ingestion run '${runId}' has been queued.`,
    };
  }

  async getRun(runId: string): Promise<DomainRun> {
    const run = await this.runRepo.findByRunId(runId);
    if (!run) {
      throw new NotFoundException(`Run with ID '${runId}' was not found.`);
    }
    return run;
  }

  async getRunErrors(
    runId: string,
    options: { page?: number; limit?: number; stage?: string } = {},
  ): Promise<{ data: DomainQuarantineRecord[]; total: number; page: number; limit: number }> {
    // Validate run existence first
    await this.getRun(runId);

    return this.quarantineRepo.findByRunId(runId, options);
  }
}
