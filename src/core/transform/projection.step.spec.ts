import { ProjectionStep } from './projection.step';
import { PipelineContext } from '../pipeline/pipeline.types';
import { TalabatAdapter } from '../../providers/talabat/talabat.adapter';

describe('ProjectionStep', () => {
  let step: ProjectionStep;
  let adapter: TalabatAdapter;
  const dummyContext: PipelineContext = {
    runId: 'run-123',
    jobId: 'job-1',
    provider: 'talabat',
    sourceCollection: 'raw_locations',
    sourceId: 'doc-005',
  };

  beforeEach(() => {
    adapter = new TalabatAdapter();
    step = new ProjectionStep(adapter);
  });

  it('should project normalized locations into domain location entities', () => {
    const deduplicated = [
      {
        provider: 'talabat',
        providerLocationId: '1280',
        name: 'Dubai World Trade Center - DWTC',
        slug: 'dubai-world-trade-center-dwtc',
      },
    ];

    const result = step.execute(deduplicated, dummyContext);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toHaveLength(1);
      const loc = result.data[0] as any;
      expect(loc.provider).toBe('talabat');
      expect(loc.providerLocationId).toBe('1280');
    }
  });
});
