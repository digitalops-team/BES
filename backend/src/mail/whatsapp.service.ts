import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';

@Injectable()
export class WhatsappService {
  private readonly logger = new Logger(WhatsappService.name);

  async sendAlert(phoneNumber: string, empresaNombre: string, asunto: string) {
    const waToken = process.env.WHATSAPP_TOKEN;
    const waPhoneId = process.env.WHATSAPP_PHONE_ID;
    const waWebhookUrl = process.env.WHATSAPP_WEBHOOK_URL; // Para servicio local de WhatsApp (ej. Baileys / Evolution API)

    // Normalizar número telefónico (Prefijo de Perú 51 por defecto si tiene 9 dígitos)
    let cleanPhone = (phoneNumber || '').replace(/\D/g, '');
    if (cleanPhone.length === 9) {
      cleanPhone = `51${cleanPhone}`;
    }

    const text = `🚨 *ALERTA URGENTE SUNAT - BES*\n\n` +
      `*Empresa:* ${empresaNombre}\n` +
      `*Asunto:* ${asunto}\n\n` +
      `Por favor revise el panel BES para ver el PDF adjunto.`;

    if (waWebhookUrl) {
      try {
        await axios.post(waWebhookUrl, {
          number: cleanPhone,
          message: text,
        });
        this.logger.log(`Alerta de WhatsApp enviada a ${cleanPhone} vía Webhook local`);
        return;
      } catch (error) {
        this.logger.error(`Error en webhook de WhatsApp: ${error.message}`);
      }
    }

    if (waToken && waPhoneId) {
      try {
        const url = `https://graph.facebook.com/v18.0/${waPhoneId}/messages`;
        await axios.post(
          url,
          {
            messaging_product: 'whatsapp',
            to: cleanPhone,
            type: 'text',
            text: { body: text },
          },
          {
            headers: { Authorization: `Bearer ${waToken}` },
          },
        );
        this.logger.log(`Alerta de WhatsApp Cloud API enviada a ${cleanPhone}`);
      } catch (error) {
        this.logger.error(`Error enviando notificación por WhatsApp Cloud API: ${error.message}`);
      }
    } else {
      this.logger.debug('Variables de WhatsApp no configuradas. Omitiendo WhatsApp.');
    }
  }
}
