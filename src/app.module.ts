import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { BullModule } from '@nestjs/bullmq';
import configuration from './config/configuration';
import { validateEnv } from './config/env.schema';
import { LocationsModule } from './domain/locations/locations.module';
import { RestaurantsModule } from './domain/restaurants/restaurants.module';
import { MenusModule } from './domain/menus/menus.module';
import { RawModule } from './domain/raw/raw.module';
import { RunsModule } from './runs/runs.module';
import { QueueModule } from './queue/queue.module';
import { ProvidersModule } from './providers/providers.module';
import { HealthModule } from './health/health.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
      validate: validateEnv,
    }),

    // Raw Staging Database Connection (Strictly READ-ONLY)
    MongooseModule.forRootAsync({
      connectionName: 'raw',
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        uri: configService.get<string>('app.MONGO_RAW_URI'),
      }),
      inject: [ConfigService],
    }),

    // Domain Target Database Connection (Clean, normalized, indexed)
    MongooseModule.forRootAsync({
      connectionName: 'target',
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        uri: configService.get<string>('app.MONGO_TARGET_URI'),
      }),
      inject: [ConfigService],
    }),

    // BullMQ Redis Orchestration
    BullModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        connection: {
          host: configService.get<string>('app.REDIS_HOST', 'localhost'),
          port: configService.get<number>('app.REDIS_PORT', 6379),
          password: configService.get<string>('app.REDIS_PASSWORD') || undefined,
          maxRetriesPerRequest: null,
          enableReadyCheck: false,
        },
      }),
      inject: [ConfigService],
    }),

    // Feature Modules
    LocationsModule,
    RestaurantsModule,
    MenusModule,
    RawModule,
    RunsModule,
    QueueModule,
    ProvidersModule,
    HealthModule,
  ],
})
export class AppModule {}
