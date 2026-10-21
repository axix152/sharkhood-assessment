import { IPipelineStep } from './pipeline-step.interface';
import { PipelineContext, QuarantinedItem, StepResult } from './pipeline.types';

export class PipelineRunner<TRaw, TDomain> {
  constructor(
    private readonly steps: Array<IPipelineStep<any, any>>,
  ) {}

  async processDocument(
    rawInput: TRaw,
    context: PipelineContext,
  ): Promise<
    | { success: true; entity: TDomain }
    | { success: false; quarantine: QuarantinedItem }
  > {
    let currentData: any = rawInput;

    for (const step of this.steps) {
      try {
        const result: StepResult<any> = await step.execute(currentData, context);

        if (!result.success) {
          return {
            success: false,
            quarantine: {
              runId: context.runId,
              jobId: context.jobId,
              provider: context.provider,
              sourceCollection: context.sourceCollection,
              sourceId: context.sourceId,
              stage: result.stage,
              reason: result.reason,
              rawPayload: rawInput,
              errorDetails: result.errorDetails,
            },
          };
        }

        currentData = result.data;
      } catch (err: any) {
        return {
          success: false,
          quarantine: {
            runId: context.runId,
            jobId: context.jobId,
            provider: context.provider,
            sourceCollection: context.sourceCollection,
            sourceId: context.sourceId,
            stage: step.stage,
            reason: `Unhandled exception in pipeline step '${step.name}': ${err.message}`,
            rawPayload: rawInput,
            errorDetails: err.stack,
          },
        };
      }
    }

    return {
      success: true,
      entity: currentData as TDomain,
    };
  }
}
