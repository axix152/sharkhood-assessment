import { PipelineStage } from './pipeline-stage.enum';

export interface PipelineContext {
  runId: string;
  jobId: string;
  provider: string;
  sourceCollection: string;
  sourceId: string;
}

export type StepResult<T> =
  | {
      success: true;
      data: T;
    }
  | {
      success: false;
      stage: PipelineStage;
      reason: string;
      errorDetails?: unknown;
    };

export interface QuarantinedItem {
  runId: string;
  jobId: string;
  provider: string;
  sourceCollection: string;
  sourceId: string;
  stage: PipelineStage;
  reason: string;
  rawPayload: unknown;
  errorDetails?: unknown;
}

export interface BatchProcessingStats {
  read: number;
  transformed: number;
  written: number;
  skipped: number;
  failed: number;
}
