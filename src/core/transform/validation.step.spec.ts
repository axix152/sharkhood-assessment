import { ValidationStep } from './validation.step';
import { PipelineStage } from '../pipeline/pipeline-stage.enum';
import { PipelineContext } from '../pipeline/pipeline.types';
import { TalabatAdapter } from '../../providers/talabat/talabat.adapter';

describe('ValidationStep', () => {
  let step: ValidationStep;
  let adapter: TalabatAdapter;
  const dummyContext: PipelineContext = {
    runId: 'run-123',
    jobId: 'job-1',
    provider: 'talabat',
    sourceCollection: 'raw_menus',
    sourceId: 'doc-001',
  };

  beforeEach(() => {
    adapter = new TalabatAdapter();
    step = new ValidationStep(adapter);
  });

  it('should pass validation for a well-formed raw menu document', () => {
    const validDoc = {
      statusCode: 200,
      payload: {
        results: [
          {
            id: 1400,
            outletCode: 34807,
            name: 'Little Bangkok',
            category: [],
          },
        ],
      },
    };

    const result = step.execute(validDoc, dummyContext);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toBe(validDoc);
    }
  });

  it('should quarantine document with scraper error: "This is not restaurant page (Talabat)."', () => {
    const scraperErrorDoc = {
      statusCode: 200,
      payload: {
        request_log: { statusCode: 200 },
        Message: 'This is not restaurant page (Talabat).',
      },
    };

    const result = step.execute(scraperErrorDoc, dummyContext);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.stage).toBe(PipelineStage.VALIDATION);
      expect(result.reason).toContain('This is not restaurant page (Talabat).');
    }
  });

  it('should quarantine document with pagination error: "Page limit exceeded."', () => {
    const paginationErrorDoc = {
      statusCode: 200,
      payload: {
        'Total Page': 1,
        'Page Error Message': 'Page limit exceeded.',
        results: [],
      },
    };

    const result = step.execute(paginationErrorDoc, {
      ...dummyContext,
      sourceCollection: 'raw_restaurants',
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.stage).toBe(PipelineStage.VALIDATION);
      expect(result.reason).toContain('Page limit exceeded.');
    }
  });

  it('should quarantine document with HTTP non-200 statusCode', () => {
    const errorStatusDoc = {
      statusCode: 500,
      payload: {
        results: [],
      },
    };

    const result = step.execute(errorStatusDoc, dummyContext);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.stage).toBe(PipelineStage.VALIDATION);
    }
  });

  it('should quarantine null or undefined document', () => {
    const result = step.execute(null, dummyContext);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.stage).toBe(PipelineStage.VALIDATION);
      expect(result.reason).toContain('Document is null, undefined');
    }
  });
});
