import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Location, LocationSchema } from './schemas/location.schema';
import { LocationRepository } from './repositories/location.repository';
import { LOCATION_REPOSITORY } from '../../core/ports/repository.ports';

@Module({
  imports: [
    MongooseModule.forFeature(
      [{ name: Location.name, schema: LocationSchema }],
      'target',
    ),
  ],
  providers: [
    {
      provide: LOCATION_REPOSITORY,
      useClass: LocationRepository,
    },
    LocationRepository,
  ],
  exports: [LOCATION_REPOSITORY, LocationRepository],
})
export class LocationsModule {}
