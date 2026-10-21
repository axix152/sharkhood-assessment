import { IPipelineStep } from '../pipeline/pipeline-step.interface';
import { PipelineStage } from '../pipeline/pipeline-stage.enum';
import { PipelineContext, StepResult } from '../pipeline/pipeline.types';
import { IProviderAdapter } from '../../providers/provider-adapter.interface';

export class MappingStep implements IPipelineStep<unknown, unknown[]> {
  readonly stage = PipelineStage.MAPPING;
  readonly name = 'MappingStep';

  constructor(private readonly adapter: IProviderAdapter) {}

  execute(rawDocument: unknown, context: PipelineContext): StepResult<unknown[]> {
    try {
      const rawItems = this.adapter.extractItems(context.sourceCollection, rawDocument);

      if (!rawItems || rawItems.length === 0) {
        return {
          success: false,
          stage: this.stage,
          reason: 'No items could be extracted from raw document payload',
        };
      }

      const mappedItems = rawItems.map((item) =>
        this.adapter.mapFields(context.sourceCollection, item),
      );

      return {
        success: true,
        data: mappedItems,
      };
    } catch (err: any) {
      return {
        success: false,
        stage: this.stage,
        reason: `Mapping failed: ${err.message}`,
        errorDetails: err.stack,
      };
    }
  }
}
