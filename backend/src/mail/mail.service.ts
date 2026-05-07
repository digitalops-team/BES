import { Injectable, Logger } from '@nestjs/common';
import * as nodemailer from 'nodemailer';

@Injectable()
export class MailService {
  private transporter: nodemailer.Transporter;
  private readonly logger = new Logger(MailService.name);

  constructor() {
    this.initEthereal();
  }

  private async initEthereal() {
    // Cuenta de prueba Ethereal generada automáticamente para desarrollo
    nodemailer.createTestAccount((err, account) => {
      if (err) {
        this.logger.error('Error creando cuenta Ethereal: ' + err.message);
        return;
      }
      this.transporter = nodemailer.createTransport({
        host: account.smtp.host,
        port: account.smtp.port,
        secure: account.smtp.secure,
        auth: {
          user: account.user,
          pass: account.pass,
        },
      });
      this.logger.log(`Ethereal Email configurado: ${account.user}`);
    });
  }

  async sendUrgentAlert(to: string, empresaNombre: string, asunto: string) {
    if (!this.transporter) {
      this.logger.warn('Transporter no inicializado aún');
      return;
    }

    const info = await this.transporter.sendMail({
      from: '"BES Alertas" <alertas@bes.com>',
      to,
      subject: `⚠️ URGENTE: Nueva Notificación SUNAT - ${empresaNombre}`,
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px; border: 1px solid #ff4444; border-radius: 8px;">
          <h2 style="color: #ff4444;">Alerta Urgente SUNAT</h2>
          <p>Estimado usuario, el robot de BES ha detectado una notificación de alta prioridad para la empresa <strong>${empresaNombre}</strong>.</p>
          <p><strong>Asunto del documento:</strong> ${asunto}</p>
          <p>Por favor, inicie sesión en su panel de BES para revisar el documento PDF inmediatamente y evitar multas o embargos.</p>
          <br/>
          <a href="http://localhost:3001/dashboard" style="background-color: #2563eb; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; font-weight: bold;">Ver en BES Panel</a>
        </div>
      `,
    });

    this.logger.log(`Mensaje urgente enviado a ${to}. URL Ethereal: ${nodemailer.getTestMessageUrl(info)}`);
  }

  async sendPdfFailureSummary(to: string, empresaNombre: string, fallos: { asunto: string; fecha: string }[]) {
    if (!this.transporter) {
      this.logger.warn('Transporter no inicializado aún');
      return;
    }

    const listaHtml = fallos.map((f, i) => `
      <tr style="background:${i % 2 === 0 ? '#f9f9f9' : '#fff'}">
        <td style="padding:8px 12px; border-bottom:1px solid #eee;">${f.fecha}</td>
        <td style="padding:8px 12px; border-bottom:1px solid #eee;">${f.asunto}</td>
      </tr>
    `).join('');

    const info = await this.transporter.sendMail({
      from: '"BES Alertas" <alertas@bes.com>',
      to,
      subject: `📋 Resumen: ${fallos.length} documento(s) sin PDF - ${empresaNombre}`,
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px; border: 1px solid #f59e0b; border-radius: 8px; max-width: 700px;">
          <h2 style="color: #d97706;">⚠️ Documentos sin PDF disponible</h2>
          <p>Durante la sincronización de <strong>${empresaNombre}</strong>, los siguientes documentos fueron registrados pero <strong>no se pudo descargar su archivo PDF</strong> desde los servidores de SUNAT.</p>
          <p>Esto puede deberse a documentos expirados, permisos insuficientes o indisponibilidad temporal del servidor.</p>
          <br/>
          <table style="width:100%; border-collapse:collapse; font-size:14px;">
            <thead>
              <tr style="background:#f59e0b; color:white;">
                <th style="padding:10px 12px; text-align:left;">Fecha</th>
                <th style="padding:10px 12px; text-align:left;">Asunto</th>
              </tr>
            </thead>
            <tbody>${listaHtml}</tbody>
          </table>
          <br/>
          <p style="color:#666; font-size:13px;">Los títulos de estos documentos <strong>sí fueron guardados</strong> en el panel con estado "SIN PDF". Puede revisarlos iniciando sesión.</p>
          <a href="http://localhost:3001/dashboard" style="background-color:#d97706; color:white; padding:10px 20px; text-decoration:none; border-radius:5px; font-weight:bold; display:inline-block; margin-top:10px;">Ver en BES Panel</a>
        </div>
      `,
    });

    this.logger.log(`Resumen de PDFs fallidos enviado a ${to}. URL Ethereal: ${nodemailer.getTestMessageUrl(info)}`);
  }
}
