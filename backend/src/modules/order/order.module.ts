import { DashboardModule } from '../dashboard/dashboard.module';

import { Module } from '@nestjs/common';
import { OrderController } from './order.controller';
import { OrderService } from './order.service';

import { WebsocketModule } from '../../websocket/websocket.module';


@Module({
  imports: [DashboardModule, WebsocketModule, DashboardModule],
  controllers: [OrderController],
  providers: [
    OrderService
    
    
  ],
  exports: [OrderService]
})
export class OrderModule {}
