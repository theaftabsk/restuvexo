import { DashboardModule } from '../dashboard/dashboard.module';

import { Module } from '@nestjs/common';
import { TableController } from './table.controller';
import { TableService } from './table.service';

import { WebsocketModule } from '../../websocket/websocket.module';


@Module({
  imports: [DashboardModule, WebsocketModule, DashboardModule],
  controllers: [TableController],
  providers: [
    TableService
    
    
  ],
  exports: [TableService]
})
export class TableModule {}
