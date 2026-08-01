import { Global, Module } from '@nestjs/common';
import { MailService } from './mail.service';
import { TelegramService } from './telegram.service';
import { WhatsappService } from './whatsapp.service';

@Global()
@Module({
  providers: [MailService, TelegramService, WhatsappService],
  exports: [MailService, TelegramService, WhatsappService],
})
export class MailModule {}
