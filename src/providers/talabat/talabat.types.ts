export interface RawTalabatLocation {
  location_name: string;
  location_slug: string;
  location_id: number | string;
}

export interface RawTalabatRestaurantListing {
  area_name: string;
  restaurant_name: string;
  restaurant_url: string;
}

export interface RawTalabatMenuItem {
  item_id: number | string;
  item_name: string;
  description?: string;
  price: number | string;
  rating?: number | string;
  image?: string;
}

export interface RawTalabatMenuCategory {
  category_id: number | string;
  category_name: string;
  items?: RawTalabatMenuItem[];
}

export interface RawTalabatMenuDetail {
  id?: number | string;
  name?: string;
  logo?: string;
  latitude?: string | number;
  longitude?: string | number;
  rate?: number | string;
  totalReviews?: number | string;
  totalRatings?: number | string;
  deliveryFee?: string | number;
  DeliveryTime?: string;
  'Minimum Order'?: number | string;
  'Restaurant Address'?: string;
  City?: string;
  Contact?: string;
  outletCode?: number | string;
  category?: RawTalabatMenuCategory[];
}

export interface RawTalabatDocument<T = any> {
  _id?: { $oid: string } | string;
  domain?: string;
  endpoint?: string;
  params?: Record<string, unknown>;
  statusCode?: number;
  payload?: {
    request_log?: Record<string, unknown>;
    results?: T[];
    Message?: string;
    error?: string;
    'Page Error Message'?: string;
    'Total Page'?: number;
  };
  createdAt?: { $date: string } | string;
  updatedAt?: { $date: string } | string;
}
