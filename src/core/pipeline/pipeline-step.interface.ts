import { PipelineStage } from './pipeline-stage.enum';
import { PipelineContext, StepResult } from './pipeline.types';

export interface IPipelineStep<TIn, TOut> {
  readonly stage: PipelineStage;
  readonly name: string;
  execute(input: TIn, context: PipelineContext): StepResult<TOut> | Promise<StepResult<TOut>>;
}
