import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type MenuItemDocument = HydratedDocument<MenuItem>;

@Schema({
  collection: 'menu_items',
  timestamps: true,
})
export class MenuItem {
  @Prop({ required: true, index: true })
  provider!: string;

  @Prop({ required: true, index: true })
  providerRestaurantId!: string;

  @Prop({ required: true })
  providerItemId!: string;

  @Prop({ required: true, index: true })
  categoryId!: string;

  @Prop({ required: true })
  categoryName!: string;

  @Prop({ required: true })
  name!: string;

  @Prop({ type: String })
  description?: string;

  @Prop({ type: Number, required: true, default: 0 })
  price!: number;

  @Prop({ type: String, default: 'AED' })
  currency!: string;

  @Prop({ type: Number, default: 0 })
  rating?: number;

  @Prop({ type: String })
  imageUrl?: string;
}

export const MenuItemSchema = SchemaFactory.createForClass(MenuItem);

// Compound unique natural index: an item is uniquely identified within a restaurant of a provider
MenuItemSchema.index(
  { provider: 1, providerRestaurantId: 1, providerItemId: 1 },
  { unique: true },
);

// Compound index for querying all items of a restaurant grouped by category
MenuItemSchema.index({ provider: 1, providerRestaurantId: 1, categoryId: 1 });
