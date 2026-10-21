import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { IMenuItemRepository } from '../../../core/ports/repository.ports';
import { DomainMenuItem } from '../../../core/ports/models';
import { MenuItem, MenuItemDocument } from '../schemas/menu-item.schema';

@Injectable()
export class MenuItemRepository implements IMenuItemRepository {
  constructor(
    @InjectModel(MenuItem.name, 'target')
    private readonly menuItemModel: Model<MenuItemDocument>,
  ) {}

  async upsertMany(items: DomainMenuItem[]): Promise<{ written: number; skipped: number }> {
    if (!items || items.length === 0) {
      return { written: 0, skipped: 0 };
    }

    const bulkOps = items.map((item) => ({
      updateOne: {
        filter: {
          provider: item.provider,
          providerRestaurantId: item.providerRestaurantId,
          providerItemId: item.providerItemId,
        },
        update: {
          $set: {
            categoryId: item.categoryId,
            categoryName: item.categoryName,
            name: item.name,
            description: item.description,
            price: item.price,
            currency: item.currency || 'AED',
            rating: item.rating || 0,
            imageUrl: item.imageUrl,
          },
          $setOnInsert: {
            createdAt: new Date(),
          },
        },
        upsert: true,
      },
    }));

    const result = await this.menuItemModel.bulkWrite(bulkOps, { ordered: false });
    const written = (result.upsertedCount || 0) + (result.modifiedCount || 0);
    const skipped = (result.matchedCount || 0) - (result.modifiedCount || 0);

    return {
      written,
      skipped: Math.max(0, skipped),
    };
  }

  async findByRestaurantId(
    provider: string,
    providerRestaurantId: string,
  ): Promise<DomainMenuItem[]> {
    return this.menuItemModel
      .find({ provider, providerRestaurantId })
      .lean<DomainMenuItem[]>()
      .exec();
  }

  async count(): Promise<number> {
    return this.menuItemModel.countDocuments().exec();
  }
}
