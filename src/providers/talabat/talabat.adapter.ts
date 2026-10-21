import { Injectable } from '@nestjs/common';
import {
  IProviderAdapter,
  RawCollectionDescriptor,
  ValidationOutcome,
  ProjectedEntity,
} from '../provider-adapter.interface';
import {
  DomainLocation,
  DomainRestaurant,
  DomainMenuItem,
} from '../../core/ports/models';
import {
  RawTalabatDocument,
  RawTalabatLocation,
  RawTalabatRestaurantListing,
  RawTalabatMenuDetail,
  RawTalabatMenuItem,
  RawTalabatMenuCategory,
} from './talabat.types';
import { TalabatValidator } from './talabat.validation';
import { TalabatNormalizers } from './talabat.normalizers';
import {
  TALABAT_LOCATION_FIELD_MAP,
  TALABAT_RESTAURANT_LISTING_FIELD_MAP,
  TALABAT_MENU_DETAIL_FIELD_MAP,
} from './talabat.mapping';

@Injectable()
export class TalabatAdapter implements IProviderAdapter {
  readonly providerName = 'talabat';

  readonly supportedCollections: RawCollectionDescriptor[] = [
    { collectionName: 'raw_locations', entityType: 'location' },
    { collectionName: 'raw_restaurants', entityType: 'restaurant' },
    { collectionName: 'raw_menus', entityType: 'menu' },
  ];

  validateRaw(collectionName: string, rawDocument: unknown): ValidationOutcome {
    return TalabatValidator.validate(collectionName, rawDocument);
  }

  extractItems(collectionName: string, rawDocument: unknown): unknown[] {
    const doc = rawDocument as RawTalabatDocument;
    if (!doc.payload || !Array.isArray(doc.payload.results)) {
      return [];
    }

    // Attach document context (such as URL or params) to items if needed
    if (collectionName === 'raw_menus' && doc.params?.restaurant_url) {
      return doc.payload.results.map((item) => ({
        ...item,
        __sourceUrl: doc.params?.restaurant_url,
      }));
    }

    return doc.payload.results;
  }

  mapFields(collectionName: string, rawItem: unknown, parentContext?: unknown): unknown {
    switch (collectionName) {
      case 'raw_locations': {
        const item = rawItem as RawTalabatLocation;
        return {
          providerLocationId: String(item[TALABAT_LOCATION_FIELD_MAP.providerLocationId] ?? ''),
          name: item[TALABAT_LOCATION_FIELD_MAP.name] ?? '',
          slug: item[TALABAT_LOCATION_FIELD_MAP.slug] ?? '',
        };
      }

      case 'raw_restaurants': {
        const item = rawItem as RawTalabatRestaurantListing;
        return {
          name: item[TALABAT_RESTAURANT_LISTING_FIELD_MAP.name] ?? '',
          url: item[TALABAT_RESTAURANT_LISTING_FIELD_MAP.url] ?? '',
          areaName: item[TALABAT_RESTAURANT_LISTING_FIELD_MAP.areaName] ?? '',
        };
      }

      case 'raw_menus': {
        const item = rawItem as RawTalabatMenuDetail & { __sourceUrl?: string };
        return {
          brandId: item[TALABAT_MENU_DETAIL_FIELD_MAP.brandId],
          outletCode: item[TALABAT_MENU_DETAIL_FIELD_MAP.outletCode],
          name: item[TALABAT_MENU_DETAIL_FIELD_MAP.name],
          logoUrl: item[TALABAT_MENU_DETAIL_FIELD_MAP.logoUrl],
          latitude: item[TALABAT_MENU_DETAIL_FIELD_MAP.latitude],
          longitude: item[TALABAT_MENU_DETAIL_FIELD_MAP.longitude],
          ratingScore: item[TALABAT_MENU_DETAIL_FIELD_MAP.ratingScore],
          reviewCount: item[TALABAT_MENU_DETAIL_FIELD_MAP.reviewCount],
          ratingCount: item[TALABAT_MENU_DETAIL_FIELD_MAP.ratingCount],
          deliveryFee: item[TALABAT_MENU_DETAIL_FIELD_MAP.deliveryFee],
          deliveryTime: item[TALABAT_MENU_DETAIL_FIELD_MAP.deliveryTime],
          minimumOrder: item[TALABAT_MENU_DETAIL_FIELD_MAP.minimumOrder],
          address: item[TALABAT_MENU_DETAIL_FIELD_MAP.address],
          city: item[TALABAT_MENU_DETAIL_FIELD_MAP.city],
          contactPhone: item[TALABAT_MENU_DETAIL_FIELD_MAP.contactPhone],
          categories: item[TALABAT_MENU_DETAIL_FIELD_MAP.categories] || [],
          sourceUrl: item.__sourceUrl,
        };
      }

      default:
        return rawItem;
    }
  }

