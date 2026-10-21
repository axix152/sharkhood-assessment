import { Injectable } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection } from 'mongoose';
import Redis from 'ioredis';
import { ConfigService } from '@nestjs/config';

export interface HealthCheckResult {
  status: 'ok' | 'degraded' | 'down';
  timestamp: string;
  uptime: number;
  services: {
    mongoRaw: { status: 'up' | 'down'; latencyMs?: number; error?: string };
    mongoTarget: { status: 'up' | 'down'; latencyMs?: number; error?: string };
    redis: { status: 'up' | 'down'; latencyMs?: number; error?: string };
  };
}

@Injectable()
export class HealthService {
  private readonly redisClient: Redis;

  constructor(
    @InjectConnection('raw')
    private readonly rawMongoConnection: Connection,
    @InjectConnection('target')
    private readonly targetMongoConnection: Connection,
    private readonly configService: ConfigService,
  ) {
    this.redisClient = new Redis({
      host: this.configService.get<string>('app.REDIS_HOST', 'localhost'),
      port: this.configService.get<number>('app.REDIS_PORT', 6379),
      password: this.configService.get<string>('app.REDIS_PASSWORD') || undefined,
      lazyConnect: true,
      maxRetriesPerRequest: 1,
      connectTimeout: 2000,
    });
  }

  async checkHealth(): Promise<HealthCheckResult> {
    const [rawMongoHealth, targetMongoHealth, redisHealth] = await Promise.all([
      this.checkMongo(this.rawMongoConnection),
      this.checkMongo(this.targetMongoConnection),
      this.checkRedis(),
    ]);

    const isAllUp =
      rawMongoHealth.status === 'up' &&
      targetMongoHealth.status === 'up' &&
      redisHealth.status === 'up';

    const isAnyUp =
      rawMongoHealth.status === 'up' ||
      targetMongoHealth.status === 'up' ||
      redisHealth.status === 'up';

    return {
      status: isAllUp ? 'ok' : isAnyUp ? 'degraded' : 'down',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      services: {
        mongoRaw: rawMongoHealth,
        mongoTarget: targetMongoHealth,
        redis: redisHealth,
      },
    };
  }

  private async checkMongo(
    connection: Connection,
  ): Promise<{ status: 'up' | 'down'; latencyMs?: number; error?: string }> {
    const start = Date.now();
    try {
      if (connection.readyState !== 1 || !connection.db) {
        return { status: 'down', error: `Mongoose readyState is ${connection.readyState}` };
      }
      await connection.db.admin().ping();
      return { status: 'up', latencyMs: Date.now() - start };
    } catch (err: any) {
      return { status: 'down', error: err.message, latencyMs: Date.now() - start };
    }
  }

  private async checkRedis(): Promise<{ status: 'up' | 'down'; latencyMs?: number; error?: string }> {
    const start = Date.now();
    try {
      if (this.redisClient.status !== 'ready') {
        await this.redisClient.connect();
      }
      await this.redisClient.ping();
      return { status: 'up', latencyMs: Date.now() - start };
    } catch (err: any) {
      return { status: 'down', error: err.message, latencyMs: Date.now() - start };
    }
  }
}
