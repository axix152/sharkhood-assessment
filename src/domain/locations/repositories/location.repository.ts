import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { ILocationRepository } from '../../../core/ports/repository.ports';
import { DomainLocation } from '../../../core/ports/models';
import { Location, LocationDocument } from '../schemas/location.schema';

@Injectable()
export class LocationRepository implements ILocationRepository {
  constructor(
    @InjectModel(Location.name, 'target')
    private readonly locationModel: Model<LocationDocument>,
  ) {}

  async upsertMany(locations: DomainLocation[]): Promise<{ written: number; skipped: number }> {
    if (!locations || locations.length === 0) {
      return { written: 0, skipped: 0 };
    }

    const bulkOps = locations.map((loc) => ({
      updateOne: {
        filter: {
          provider: loc.provider,
          providerLocationId: loc.providerLocationId,
        },
        update: {
          $set: {
            name: loc.name,
            slug: loc.slug,
            metadata: loc.metadata || {},
          },
          $setOnInsert: {
            createdAt: new Date(),
          },
        },
        upsert: true,
      },
    }));

    const result = await this.locationModel.bulkWrite(bulkOps, { ordered: false });
    const written = (result.upsertedCount || 0) + (result.modifiedCount || 0);
    const skipped = (result.matchedCount || 0) - (result.modifiedCount || 0);

    return {
      written,
      skipped: Math.max(0, skipped),
    };
  }

  async findByProviderId(
    provider: string,
    providerLocationId: string,
  ): Promise<DomainLocation | null> {
    const doc = await this.locationModel
      .findOne({ provider, providerLocationId })
      .lean<DomainLocation>()
      .exec();
    return doc || null;
  }

  async count(): Promise<number> {
    return this.locationModel.countDocuments().exec();
  }
}
