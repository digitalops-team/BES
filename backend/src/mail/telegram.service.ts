import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import axios from 'axios';

@Injectable()
export class TelegramService {
  private readonly logger = new Logger(TelegramService.name);

  constructor(private readonly prisma: PrismaService) {}

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
    } catch (error: any) {
      this.logger.error(`Error enviando notificación por Telegram: ${error.message}`);
    }
  }

  /**
   * Envia la alerta de Telegram unicamente a los usuarios propietarios o asignados a la empresa dada.
   */
  async sendAlertToEmpresa(empresaId: string, empresaNombre: string, asunto: string) {
    const empresa = await this.prisma.empresa.findUnique({
      where: { id: empresaId },
      select: { usuarioId: true },
    });

    if (!empresa) {
      this.logger.warn(`No se encontró la empresa ${empresaId} para enviar alertas de Telegram`);
      return;
    }

    const [creador, asignaciones] = await Promise.all([
      this.prisma.usuario.findUnique({
        where: { id: empresa.usuarioId },
        select: { telegramChatId: true },
      }),
      this.prisma.empresaAsignacion.findMany({
        where: { empresaId },
        include: { usuario: { select: { telegramChatId: true } } },
      }),
    ]);

    const chatIds = new Set<string>();

    if (creador?.telegramChatId) {
      chatIds.add(creador.telegramChatId.trim());
    }

    for (const asig of asignaciones) {
      if (asig.usuario?.telegramChatId) {
        chatIds.add(asig.usuario.telegramChatId.trim());
      }
    }

    const globalChatId = process.env.TELEGRAM_CHAT_ID;
    if (globalChatId && !globalChatId.includes('tu_chat_id')) {
      chatIds.add(globalChatId.trim());
    }

    if (chatIds.size === 0) {
      this.logger.debug(`Ningún usuario asignado a "${empresaNombre}" tiene un telegramChatId configurado.`);
      return;
    }

    this.logger.log(`Enviando alertas de Telegram para "${empresaNombre}" a ${chatIds.size} destinatario(s)...`);

    for (const chatId of chatIds) {
      await this.sendAlert(chatId, empresaNombre, asunto);
    }
  }
}
