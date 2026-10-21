import {
  DomainLocation,
  DomainRestaurant,
  DomainMenuItem,
} from '../core/ports/models';

export interface RawCollectionDescriptor {
  collectionName: string;
  entityType: 'location' | 'restaurant' | 'menu';
}

export interface ValidationOutcome {
  isValid: boolean;
  reason?: string;
  errorDetails?: unknown;
}

export type ProjectedEntity =
  | DomainLocation
  | DomainRestaurant
  | DomainMenuItem
  | DomainMenuItem[]
  | { restaurant: DomainRestaurant; menuItems: DomainMenuItem[] };

export interface IProviderAdapter {
  readonly providerName: string;
  readonly supportedCollections: RawCollectionDescriptor[];

  /**
   * Validates raw document at boundary.
   * Catches scraper errors, missing payloads, API error messages.
   */
  validateRaw(collectionName: string, rawDocument: unknown): ValidationOutcome;

  /**
   * Extracts raw items from raw document container (e.g. payload.results).
   */
  extractItems(collectionName: string, rawDocument: unknown): unknown[];

  /**
   * Maps provider-specific field names to canonical intermediate representation.
   */
  mapFields(collectionName: string, rawItem: unknown, parentContext?: unknown): unknown;

  /**
   * Pure normalization: trims strings, converts string coordinates to numbers, formats time ranges, etc.
   */
  normalize(collectionName: string, mappedItem: unknown): unknown;

  /**
   * Stable natural key for deduplication and idempotent upserts.
   */
  getNaturalKey(collectionName: string, normalizedItem: unknown): string;

  /**
   * Projects normalized item into final domain model.
   */
  project(collectionName: string, normalizedItem: unknown): ProjectedEntity;
}
