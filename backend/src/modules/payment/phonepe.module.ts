import { Module } from '@nestjs/common';
import { PhonePeService } from './phonepe.service';
import { PhonePeController } from './phonepe.controller';

@Module({
  providers: [PhonePeService],
  controllers: [PhonePeController],
  exports: [PhonePeService]
})
export class PhonePeModule {}