  normalize(collectionName: string, mappedItem: any): any {
    switch (collectionName) {
      case 'raw_locations': {
        return {
          provider: this.providerName,
          providerLocationId: TalabatNormalizers.cleanString(mappedItem.providerLocationId),
          name: TalabatNormalizers.cleanString(mappedItem.name),
          slug: TalabatNormalizers.cleanString(mappedItem.slug).toLowerCase(),
        };
      }

      case 'raw_restaurants': {
        const urlInfo = TalabatNormalizers.parseRestaurantUrl(mappedItem.url);
        return {
          provider: this.providerName,
          providerRestaurantId: urlInfo.restaurantId || '',
          name: TalabatNormalizers.cleanString(mappedItem.name),
          slug: (urlInfo.slug || TalabatNormalizers.cleanString(mappedItem.name))
            .toLowerCase()
            .replace(/\s+/g, '-'),
          url: TalabatNormalizers.cleanString(mappedItem.url),
          locationIds: urlInfo.areaId ? [urlInfo.areaId] : [],
          hasMenu: false,
        };
      }

      case 'raw_menus': {
        const urlInfo = TalabatNormalizers.parseRestaurantUrl(mappedItem.sourceUrl);
        const restaurantId = String(mappedItem.outletCode || urlInfo.restaurantId || mappedItem.brandId || '');
        const geoCoords = TalabatNormalizers.parseGeoCoordinates(mappedItem.latitude, mappedItem.longitude);
        const deliveryParsed = TalabatNormalizers.parseDeliveryTime(mappedItem.deliveryTime);

        // Normalize restaurant header
        const restaurant: DomainRestaurant = {
          provider: this.providerName,
          providerRestaurantId: restaurantId,
          brandId: mappedItem.brandId ? String(mappedItem.brandId) : undefined,
          name: TalabatNormalizers.cleanString(mappedItem.name),
          slug: (urlInfo.slug || TalabatNormalizers.cleanString(mappedItem.name))
            .toLowerCase()
            .replace(/\s+/g, '-'),
          url: mappedItem.sourceUrl || '',
          logoUrl: mappedItem.logoUrl || undefined,
          address: TalabatNormalizers.cleanString(mappedItem.address) || undefined,
          city: TalabatNormalizers.cleanString(mappedItem.city) || undefined,
          contactPhone: TalabatNormalizers.cleanPhone(mappedItem.contactPhone),
          locationIds: urlInfo.areaId ? [urlInfo.areaId] : [],
          rating: {
            score: typeof mappedItem.ratingScore === 'number' ? mappedItem.ratingScore : parseFloat(mappedItem.ratingScore) || 0,
            reviewCount: parseInt(String(mappedItem.reviewCount || 0), 10) || 0,
            ratingCount: parseInt(String(mappedItem.ratingCount || 0), 10) || 0,
          },
          pricing: {
            minimumOrder: TalabatNormalizers.parseMoney(mappedItem.minimumOrder, 0),
            deliveryFee: TalabatNormalizers.parseMoney(mappedItem.deliveryFee, 0),
            currency: 'AED',
          },
          delivery: {
            timeEstimate: deliveryParsed.timeEstimate,
            minMinutes: deliveryParsed.minMinutes,
            maxMinutes: deliveryParsed.maxMinutes,
          },
          geoLocation: geoCoords ? { type: 'Point', coordinates: geoCoords } : undefined,
          hasMenu: true,
        };

        // Normalize nested categories and menu items
        const menuItems: DomainMenuItem[] = [];
        if (Array.isArray(mappedItem.categories)) {
          for (const cat of mappedItem.categories as RawTalabatMenuCategory[]) {
            const categoryId = String(cat.category_id || 'uncategorized');
            const categoryName = TalabatNormalizers.cleanString(cat.category_name || 'General');

            if (Array.isArray(cat.items)) {
              for (const it of cat.items) {
                if (!it.item_id && !it.item_name) continue;

                menuItems.push({
                  provider: this.providerName,
                  providerRestaurantId: restaurantId,
                  providerItemId: String(it.item_id || Math.random().toString(36).slice(2)),
                  categoryId,
                  categoryName,
                  name: TalabatNormalizers.cleanString(it.item_name),
                  description: TalabatNormalizers.cleanString(it.description) || undefined,
                  price: TalabatNormalizers.parseMoney(it.price, 0),
                  currency: 'AED',
                  rating: typeof it.rating === 'number' ? it.rating : parseFloat(String(it.rating || 0)) || 0,
                  imageUrl: it.image || undefined,
                });
              }
            }
          }
        }

        return {
          restaurant,
          menuItems,
        };
      }

      default:
        return mappedItem;
    }
  }

  getNaturalKey(collectionName: string, normalizedItem: any): string {
    switch (collectionName) {
      case 'raw_locations':
        return `${this.providerName}:${normalizedItem.providerLocationId}`;

      case 'raw_restaurants':
        return `${this.providerName}:${normalizedItem.providerRestaurantId}`;

      case 'raw_menus':
        return `${this.providerName}:${normalizedItem.restaurant.providerRestaurantId}`;

      default:
        return `${this.providerName}:${JSON.stringify(normalizedItem)}`;
    }
  }

  project(collectionName: string, normalizedItem: any): ProjectedEntity {
    switch (collectionName) {
      case 'raw_locations':
        return normalizedItem as DomainLocation;

      case 'raw_restaurants':
        return normalizedItem as DomainRestaurant;

      case 'raw_menus':
        return normalizedItem as { restaurant: DomainRestaurant; menuItems: DomainMenuItem[] };

      default:
        return normalizedItem;
    }
  }
}
