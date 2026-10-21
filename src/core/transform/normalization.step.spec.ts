import { NormalizationStep } from './normalization.step';
import { PipelineContext } from '../pipeline/pipeline.types';
import { TalabatAdapter } from '../../providers/talabat/talabat.adapter';

describe('NormalizationStep', () => {
  let step: NormalizationStep;
  let adapter: TalabatAdapter;
  const dummyContext: PipelineContext = {
    runId: 'run-123',
    jobId: 'job-1',
    provider: 'talabat',
    sourceCollection: 'raw_locations',
    sourceId: 'doc-003',
  };

  beforeEach(() => {
    adapter = new TalabatAdapter();
    step = new NormalizationStep(adapter);
  });

  it('should trim whitespace, lowercase slugs, and clean strings', () => {
    const mappedLocations = [
      {
        providerLocationId: '  1280  ',
        name: '  Dubai World Trade Center - DWTC  ',
        slug: '  Dubai-World-Trade-Center-DWTC  ',
      },
    ];

    const result = step.execute(mappedLocations, dummyContext);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toHaveLength(1);
      const loc = result.data[0] as any;
      expect(loc.providerLocationId).toBe('1280');
      expect(loc.name).toBe('Dubai World Trade Center - DWTC');
      expect(loc.slug).toBe('dubai-world-trade-center-dwtc');
      expect(loc.provider).toBe('talabat');
    }
  });

  it('should parse restaurant URL and extract ID, slug, and areaId', () => {
    const mappedRestaurants = [
      {
        name: " McDonald's, Al Khalidiyah (Khalidiyah Street) ",
        url: 'https://www.talabat.com/uae/restaurant/630872/mcdonalds-al-khalidiyah-khalidiyah-street?aid=1468',
        areaName: 'Al Zaab',
      },
    ];

    const result = step.execute(mappedRestaurants, {
      ...dummyContext,
      sourceCollection: 'raw_restaurants',
    });

    expect(result.success).toBe(true);
    if (result.success) {
      const rest = result.data[0] as any;
      expect(rest.providerRestaurantId).toBe('630872');
      expect(rest.slug).toBe('mcdonalds-al-khalidiyah-khalidiyah-street');
      expect(rest.locationIds).toEqual(['1468']);
      expect(rest.name).toBe("McDonald's, Al Khalidiyah (Khalidiyah Street)");
    }
  });
});
