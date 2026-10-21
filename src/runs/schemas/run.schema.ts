import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import { RunStatus } from '../../core/ports/models';

export type RunDocument = HydratedDocument<Run>;

@Schema({ _id: false })
export class CountersSchema {
  @Prop({ type: Number, default: 0 })
  read!: number;

  @Prop({ type: Number, default: 0 })
  transformed!: number;

  @Prop({ type: Number, default: 0 })
  written!: number;

  @Prop({ type: Number, default: 0 })
  skipped!: number;

  @Prop({ type: Number, default: 0 })
  failed!: number;
}

@Schema({ _id: false })
export class ErrorSampleSchema {
  @Prop({ required: true })
  sourceCollection!: string;

  @Prop({ required: true })
  stage!: string;

  @Prop({ required: true })
  reason!: string;

  @Prop({ type: Date, default: () => new Date() })
  timestamp!: Date;
}

@Schema({
  collection: 'runs',
  timestamps: true,
})
export class Run {
  @Prop({ required: true, unique: true, index: true })
  runId!: string;

  @Prop({ required: true, index: true })
  provider!: string;

  @Prop({
    type: String,
    enum: Object.values(RunStatus),
    default: RunStatus.PENDING,
    index: true,
  })
  status!: RunStatus;

  @Prop({ type: Object, default: () => ({ batchSize: 50 }) })
  options!: {
    batchSize: number;
    collections?: string[];
    limit?: number;
  };

  @Prop({ type: CountersSchema, default: () => ({ read: 0, transformed: 0, written: 0, skipped: 0, failed: 0 }) })
  counters!: CountersSchema;

  @Prop({ type: Map, of: CountersSchema, default: () => ({}) })
  collectionCounters!: Map<string, CountersSchema>;

  @Prop({ type: Date })
  startedAt?: Date;

  @Prop({ type: Date })
  completedAt?: Date;

  @Prop({ type: Number, default: 0 })
  durationMs?: number;

  @Prop({ type: [ErrorSampleSchema], default: [] })
  errorsSample!: ErrorSampleSchema[];
}

export const RunSchema = SchemaFactory.createForClass(Run);
RunSchema.index({ createdAt: -1 });
RunSchema.index({ status: 1, createdAt: -1 });
