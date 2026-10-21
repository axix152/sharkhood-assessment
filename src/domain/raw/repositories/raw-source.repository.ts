import { Injectable } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection } from 'mongoose';
import { IRawSourceRepository } from '../../../core/ports/repository.ports';

@Injectable()
export class RawSourceRepository implements IRawSourceRepository {
  constructor(
    @InjectConnection('raw')
    private readonly rawConnection: Connection,
  ) {}

  /**
   * Stream documents from the raw database using a MongoDB cursor.
   * Yields batches of size `batchSize`. Strictly read-only cursor streaming.
   * Never loads full collection into memory.
   */
  async *streamBatches<T = any>(
    collectionName: string,
    batchSize: number,
    filter: Record<string, unknown> = {},
    limit?: number,
  ): AsyncIterable<T[]> {
    const rawCollection = this.rawConnection.collection(collectionName);
    let cursor = rawCollection.find(filter).batchSize(batchSize);

    if (limit && limit > 0) {
      cursor = cursor.limit(limit);
    }

    let batch: T[] = [];

    for await (const doc of cursor) {
      batch.push(doc as unknown as T);

      if (batch.length >= batchSize) {
        yield batch;
        batch = [];
      }
    }

    if (batch.length > 0) {
      yield batch;
    }
  }

  async count(collectionName: string, filter: Record<string, unknown> = {}): Promise<number> {
    const rawCollection = this.rawConnection.collection(collectionName);
    return rawCollection.countDocuments(filter);
  }
}
