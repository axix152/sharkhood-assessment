import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Schema as MongooseSchema } from 'mongoose';

export type QuarantineRecordDocument = HydratedDocument<QuarantineRecord>;

@Schema({
  collection: 'quarantine_records',
  timestamps: { createdAt: true, updatedAt: false },
})
export class QuarantineRecord {
  @Prop({ required: true, index: true })
  runId!: string;

  @Prop({ required: true, index: true })
  jobId!: string;

  @Prop({ required: true, index: true })
  provider!: string;

  @Prop({ required: true, index: true })
  sourceCollection!: string;

  @Prop({ required: true })
  sourceId!: string;

  @Prop({ required: true, index: true })
  stage!: string;

  @Prop({ required: true })
  reason!: string;

  @Prop({ type: MongooseSchema.Types.Mixed, required: true })
  rawPayload!: unknown;

  @Prop({ type: MongooseSchema.Types.Mixed })
  errorDetails?: unknown;

  @Prop({ type: Date, default: () => new Date(), index: true })
  createdAt!: Date;
}

export const QuarantineRecordSchema = SchemaFactory.createForClass(QuarantineRecord);

QuarantineRecordSchema.index({ runId: 1, createdAt: -1 });
QuarantineRecordSchema.index({ provider: 1, sourceCollection: 1 });
