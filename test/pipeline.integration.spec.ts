import { PipelineRunner } from '../src/core/pipeline/pipeline-runner';
import { ValidationStep } from '../src/core/transform/validation.step';
import { MappingStep } from '../src/core/transform/mapping.step';
import { NormalizationStep } from '../src/core/transform/normalization.step';
import { DeduplicationStep } from '../src/core/transform/deduplication.step';
import { ProjectionStep } from '../src/core/transform/projection.step';
import { TalabatAdapter } from '../src/providers/talabat/talabat.adapter';
import { PipelineContext, QuarantinedItem } from '../src/core/pipeline/pipeline.types';
import { DomainLocation, DomainRestaurant, DomainMenuItem } from '../src/core/ports/models';

describe('Pipeline Integration (End-to-End Transformation & Quarantine)', () => {
  let adapter: TalabatAdapter;
  let pipeline: PipelineRunner<any, any>;

  beforeAll(() => {
    adapter = new TalabatAdapter();
    pipeline = new PipelineRunner([
      new ValidationStep(adapter),
      new MappingStep(adapter),
      new NormalizationStep(adapter),
      new DeduplicationStep(adapter),
      new ProjectionStep(adapter),
    ]);
  });

  it('should process a raw location document and produce clean DomainLocation entities', async () => {
    const rawLocationDoc = {
      _id: { $oid: '6aa77f2d2ba6464eb6cb3f4c' },
      statusCode: 200,
      payload: {
        results: [
          {
            location_name: 'Al Zaab',
            location_slug: 'al-zaab',
            location_id: 1468,
          },
          {
            location_name: 'Al Rowdah',
            location_slug: 'al-rowdah',
            location_id: 1461,
          },
          {
            location_name: 'Al Zaab', // In-batch duplicate
            location_slug: 'al-zaab',
            location_id: 1468,
          },
        ],
      },
    };

    const context: PipelineContext = {
      runId: 'int-run-001',
      jobId: 'int-job-001',
      provider: 'talabat',
      sourceCollection: 'raw_locations',
      sourceId: '6aa77f2d2ba6464eb6cb3f4c',
    };

    const result = await pipeline.processDocument(rawLocationDoc, context);

    expect(result.success).toBe(true);
    if (result.success) {
      const locations = result.entity as DomainLocation[];
      // In-batch duplicate was removed
      expect(locations).toHaveLength(2);
      expect(locations[0].providerLocationId).toBe('1468');
      expect(locations[0].name).toBe('Al Zaab');
      expect(locations[1].providerLocationId).toBe('1461');
    }
  });

  it('should cleanly quarantine raw menu documents with scraper failure "This is not restaurant page (Talabat)."', async () => {
    const failedScraperDoc = {
      _id: { $oid: '6aa77f3d2ba6464eb6cb9d5e' },
      statusCode: 200,
      payload: {
        request_log: { statusCode: 200 },
        Message: 'This is not restaurant page (Talabat).',
      },
    };

    const context: PipelineContext = {
      runId: 'int-run-002',
      jobId: 'int-job-002',
      provider: 'talabat',
      sourceCollection: 'raw_menus',
      sourceId: '6aa77f3d2ba6464eb6cb9d5e',
    };

    const result = await pipeline.processDocument(failedScraperDoc, context);

    expect(result.success).toBe(false);
    if (!result.success) {
      const quarantine: QuarantinedItem = result.quarantine;
      expect(quarantine.runId).toBe('int-run-002');
      expect(quarantine.jobId).toBe('int-job-002');
      expect(quarantine.provider).toBe('talabat');
      expect(quarantine.sourceCollection).toBe('raw_menus');
      expect(quarantine.stage).toBe('VALIDATION');
      expect(quarantine.reason).toContain('This is not restaurant page (Talabat).');
      expect(quarantine.rawPayload).toEqual(failedScraperDoc);
    }
  });

  it('should process a rich raw menu document, generating normalized Restaurant and first-class MenuItems', async () => {
    const rawMenuDoc = {
      _id: { $oid: '6aa77f442ba6464eb6cb9da1' },
      statusCode: 200,
      params: {
        restaurant_url: 'https://www.talabat.com/uae/restaurant/648607/sla-restaurant-and-cafe-al-rowdah?aid=1468',
      },
      payload: {
        results: [
          {
            id: 648607,
            name: 'Sla Restaurant and Cafe',
            logo: 'https://images.deliveryhero.io/image/talabat/restaurants/sla.jpg',
            latitude: '24.4539',
            longitude: '54.3773',
            rate: 4.5,
            totalReviews: 12,
            totalRatings: 150,
            deliveryFee: '7',
            DeliveryTime: '30-45 mins',
            'Minimum Order': 20,
            'Restaurant Address': 'Al Rowdah, Abu Dhabi',
            City: 'Abu Dhabi',
            outletCode: 648607,
            category: [
              {
                category_id: 1,
                category_name: 'Breakfast',
                items: [
                  {
                    item_id: 101,
                    item_name: 'Egg Benedict',
                    description: 'Poached eggs with hollandaise sauce',
                    price: 45,
                    image: 'https://images.deliveryhero.io/image/talabat/items/egg.jpg',
                  },
                ],
              },
            ],
          },
        ],
      },
    };

    const context: PipelineContext = {
      runId: 'int-run-003',
      jobId: 'int-job-003',
      provider: 'talabat',
      sourceCollection: 'raw_menus',
      sourceId: '6aa77f442ba6464eb6cb9da1',
    };

    const result = await pipeline.processDocument(rawMenuDoc, context);

    expect(result.success).toBe(true);
    if (result.success) {
      const [output] = result.entity as Array<{
        restaurant: DomainRestaurant;
        menuItems: DomainMenuItem[];
      }>;

      // Assert normalized restaurant
      expect(output.restaurant.providerRestaurantId).toBe('648607');
      expect(output.restaurant.name).toBe('Sla Restaurant and Cafe');
      expect(output.restaurant.geoLocation).toEqual({
        type: 'Point',
        coordinates: [54.3773, 24.4539],
      });
      expect(output.restaurant.pricing.minimumOrder).toBe(20);
      expect(output.restaurant.pricing.deliveryFee).toBe(7);
      expect(output.restaurant.delivery.minMinutes).toBe(30);
      expect(output.restaurant.delivery.maxMinutes).toBe(45);
      expect(output.restaurant.hasMenu).toBe(true);

      // Assert normalized first-class menu items
      expect(output.menuItems).toHaveLength(1);
      expect(output.menuItems[0].providerRestaurantId).toBe('648607');
      expect(output.menuItems[0].providerItemId).toBe('101');
      expect(output.menuItems[0].name).toBe('Egg Benedict');
      expect(output.menuItems[0].price).toBe(45);
      expect(output.menuItems[0].categoryName).toBe('Breakfast');
    }
  });

  it('guarantees idempotency: running the same document twice produces identical results', async () => {
    const rawDoc = {
      statusCode: 200,
      payload: {
        results: [
          {
            location_name: 'Al Aman',
            location_slug: 'al-aman',
            location_id: 1434,
          },
        ],
      },
    };

    const context: PipelineContext = {
      runId: 'idempotent-test',
      jobId: 'job-1',
      provider: 'talabat',
      sourceCollection: 'raw_locations',
      sourceId: '1434',
    };

    const run1 = await pipeline.processDocument(rawDoc, context);
    const run2 = await pipeline.processDocument(rawDoc, context);

    expect(run1).toEqual(run2);
  });
});
