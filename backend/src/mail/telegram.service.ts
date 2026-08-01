import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';

@Injectable()
export class TelegramService {
  private readonly logger = new Logger(TelegramService.name);

  async sendAlert(chatId: string, empresaNombre: string, asunto: string) {
    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    if (!botToken || !chatId || botToken.includes('tu_bot_token') || chatId.includes('tu_chat_id')) {
      this.logger.debug('Telegram no configurado con credenciales reales. Omitiendo.');
      return;
    }

    const text = `🚨 *ALERTA URGENTE SUNAT* 🚨\n\n` +
      `🏢 *Empresa:* ${empresaNombre}\n` +
      `📄 *Asunto:* ${asunto}\n\n` +
      `⚠️ *Acción requerida:* Ingrese al panel BES para revisar el documento PDF inmediatamente y evitar multas o embargos.`;

    try {
      const url = `https://api.telegram.org/bot${botToken}/sendMessage`;
      await axios.post(url, {
        chat_id: chatId,
        text,
        parse_mode: 'Markdown',
      });
      this.logger.log(`Alerta de Telegram enviada a chatId: ${chatId}`);
    } catch (error) {
      this.logger.error(`Error enviando notificación por Telegram: ${error.message}`);
    }
  }
}
