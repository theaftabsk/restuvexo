import { Module, Global } from '@nestjs/common';
import { SettingsService } from './settings.service';
import { EmailService } from './email.service';

@Global()
@Module({
  providers: [SettingsService, EmailService],
  exports: [SettingsService, EmailService],
})
export class SharedModule {}
