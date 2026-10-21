import { TalabatAdapter } from './talabat.adapter';
import { DomainRestaurant, DomainMenuItem } from '../../core/ports/models';

describe('TalabatAdapter', () => {
  let adapter: TalabatAdapter;

  beforeEach(() => {
    adapter = new TalabatAdapter();
  });

  describe('validateRaw', () => {
    it('should identify valid raw location document', () => {
      const outcome = adapter.validateRaw('raw_locations', {
        statusCode: 200,
        payload: { results: [{ location_id: 1, location_name: 'Loc', location_slug: 'loc' }] },
      });
      expect(outcome.isValid).toBe(true);
    });

    it('should catch 404/deleted scraper page message', () => {
      const outcome = adapter.validateRaw('raw_menus', {
        statusCode: 200,
        payload: {
          Message: 'This is not restaurant page (Talabat).',
        },
      });
      expect(outcome.isValid).toBe(false);
      expect(outcome.reason).toContain('This is not restaurant page (Talabat).');
    });

    it('should catch pagination limit exceeded error', () => {
      const outcome = adapter.validateRaw('raw_restaurants', {
        statusCode: 200,
        payload: {
          'Total Page': 1,
          'Page Error Message': 'Page limit exceeded.',
          results: [],
        },
      });
      expect(outcome.isValid).toBe(false);
      expect(outcome.reason).toContain('Page limit exceeded.');
    });
  });

  describe('raw_menus transformation', () => {
    it('should parse nested categories and items into first-class DomainMenuItem entities', () => {
      const rawMenuDoc = {
        params: {
          restaurant_url: 'https://www.talabat.com/uae/restaurant/34807/little-bangkok?aid=1280',
        },
        payload: {
          results: [
            {
              id: 1400,
              outletCode: 34807,
              name: 'Little Bangkok',
              logo: 'https://images.deliveryhero.io/image/talabat/restaurants/logo.jpg',
              latitude: '25.2167',
              longitude: '55.2798',
              rate: 4.3,
              totalReviews: 0,
              totalRatings: 1000,
              deliveryFee: '9',
              DeliveryTime: '20-35 mins',
              'Minimum Order': 0,
              'Restaurant Address': 'Dubai World Trade Center - DWTC',
              City: 'Dubai',
              Contact: '00000-00000',
              category: [
                {
                  category_id: 101,
                  category_name: 'Main Courses',
                  items: [
                    {
                      item_id: 501,
                      item_name: 'Pad Thai',
                      description: 'Thin rice noodles',
                      price: 57,
                      rating: 4.8,
                      image: 'https://images.deliveryhero.io/image/talabat/dish.jpg',
                    },
                  ],
                },
              ],
            },
          ],
        },
      };

      const items = adapter.extractItems('raw_menus', rawMenuDoc);
      expect(items).toHaveLength(1);

      const mapped = adapter.mapFields('raw_menus', items[0]);
      const normalized = adapter.normalize('raw_menus', mapped);
      const projected = adapter.project('raw_menus', normalized) as {
        restaurant: DomainRestaurant;
        menuItems: DomainMenuItem[];
      };

      expect(projected.restaurant).toBeDefined();
      expect(projected.restaurant.provider).toBe('talabat');
      expect(projected.restaurant.providerRestaurantId).toBe('34807');
      expect(projected.restaurant.brandId).toBe('1400');
      expect(projected.restaurant.name).toBe('Little Bangkok');
      expect(projected.restaurant.hasMenu).toBe(true);
      expect(projected.restaurant.pricing.deliveryFee).toBe(9);
      expect(projected.restaurant.geoLocation).toEqual({
        type: 'Point',
        coordinates: [55.2798, 25.2167],
      });
      // Placeholder phone was cleaned
      expect(projected.restaurant.contactPhone).toBeUndefined();

      // Check extracted first-class menu items
      expect(projected.menuItems).toHaveLength(1);
      const menuItem = projected.menuItems[0];
      expect(menuItem.provider).toBe('talabat');
      expect(menuItem.providerRestaurantId).toBe('34807');
      expect(menuItem.providerItemId).toBe('501');
      expect(menuItem.categoryId).toBe('101');
      expect(menuItem.categoryName).toBe('Main Courses');
      expect(menuItem.name).toBe('Pad Thai');
      expect(menuItem.price).toBe(57);
      expect(menuItem.currency).toBe('AED');
    });
  });
});
