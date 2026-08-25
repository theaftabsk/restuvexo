import { DashboardModule } from '../dashboard/dashboard.module';

import { Module } from '@nestjs/common';
import { OrderController } from './order.controller';
import { OrderService } from './order.service';

import { WebsocketModule } from '../../websocket/websocket.module';


import { InventoryModule } from '../inventory/inventory.module';

@Module({
  imports: [DashboardModule, WebsocketModule, InventoryModule],
  controllers: [OrderController],
  providers: [
    OrderService
    
    
  ],
  exports: [OrderService]
})
export class OrderModule {}
