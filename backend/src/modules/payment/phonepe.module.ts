import { Module } from '@nestjs/common';
import { PhonePeService } from './phonepe.service';
import { PhonePeController } from './phonepe.controller';
import { WebsocketModule } from '../../websocket/websocket.module';

@Module({
  imports: [WebsocketModule],
  providers: [PhonePeService],
  controllers: [PhonePeController],
  exports: [PhonePeService]
})
export class PhonePeModule {}
