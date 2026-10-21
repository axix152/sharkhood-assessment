/**
 * Declarative Field Mapping Configuration for Talabat Provider.
 * This represents the declarative seam where raw scraper field names
 * are mapped to canonical domain attributes.
 */

export interface FieldMappingRule<TRaw, TCanonical> {
  targetField: keyof TCanonical;
  sourceField?: keyof TRaw | string;
  transform?: (raw: TRaw, sourceField?: string) => unknown;
}

export const TALABAT_LOCATION_FIELD_MAP = {
  providerLocationId: 'location_id',
  name: 'location_name',
  slug: 'location_slug',
} as const;

export const TALABAT_RESTAURANT_LISTING_FIELD_MAP = {
  name: 'restaurant_name',
  url: 'restaurant_url',
  areaName: 'area_name',
} as const;

export const TALABAT_MENU_DETAIL_FIELD_MAP = {
  brandId: 'id',
  outletCode: 'outletCode',
  name: 'name',
  logoUrl: 'logo',
  latitude: 'latitude',
  longitude: 'longitude',
  ratingScore: 'rate',
  reviewCount: 'totalReviews',
  ratingCount: 'totalRatings',
  deliveryFee: 'deliveryFee',
  deliveryTime: 'DeliveryTime',
  minimumOrder: 'Minimum Order',
  address: 'Restaurant Address',
  city: 'City',
  contactPhone: 'Contact',
  categories: 'category',
} as const;

export const TALABAT_MENU_ITEM_FIELD_MAP = {
  itemId: 'item_id',
  name: 'item_name',
  description: 'description',
  price: 'price',
  rating: 'rating',
  imageUrl: 'image',
} as const;
