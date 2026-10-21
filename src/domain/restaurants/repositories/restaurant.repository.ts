import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { IRestaurantRepository } from '../../../core/ports/repository.ports';
import { DomainRestaurant } from '../../../core/ports/models';
import { Restaurant, RestaurantDocument } from '../schemas/restaurant.schema';

@Injectable()
export class RestaurantRepository implements IRestaurantRepository {
  constructor(
    @InjectModel(Restaurant.name, 'target')
    private readonly restaurantModel: Model<RestaurantDocument>,
  ) {}

  async upsertMany(restaurants: DomainRestaurant[]): Promise<{ written: number; skipped: number }> {
    if (!restaurants || restaurants.length === 0) {
      return { written: 0, skipped: 0 };
    }

    const bulkOps = restaurants.map((rest) => {
      const setFields: Record<string, any> = {
        name: rest.name,
        slug: rest.slug,
        url: rest.url,
      };

      if (rest.brandId) setFields.brandId = rest.brandId;
      if (rest.logoUrl) setFields.logoUrl = rest.logoUrl;
      if (rest.address) setFields.address = rest.address;
      if (rest.city) setFields.city = rest.city;
      if (rest.contactPhone) setFields.contactPhone = rest.contactPhone;
      if (rest.geoLocation) setFields.geoLocation = rest.geoLocation;
      if (rest.rating && rest.rating.score > 0) setFields.rating = rest.rating;
      if (rest.pricing && (rest.pricing.deliveryFee > 0 || rest.pricing.minimumOrder > 0)) {
        setFields.pricing = rest.pricing;
      }
      if (rest.delivery && rest.delivery.timeEstimate) setFields.delivery = rest.delivery;
      if (rest.hasMenu) setFields.hasMenu = true;

      const updateOp: Record<string, any> = {
        $set: setFields,
        $setOnInsert: {
          createdAt: new Date(),
        },
      };

      if (rest.locationIds && rest.locationIds.length > 0) {
        updateOp.$addToSet = {
          locationIds: { $each: rest.locationIds },
        };
      }

      return {
        updateOne: {
          filter: {
            provider: rest.provider,
            providerRestaurantId: rest.providerRestaurantId,
          },
          update: updateOp,
          upsert: true,
        },
      };
    });

    const result = await this.restaurantModel.bulkWrite(bulkOps, { ordered: false });
    const written = (result.upsertedCount || 0) + (result.modifiedCount || 0);
    const skipped = (result.matchedCount || 0) - (result.modifiedCount || 0);

    return {
      written,
      skipped: Math.max(0, skipped),
    };
  }

  async findByProviderId(
    provider: string,
    providerRestaurantId: string,
  ): Promise<DomainRestaurant | null> {
    const doc = await this.restaurantModel
      .findOne({ provider, providerRestaurantId })
      .lean<DomainRestaurant>()
      .exec();
    return doc || null;
  }

  async count(): Promise<number> {
    return this.restaurantModel.countDocuments().exec();
  }
}
