import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type RestaurantDocument = HydratedDocument<Restaurant>;

@Schema({ _id: false })
export class GeoPoint {
  @Prop({ type: String, enum: ['Point'], default: 'Point' })
  type!: string;

  @Prop({ type: [Number], required: true })
  coordinates!: [number, number]; // [longitude, latitude]
}

@Schema({ _id: false })
export class RestaurantRating {
  @Prop({ type: Number, default: 0 })
  score!: number;

  @Prop({ type: Number, default: 0 })
  reviewCount!: number;

  @Prop({ type: Number, default: 0 })
  ratingCount!: number;
}

@Schema({ _id: false })
export class RestaurantPricing {
  @Prop({ type: Number, default: 0 })
  minimumOrder!: number;

  @Prop({ type: Number, default: 0 })
  deliveryFee!: number;

  @Prop({ type: String, default: 'AED' })
  currency!: string;
}

@Schema({ _id: false })
export class RestaurantDelivery {
  @Prop({ type: String })
  timeEstimate?: string;

  @Prop({ type: Number })
  minMinutes?: number;

  @Prop({ type: Number })
  maxMinutes?: number;
}

@Schema({
  collection: 'restaurants',
  timestamps: true,
})
export class Restaurant {
  @Prop({ required: true, index: true })
  provider!: string;

  @Prop({ required: true })
  providerRestaurantId!: string;

  @Prop({ type: String })
  brandId?: string;

  @Prop({ required: true })
  name!: string;

  @Prop({ required: true, index: true })
  slug!: string;

  @Prop({ type: String, default: '' })
  url!: string;

  @Prop({ type: String })
  logoUrl?: string;

  @Prop({ type: String })
  address?: string;

  @Prop({ type: String, index: true })
  city?: string;

  @Prop({ type: String })
  contactPhone?: string;

  @Prop({ type: [String], default: [], index: true })
  locationIds!: string[];

  @Prop({ type: RestaurantRating, default: () => ({ score: 0, reviewCount: 0, ratingCount: 0 }) })
  rating!: RestaurantRating;

  @Prop({ type: RestaurantPricing, default: () => ({ minimumOrder: 0, deliveryFee: 0, currency: 'AED' }) })
  pricing!: RestaurantPricing;

  @Prop({ type: RestaurantDelivery, default: () => ({}) })
  delivery!: RestaurantDelivery;

  @Prop({ type: GeoPoint, required: false })
  geoLocation?: GeoPoint;

  @Prop({ type: Boolean, default: false })
  hasMenu!: boolean;
}

export const RestaurantSchema = SchemaFactory.createForClass(Restaurant);

// Compound natural identity
RestaurantSchema.index({ provider: 1, providerRestaurantId: 1 }, { unique: true });
// Geospatial index for proximity searches
RestaurantSchema.index({ geoLocation: '2dsphere' });
// City and name index for text/search browsing
RestaurantSchema.index({ city: 1, name: 1 });
