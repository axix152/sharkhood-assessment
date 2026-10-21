import {
  DomainLocation,
  DomainRestaurant,
  DomainMenuItem,
  DomainRun,
  DomainQuarantineRecord,
  StageCounters,
  RunStatus,
} from './models';

export const LOCATION_REPOSITORY = Symbol('LOCATION_REPOSITORY');
export const RESTAURANT_REPOSITORY = Symbol('RESTAURANT_REPOSITORY');
export const MENU_ITEM_REPOSITORY = Symbol('MENU_ITEM_REPOSITORY');
export const RUN_REPOSITORY = Symbol('RUN_REPOSITORY');
export const QUARANTINE_REPOSITORY = Symbol('QUARANTINE_REPOSITORY');
export const RAW_SOURCE_REPOSITORY = Symbol('RAW_SOURCE_REPOSITORY');

export interface ILocationRepository {
  upsertMany(locations: DomainLocation[]): Promise<{ written: number; skipped: number }>;
  findByProviderId(provider: string, providerLocationId: string): Promise<DomainLocation | null>;
  count(): Promise<number>;
}

export interface IRestaurantRepository {
  upsertMany(restaurants: DomainRestaurant[]): Promise<{ written: number; skipped: number }>;
  findByProviderId(provider: string, providerRestaurantId: string): Promise<DomainRestaurant | null>;
  count(): Promise<number>;
}

export interface IMenuItemRepository {
  upsertMany(items: DomainMenuItem[]): Promise<{ written: number; skipped: number }>;
  findByRestaurantId(provider: string, providerRestaurantId: string): Promise<DomainMenuItem[]>;
  count(): Promise<number>;
}

export interface IQuarantineRepository {
  createMany(records: DomainQuarantineRecord[]): Promise<void>;
  findByRunId(
    runId: string,
    options?: { page?: number; limit?: number; stage?: string },
  ): Promise<{ data: DomainQuarantineRecord[]; total: number; page: number; limit: number }>;
  countByRunId(runId: string): Promise<number>;
}

export interface IRunRepository {
  create(run: Partial<DomainRun>): Promise<DomainRun>;
  findByRunId(runId: string): Promise<DomainRun | null>;
  updateStatus(runId: string, status: RunStatus, extra?: Partial<DomainRun>): Promise<DomainRun | null>;
  incrementCounters(
    runId: string,
    collectionName: string,
    delta: Partial<StageCounters>,
  ): Promise<void>;
  addErrorSample(
    runId: string,
    sample: { sourceCollection: string; stage: string; reason: string; timestamp: Date },
  ): Promise<void>;
}

export interface IRawSourceRepository {
  /**
   * Reads raw documents from the specified staging collection with a cursor in configurable batches.
   * Never loads the entire collection into memory.
   */
  streamBatches<T = any>(
    collectionName: string,
    batchSize: number,
    filter?: Record<string, unknown>,
    limit?: number,
  ): AsyncIterable<T[]>;

  count(collectionName: string, filter?: Record<string, unknown>): Promise<number>;
}
