import { IPipelineStep } from '../pipeline/pipeline-step.interface';
import { PipelineStage } from '../pipeline/pipeline-stage.enum';
import { PipelineContext, StepResult } from '../pipeline/pipeline.types';
import { IProviderAdapter } from '../../providers/provider-adapter.interface';

export class ValidationStep implements IPipelineStep<unknown, unknown> {
  readonly stage = PipelineStage.VALIDATION;
  readonly name = 'ValidationStep';

  constructor(private readonly adapter: IProviderAdapter) {}

  execute(rawDocument: unknown, context: PipelineContext): StepResult<unknown> {
    const outcome = this.adapter.validateRaw(context.sourceCollection, rawDocument);

    if (!outcome.isValid) {
      return {
        success: false,
        stage: this.stage,
        reason: outcome.reason || 'Document failed boundary validation',
        errorDetails: outcome.errorDetails,
      };
    }

    return {
      success: true,
      data: rawDocument,
    };
  }
}
