import { Module, OnModuleInit } from '@nestjs/common';
import { ProviderRegistry } from './provider-registry';
import { TalabatAdapter } from './talabat/talabat.adapter';

@Module({
  providers: [ProviderRegistry, TalabatAdapter],
  exports: [ProviderRegistry, TalabatAdapter],
})
export class ProvidersModule implements OnModuleInit {
  constructor(
    private readonly registry: ProviderRegistry,
    private readonly talabatAdapter: TalabatAdapter,
  ) {}

  onModuleInit(): void {
    // Automatically register supported adapters
    this.registry.register(this.talabatAdapter);
  }
}
