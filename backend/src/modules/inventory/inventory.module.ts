import { Module } from '@nestjs/common';
import { InventoryController } from './inventory.controller';
import { InventoryService } from './inventory.service';
import { RecipeEngineService } from './recipe-engine.service';
import { StockLedgerService } from './stock-ledger.service';
import { WebsocketModule } from '../../websocket/websocket.module';

@Module({
  imports: [WebsocketModule],
  controllers: [InventoryController],
  providers: [
    InventoryService,
    RecipeEngineService,
    StockLedgerService
  ],
  exports: [InventoryService, RecipeEngineService, StockLedgerService]
})
export class InventoryModule {}
