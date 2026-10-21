import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type LocationDocument = HydratedDocument<Location>;

@Schema({
  collection: 'locations',
  timestamps: true,
})
export class Location {
  @Prop({ required: true, index: true })
  provider!: string;

  @Prop({ required: true })
  providerLocationId!: string;

  @Prop({ required: true })
  name!: string;

  @Prop({ required: true, index: true })
  slug!: string;

  @Prop({ type: Object, default: {} })
  metadata?: Record<string, unknown>;
}

export const LocationSchema = SchemaFactory.createForClass(Location);

// Enforce compound natural identity across providers
LocationSchema.index({ provider: 1, providerLocationId: 1 }, { unique: true });
LocationSchema.index({ slug: 1 });
