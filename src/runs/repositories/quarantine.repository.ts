import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { IQuarantineRepository } from '../../core/ports/repository.ports';
import { DomainQuarantineRecord } from '../../core/ports/models';
import {
  QuarantineRecord,
  QuarantineRecordDocument,
} from '../schemas/quarantine-record.schema';

@Injectable()
export class QuarantineRepository implements IQuarantineRepository {
  constructor(
    @InjectModel(QuarantineRecord.name, 'target')
    private readonly quarantineModel: Model<QuarantineRecordDocument>,
  ) {}

  async createMany(records: DomainQuarantineRecord[]): Promise<void> {
    if (!records || records.length === 0) return;

    await this.quarantineModel.insertMany(records, { ordered: false });
  }

  async findByRunId(
    runId: string,
    options: { page?: number; limit?: number; stage?: string } = {},
  ): Promise<{ data: DomainQuarantineRecord[]; total: number; page: number; limit: number }> {
    const page = Math.max(1, options.page || 1);
    const limit = Math.min(100, Math.max(1, options.limit || 20));
    const skip = (page - 1) * limit;

    const filter: Record<string, unknown> = { runId };
    if (options.stage) {
      filter.stage = options.stage;
    }

    const [data, total] = await Promise.all([
      this.quarantineModel
        .find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean<DomainQuarantineRecord[]>()
        .exec(),
      this.quarantineModel.countDocuments(filter).exec(),
    ]);

    return {
      data,
      total,
      page,
      limit,
    };
  }

  async countByRunId(runId: string): Promise<number> {
    return this.quarantineModel.countDocuments({ runId }).exec();
  }
}
