import type { Config } from 'jest';

const config: Config = {
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: '.',
  testRegex: '.*\\.spec\\.ts$',
  transform: {
    '^.+\\.(t|j)s$': 'ts-jest',
  },
  collectCoverageFrom: [
    'src/**/*.(t|j)s',
    '!src/main.ts',
    '!src/**/*.module.ts',
    '!src/**/*.schema.ts',
    '!src/config/**',
  ],
  coverageDirectory: './coverage',
  testEnvironment: 'node',
  moduleNameMapper: {
    '^@config/(.*)$': '<rootDir>/src/config/$1',
    '^@core/(.*)$': '<rootDir>/src/core/$1',
    '^@domain/(.*)$': '<rootDir>/src/domain/$1',
    '^@providers/(.*)$': '<rootDir>/src/providers/$1',
    '^@runs/(.*)$': '<rootDir>/src/runs/$1',
    '^@queue/(.*)$': '<rootDir>/src/queue/$1',
    '^@health/(.*)$': '<rootDir>/src/health/$1',
  },
};

export default config;
