import { IPipelineStep } from '../pipeline/pipeline-step.interface';
import { PipelineStage } from '../pipeline/pipeline-stage.enum';
import { PipelineContext, StepResult } from '../pipeline/pipeline.types';
import { IProviderAdapter } from '../../providers/provider-adapter.interface';

export class DeduplicationStep implements IPipelineStep<unknown[], unknown[]> {
  readonly stage = PipelineStage.DEDUPLICATION;
  readonly name = 'DeduplicationStep';

  constructor(private readonly adapter: IProviderAdapter) {}

  execute(normalizedItems: unknown[], context: PipelineContext): StepResult<unknown[]> {
    try {
      const seenKeys = new Set<string>();
      const deduplicated: unknown[] = [];

      for (const item of normalizedItems) {
        const key = this.adapter.getNaturalKey(context.sourceCollection, item);

        if (!seenKeys.has(key)) {
          seenKeys.add(key);
          deduplicated.push(item);
        }
      }

      return {
        success: true,
        data: deduplicated,
      };
    } catch (err: any) {
      return {
        success: false,
        stage: this.stage,
        reason: `Deduplication failed: ${err.message}`,
        errorDetails: err.stack,
      };
    }
  }
}
