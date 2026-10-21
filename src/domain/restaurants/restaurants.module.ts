import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Restaurant, RestaurantSchema } from './schemas/restaurant.schema';
import { RestaurantRepository } from './repositories/restaurant.repository';
import { RESTAURANT_REPOSITORY } from '../../core/ports/repository.ports';

@Module({
  imports: [
    MongooseModule.forFeature(
      [{ name: Restaurant.name, schema: RestaurantSchema }],
      'target',
    ),
  ],
  providers: [
    {
      provide: RESTAURANT_REPOSITORY,
      useClass: RestaurantRepository,
    },
    RestaurantRepository,
  ],
  exports: [RESTAURANT_REPOSITORY, RestaurantRepository],
})
export class RestaurantsModule {}
