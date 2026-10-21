import { MappingStep } from './mapping.step';
import { PipelineStage } from '../pipeline/pipeline-stage.enum';
import { PipelineContext } from '../pipeline/pipeline.types';
import { TalabatAdapter } from '../../providers/talabat/talabat.adapter';

describe('MappingStep', () => {
  let step: MappingStep;
  let adapter: TalabatAdapter;
  const dummyContext: PipelineContext = {
    runId: 'run-123',
    jobId: 'job-1',
    provider: 'talabat',
    sourceCollection: 'raw_locations',
    sourceId: 'doc-002',
  };

  beforeEach(() => {
    adapter = new TalabatAdapter();
    step = new MappingStep(adapter);
  });

  it('should extract and map location items using declarative field mapping', () => {
    const rawLocationDoc = {
      statusCode: 200,
      payload: {
        results: [
          {
            location_name: 'Dubai World Trade Center - DWTC',
            location_slug: 'dubai-world-trade-center-dwtc',
            location_id: 1280,
          },
          {
            location_name: 'Al Zaab',
            location_slug: 'al-zaab',
            location_id: 1468,
          },
        ],
      },
    };

    const result = step.execute(rawLocationDoc, dummyContext);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toHaveLength(2);
      expect(result.data[0]).toEqual({
        name: 'Dubai World Trade Center - DWTC',
        slug: 'dubai-world-trade-center-dwtc',
        providerLocationId: '1280',
      });
    }
  });

  it('should fail with reason when results array is empty', () => {
    const emptyDoc = {
      statusCode: 200,
      payload: {
        results: [],
      },
    };

    const result = step.execute(emptyDoc, dummyContext);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.stage).toBe(PipelineStage.MAPPING);
      expect(result.reason).toContain('No items could be extracted');
    }
  });
});
