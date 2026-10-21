import { EnvConfig } from './env.schema';

export default (): { app: EnvConfig } => {
  return {
    app: {
      PORT: Number(process.env.PORT) || 3000,
      NODE_ENV: (process.env.NODE_ENV as 'development' | 'production' | 'test') || 'development',
      MONGO_RAW_URI: process.env.MONGO_RAW_URI || 'mongodb://localhost:27017/provider_raw',
      MONGO_TARGET_URI: process.env.MONGO_TARGET_URI || 'mongodb://localhost:27017/provider_domain',
      REDIS_HOST: process.env.REDIS_HOST || 'localhost',
      REDIS_PORT: Number(process.env.REDIS_PORT) || 6379,
      REDIS_PASSWORD: process.env.REDIS_PASSWORD || '',
      QUEUE_CONCURRENCY: Number(process.env.QUEUE_CONCURRENCY) || 3,
      BATCH_SIZE: Number(process.env.BATCH_SIZE) || 50,
      QUEUE_MAX_ATTEMPTS: Number(process.env.QUEUE_MAX_ATTEMPTS) || 3,
      QUEUE_BACKOFF_DELAY_MS: Number(process.env.QUEUE_BACKOFF_DELAY_MS) || 2000,
    },
  };
};
