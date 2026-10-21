import { DeduplicationStep } from './deduplication.step';
import { PipelineContext } from '../pipeline/pipeline.types';
import { TalabatAdapter } from '../../providers/talabat/talabat.adapter';

describe('DeduplicationStep', () => {
  let step: DeduplicationStep;
  let adapter: TalabatAdapter;
  const dummyContext: PipelineContext = {
    runId: 'run-123',
    jobId: 'job-1',
    provider: 'talabat',
    sourceCollection: 'raw_restaurants',
    sourceId: 'doc-004',
  };

  beforeEach(() => {
    adapter = new TalabatAdapter();
    step = new DeduplicationStep(adapter);
  });

  it('should remove duplicate records sharing the same natural key in the batch', () => {
    const normalizedWithDuplicates = [
      {
        provider: 'talabat',
        providerRestaurantId: '630872',
        name: "McDonald's",
      },
      {
        provider: 'talabat',
        providerRestaurantId: '648607',
        name: 'Sla Restaurant and Cafe',
      },
      {
        provider: 'talabat',
        providerRestaurantId: '630872', // Duplicate natural key
        name: "McDonald's Duplicate",
      },
    ];

    const result = step.execute(normalizedWithDuplicates, dummyContext);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toHaveLength(2);
      const ids = (result.data as any[]).map((r) => r.providerRestaurantId);
      expect(ids).toEqual(['630872', '648607']);
    }
  });

  it('should preserve all unique items when there are no duplicates', () => {
    const uniqueItems = [
      { provider: 'talabat', providerRestaurantId: '1' },
      { provider: 'talabat', providerRestaurantId: '2' },
      { provider: 'talabat', providerRestaurantId: '3' },
    ];

    const result = step.execute(uniqueItems, dummyContext);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toHaveLength(3);
    }
  });
});
