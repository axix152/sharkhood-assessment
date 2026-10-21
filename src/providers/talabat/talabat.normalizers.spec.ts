import { TalabatNormalizers } from './talabat.normalizers';

describe('TalabatNormalizers', () => {
  describe('parseGeoCoordinates', () => {
    it('should parse valid string coordinates to GeoJSON [longitude, latitude]', () => {
      const coords = TalabatNormalizers.parseGeoCoordinates(
        '25.216739966179706',
        '55.27988927116394',
      );
      expect(coords).toBeDefined();
      expect(coords![0]).toBeCloseTo(55.279889, 5);
      expect(coords![1]).toBeCloseTo(25.216739, 5);
    });

    it('should return undefined for out-of-range coordinates', () => {
      expect(TalabatNormalizers.parseGeoCoordinates('999.0', '55.0')).toBeUndefined();
      expect(TalabatNormalizers.parseGeoCoordinates('25.0', '-200.0')).toBeUndefined();
    });

    it('should return undefined for (0, 0) placeholder coordinates', () => {
      expect(TalabatNormalizers.parseGeoCoordinates('0', '0')).toBeUndefined();
      expect(TalabatNormalizers.parseGeoCoordinates(0, 0)).toBeUndefined();
    });

    it('should return undefined for null, undefined, or NaN strings', () => {
      expect(TalabatNormalizers.parseGeoCoordinates(null, '55.0')).toBeUndefined();
      expect(TalabatNormalizers.parseGeoCoordinates('abc', '55.0')).toBeUndefined();
    });
  });

  describe('parseRestaurantUrl', () => {
    it('should extract restaurantId, slug, and areaId from canonical Talabat URL', () => {
      const parsed = TalabatNormalizers.parseRestaurantUrl(
        'https://www.talabat.com/uae/restaurant/648607/sla-restaurant-and-cafe-al-rowdah?aid=1468',
      );
      expect(parsed.restaurantId).toBe('648607');
      expect(parsed.slug).toBe('sla-restaurant-and-cafe-al-rowdah');
      expect(parsed.areaId).toBe('1468');
    });

    it('should handle URL without query parameter aid', () => {
      const parsed = TalabatNormalizers.parseRestaurantUrl(
        'https://www.talabat.com/uae/restaurant/1115955/taqado-mexican-kitchen-burritos-bowls-adnec-al-rowdah',
      );
      expect(parsed.restaurantId).toBe('1115955');
      expect(parsed.slug).toBe('taqado-mexican-kitchen-burritos-bowls-adnec-al-rowdah');
      expect(parsed.areaId).toBeUndefined();
    });

    it('should return empty object for invalid or missing URLs', () => {
      expect(TalabatNormalizers.parseRestaurantUrl('')).toEqual({});
      expect(TalabatNormalizers.parseRestaurantUrl('not-a-url')).toEqual({});
      expect(TalabatNormalizers.parseRestaurantUrl(null)).toEqual({});
    });
  });

  describe('parseDeliveryTime', () => {
    it('should parse delivery range string "25-40 mins"', () => {
      const result = TalabatNormalizers.parseDeliveryTime('25-40 mins');
      expect(result.timeEstimate).toBe('25-40 mins');
      expect(result.minMinutes).toBe(25);
      expect(result.maxMinutes).toBe(40);
    });

    it('should parse single value string "30 mins"', () => {
      const result = TalabatNormalizers.parseDeliveryTime('30 mins');
      expect(result.minMinutes).toBe(30);
      expect(result.maxMinutes).toBe(30);
    });
  });

  describe('cleanPhone', () => {
    it('should return undefined for placeholder phone "00000-00000"', () => {
      expect(TalabatNormalizers.cleanPhone('00000-00000')).toBeUndefined();
      expect(TalabatNormalizers.cleanPhone('')).toBeUndefined();
      expect(TalabatNormalizers.cleanPhone(null)).toBeUndefined();
    });

    it('should preserve valid phone numbers', () => {
      expect(TalabatNormalizers.cleanPhone('+971 4 123 4567')).toBe('+971 4 123 4567');
    });
  });
});
