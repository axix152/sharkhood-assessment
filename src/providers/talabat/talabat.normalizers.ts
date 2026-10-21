export class TalabatNormalizers {
  /**
   * Cleans and trims string values.
   */
  static cleanString(value: unknown): string {
    if (value === null || value === undefined) return '';
    return String(value).trim().replace(/\s+/g, ' ');
  }

  /**
   * Parses latitude and longitude into valid numeric coordinates.
   * Returns [longitude, latitude] or undefined if invalid.
   */
  static parseGeoCoordinates(
    latitude: unknown,
    longitude: unknown,
  ): [number, number] | undefined {
    if (latitude === null || latitude === undefined || longitude === null || longitude === undefined) {
      return undefined;
    }

    const lat = typeof latitude === 'number' ? latitude : parseFloat(String(latitude));
    const lon = typeof longitude === 'number' ? longitude : parseFloat(String(longitude));

    if (isNaN(lat) || isNaN(lon)) {
      return undefined;
    }

    // Latitude must be [-90, 90], Longitude must be [-180, 180]
    if (lat < -90 || lat > 90 || lon < -180 || lon > 180) {
      return undefined;
    }

    // Also guard against (0, 0) default placeholder coordinates
    if (lat === 0 && lon === 0) {
      return undefined;
    }

    return [lon, lat]; // GeoJSON expects [longitude, latitude]
  }

  /**
   * Extracts restaurant ID, slug, and areaId from Talabat restaurant URL.
   * Example: https://www.talabat.com/uae/restaurant/648607/sla-restaurant-and-cafe-al-rowdah?aid=1468
   */
  static parseRestaurantUrl(url: unknown): {
    restaurantId?: string;
    slug?: string;
    areaId?: string;
  } {
    if (!url || typeof url !== 'string') return {};

    try {
      const parsedUrl = new URL(url);
      const pathname = parsedUrl.pathname; // /uae/restaurant/648607/sla-restaurant-and-cafe-al-rowdah
      const areaId = parsedUrl.searchParams.get('aid') || undefined;

      const segments = pathname.split('/').filter(Boolean);
      // Expected segments: ['uae', 'restaurant', '648607', 'sla-restaurant-and-cafe-al-rowdah']
      const restaurantIdx = segments.indexOf('restaurant');
      if (restaurantIdx !== -1 && segments.length > restaurantIdx + 1) {
        const restaurantId = segments[restaurantIdx + 1];
        const slug = segments[restaurantIdx + 2] || undefined;
        return { restaurantId, slug, areaId };
      }
    } catch {
      // Fallback regex in case of non-standard URL strings
      const match = String(url).match(/restaurant\/(\d+)(?:\/([^?#]+))?/);
      if (match) {
        const aidMatch = String(url).match(/aid=(\d+)/);
        return {
          restaurantId: match[1],
          slug: match[2],
          areaId: aidMatch ? aidMatch[1] : undefined,
        };
      }
    }

    return {};
  }

  /**
   * Normalizes DeliveryTime string (e.g. "25-40 mins") into structured min/max values.
   */
  static parseDeliveryTime(value: unknown): {
    timeEstimate?: string;
    minMinutes?: number;
    maxMinutes?: number;
  } {
    if (!value) return {};
    const str = this.cleanString(value);
    if (!str) return {};

    const rangeMatch = str.match(/(\d+)\s*-\s*(\d+)/);
    if (rangeMatch) {
      return {
        timeEstimate: str,
        minMinutes: parseInt(rangeMatch[1], 10),
        maxMinutes: parseInt(rangeMatch[2], 10),
      };
    }

    const singleMatch = str.match(/(\d+)/);
    if (singleMatch) {
      const minutes = parseInt(singleMatch[1], 10);
      return {
        timeEstimate: str,
        minMinutes: minutes,
        maxMinutes: minutes,
      };
    }

    return { timeEstimate: str };
  }

  /**
   * Parses monetary numeric values like minimumOrder, deliveryFee, price.
   */
  static parseMoney(value: unknown, defaultValue = 0): number {
    if (value === null || value === undefined) return defaultValue;
    if (typeof value === 'number') return isNaN(value) ? defaultValue : value;

    const cleaned = String(value).replace(/[^0-9.]/g, '');
    const parsed = parseFloat(cleaned);
    return isNaN(parsed) ? defaultValue : Math.max(0, parsed);
  }

  /**
   * Cleans contact phone numbers, removing placeholders like "00000-00000".
   */
  static cleanPhone(value: unknown): string | undefined {
    if (!value) return undefined;
    const str = this.cleanString(value);
    if (str === '00000-00000' || str === '0' || !str) return undefined;
    return str;
  }
}
