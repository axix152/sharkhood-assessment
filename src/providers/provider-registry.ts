import { Injectable } from '@nestjs/common';
import { IProviderAdapter } from './provider-adapter.interface';

@Injectable()
export class ProviderRegistry {
  private readonly adapters = new Map<string, IProviderAdapter>();

  register(adapter: IProviderAdapter): void {
    if (this.adapters.has(adapter.providerName)) {
      throw new Error(`Provider adapter for '${adapter.providerName}' is already registered.`);
    }
    this.adapters.set(adapter.providerName, adapter);
  }

  get(providerName: string): IProviderAdapter {
    const adapter = this.adapters.get(providerName);
    if (!adapter) {
      const available = Array.from(this.adapters.keys()).join(', ');
      throw new Error(
        `No adapter registered for provider '${providerName}'. Available providers: [${available}]`,
      );
    }
    return adapter;
  }

  has(providerName: string): boolean {
    return this.adapters.has(providerName);
  }

  listProviders(): string[] {
    return Array.from(this.adapters.keys());
  }
}
