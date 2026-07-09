
import { Module } from '@nestjs/common';
import { ExpenseController } from './expense.controller';
import { ExpenseService } from './expense.service';
import { WebsocketModule } from '../../websocket/websocket.module';


@Module({
  imports: [WebsocketModule],
  controllers: [ExpenseController],
  providers: [
    ExpenseService
    
    
  ],
  exports: [ExpenseService]
})
export class ExpenseModule {}
