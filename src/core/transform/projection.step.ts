import { IPipelineStep } from '../pipeline/pipeline-step.interface';
import { PipelineStage } from '../pipeline/pipeline-stage.enum';
import { PipelineContext, StepResult } from '../pipeline/pipeline.types';
import { IProviderAdapter } from '../../providers/provider-adapter.interface';

export class ProjectionStep implements IPipelineStep<unknown[], unknown[]> {
  readonly stage = PipelineStage.PROJECTION;
  readonly name = 'ProjectionStep';

  constructor(private readonly adapter: IProviderAdapter) {}

  execute(deduplicatedItems: unknown[], context: PipelineContext): StepResult<unknown[]> {
    try {
      const projected = deduplicatedItems.map((item) =>
        this.adapter.project(context.sourceCollection, item),
      );

      return {
        success: true,
        data: projected,
      };
    } catch (err: any) {
      return {
        success: false,
        stage: this.stage,
        reason: `Projection failed: ${err.message}`,
        errorDetails: err.stack,
      };
    }
  }
}
