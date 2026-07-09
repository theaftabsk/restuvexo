import { WebsocketModule } from '../../websocket/websocket.module';

import { Module } from '@nestjs/common';
import { DashboardController } from './dashboard.controller';
import { DashboardService } from './dashboard.service';



@Module({
  imports: [WebsocketModule],
  controllers: [DashboardController],
  providers: [
    DashboardService
    
    
  ],
  exports: [DashboardService]
})
export class DashboardModule {}
