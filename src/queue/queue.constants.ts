export const DATA_FACTORY_QUEUE = 'data-factory-queue';
export const DATA_FACTORY_DLQ = 'data-factory-dlq';

export const JOB_DISPATCH_RUN = 'dispatch-run';
export const JOB_PROCESS_BATCH = 'process-batch';

export interface BatchJobPayload {
  runId: string;
  provider: string;
  sourceCollection: string;
  batchNumber: number;
  totalBatchesEstimated?: number;
  rawDocuments: any[];
}

export interface DispatchRunJobPayload {
  runId: string;
  provider: string;
  collections?: string[];
  batchSize?: number;
  limit?: number;
}
