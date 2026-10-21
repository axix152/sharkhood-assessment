import { z } from 'zod';

export const envSchema = z.object({
  PORT: z.coerce.number().default(3000),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),

  // Staging raw database (Strictly READ-ONLY)
  MONGO_RAW_URI: z.string().url().describe('MongoDB connection string for raw provider staging DB'),

  // Target domain database (Clean, normalized, indexed)
  MONGO_TARGET_URI: z.string().url().describe('MongoDB connection string for platform domain DB'),

  // Redis for BullMQ orchestration
  REDIS_HOST: z.string().min(1).default('localhost'),
  REDIS_PORT: z.coerce.number().default(6379),
  REDIS_PASSWORD: z.string().optional().default(''),

  // Queue & concurrency
  QUEUE_CONCURRENCY: z.coerce.number().min(1).max(20).default(3),
  BATCH_SIZE: z.coerce.number().min(1).max(500).default(50),
  QUEUE_MAX_ATTEMPTS: z.coerce.number().min(1).max(10).default(3),
  QUEUE_BACKOFF_DELAY_MS: z.coerce.number().min(100).default(2000),
});

export type EnvConfig = z.infer<typeof envSchema>;

export function validateEnv(config: Record<string, unknown>): EnvConfig {
  const result = envSchema.safeParse(config);

  if (!result.success) {
    const errorDetails = result.error.format();
    const formattedErrors = Object.entries(errorDetails)
      .filter(([key]) => key !== '_errors')
      .map(([key, value]) => `  - ${key}: ${JSON.stringify((value as { _errors?: string[] })._errors)}`)
      .join('\n');

    console.error(
      `\n❌ [FATAL] Environment Configuration Validation Failed!\n` +
      `The Provider Data Factory refuses to boot with invalid or missing environment variables:\n` +
      `${formattedErrors}\n`,
    );
    throw new Error(`Environment validation failed. Fix .env or environment configuration.`);
  }

  return result.data;
}
