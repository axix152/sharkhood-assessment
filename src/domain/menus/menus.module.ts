import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { MenuItem, MenuItemSchema } from './schemas/menu-item.schema';
import { MenuItemRepository } from './repositories/menu-item.repository';
import { MENU_ITEM_REPOSITORY } from '../../core/ports/repository.ports';

@Module({
  imports: [
    MongooseModule.forFeature(
      [{ name: MenuItem.name, schema: MenuItemSchema }],
      'target',
    ),
  ],
  providers: [
    {
      provide: MENU_ITEM_REPOSITORY,
      useClass: MenuItemRepository,
    },
    MenuItemRepository,
  ],
  exports: [MENU_ITEM_REPOSITORY, MenuItemRepository],
})
export class MenusModule {}
