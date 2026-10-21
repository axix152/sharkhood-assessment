import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { IRunRepository } from '../../core/ports/repository.ports';
import { DomainRun, RunStatus, StageCounters } from '../../core/ports/models';
import { Run, RunDocument } from '../schemas/run.schema';

@Injectable()
export class RunRepository implements IRunRepository {
  constructor(
    @InjectModel(Run.name, 'target')
    private readonly runModel: Model<RunDocument>,
  ) {}

  async create(run: Partial<DomainRun>): Promise<DomainRun> {
    const created = await this.runModel.create(run);
    return created.toObject() as unknown as DomainRun;
  }

  async findByRunId(runId: string): Promise<DomainRun | null> {
    const doc = await this.runModel.findOne({ runId }).lean<DomainRun>().exec();
    return doc || null;
  }

  async updateStatus(
    runId: string,
    status: RunStatus,
    extra: Partial<DomainRun> = {},
  ): Promise<DomainRun | null> {
    const doc = await this.runModel
      .findOneAndUpdate(
        { runId },
        {
          $set: {
            status,
            ...extra,
          },
        },
        { new: true },
      )
      .lean<DomainRun>()
      .exec();

    return doc || null;
  }

  async incrementCounters(
    runId: string,
    collectionName: string,
    delta: Partial<StageCounters>,
  ): Promise<void> {
    const incObj: Record<string, number> = {};

    for (const [key, val] of Object.entries(delta)) {
      if (typeof val === 'number' && val !== 0) {
        incObj[`counters.${key}`] = val;
        incObj[`collectionCounters.${collectionName}.${key}`] = val;
      }
    }

    if (Object.keys(incObj).length === 0) return;

    await this.runModel.updateOne({ runId }, { $inc: incObj }).exec();
  }

  async addErrorSample(
    runId: string,
    sample: { sourceCollection: string; stage: string; reason: string; timestamp: Date },
  ): Promise<void> {
    // Keep a maximum sample of 50 errors on the run record
    await this.runModel
      .updateOne(
        { runId },
        {
          $push: {
            errorsSample: {
              $each: [sample],
              $slice: -50,
            },
          },
        },
      )
      .exec();
  }
}
