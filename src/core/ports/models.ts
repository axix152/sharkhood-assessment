export interface DomainLocation {
  provider: string;
  providerLocationId: string;
  name: string;
  slug: string;
  metadata?: Record<string, unknown>;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface DomainGeoPoint {
  type: 'Point';
  coordinates: [number, number]; // [longitude, latitude]
}

export interface DomainRestaurant {
  provider: string;
  providerRestaurantId: string;
  brandId?: string;
  name: string;
  slug: string;
  url: string;
  logoUrl?: string;
  address?: string;
  city?: string;
  contactPhone?: string;
  locationIds: string[];
  rating: {
    score: number;
    reviewCount: number;
    ratingCount: number;
  };
  pricing: {
    minimumOrder: number;
    deliveryFee: number;
    currency: string;
  };
  delivery: {
    timeEstimate?: string;
    minMinutes?: number;
    maxMinutes?: number;
  };
  geoLocation?: DomainGeoPoint;
  hasMenu: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface DomainMenuItem {
  provider: string;
  providerRestaurantId: string;
  providerItemId: string;
  categoryId: string;
  categoryName: string;
  name: string;
  description?: string;
  price: number;
  currency: string;
  rating?: number;
  imageUrl?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export enum RunStatus {
  PENDING = 'PENDING',
  RUNNING = 'RUNNING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
}

export interface StageCounters {
  read: number;
  transformed: number;
  written: number;
  skipped: number;
  failed: number;
}

export interface DomainRun {
  runId: string;
  provider: string;
  status: RunStatus;
  options: {
    batchSize: number;
    collections?: string[];
    limit?: number;
  };
  counters: StageCounters;
  collectionCounters: Record<string, StageCounters>;
  startedAt?: Date;
  completedAt?: Date;
  durationMs?: number;
  errorsSample: Array<{
    sourceCollection: string;
    stage: string;
    reason: string;
    timestamp: Date;
  }>;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface DomainQuarantineRecord {
  id?: string;
  runId: string;
  jobId: string;
  provider: string;
  sourceCollection: string;
  sourceId: string;
  stage: string;
  reason: string;
  rawPayload: unknown;
  errorDetails?: unknown;
  createdAt: Date;
}
