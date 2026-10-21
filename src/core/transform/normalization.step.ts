import { IPipelineStep } from '../pipeline/pipeline-step.interface';
import { PipelineStage } from '../pipeline/pipeline-stage.enum';
import { PipelineContext, StepResult } from '../pipeline/pipeline.types';
import { IProviderAdapter } from '../../providers/provider-adapter.interface';

export class NormalizationStep implements IPipelineStep<unknown[], unknown[]> {
  readonly stage = PipelineStage.NORMALIZATION;
  readonly name = 'NormalizationStep';

  constructor(private readonly adapter: IProviderAdapter) {}

  execute(mappedItems: unknown[], context: PipelineContext): StepResult<unknown[]> {
    try {
      const normalizedItems = mappedItems.map((item) =>
        this.adapter.normalize(context.sourceCollection, item),
      );

      return {
        success: true,
        data: normalizedItems,
      };
    } catch (err: any) {
      return {
        success: false,
        stage: this.stage,
        reason: `Normalization failed: ${err.message}`,
        errorDetails: err.stack,
      };
    }
  }
}
