import { Injectable, Logger } from '@nestjs/common';
import * as fs from 'fs';

export interface ExtractedPdfInfo {
  montoExigible: string | null;
  expedienteCoactivo: string | null;
}

@Injectable()
export class PdfParserService {
  private readonly logger = new Logger(PdfParserService.name);

  async parsePdfBuffer(buffer: Buffer): Promise<ExtractedPdfInfo> {
    try {
      let text = '';
      const pdfParsePkg = require('pdf-parse');

      if (pdfParsePkg && pdfParsePkg.PDFParse) {
        const instance = new pdfParsePkg.PDFParse(new Uint8Array(buffer));
        const res = await instance.getText();
        text = typeof res === 'string' ? res : (res?.text || '');
      } else if (typeof pdfParsePkg === 'function') {
        const res = await pdfParsePkg(buffer);
        text = res?.text || '';
      } else if (pdfParsePkg && typeof pdfParsePkg.default === 'function') {
        const res = await pdfParsePkg.default(buffer);
        text = res?.text || '';
      }

      return this.extractFromText(text);
    } catch (error: any) {
      this.logger.error(`Error al extraer texto con pdf-parse: ${error?.message || error}`);
      return { montoExigible: null, expedienteCoactivo: null };
    }
  }

  async parsePdfFile(filePath: string): Promise<ExtractedPdfInfo> {
    try {
      if (!fs.existsSync(filePath)) {
        return { montoExigible: null, expedienteCoactivo: null };
      }
      const buffer = fs.readFileSync(filePath);
      return await this.parsePdfBuffer(buffer);
    } catch (error: any) {
      this.logger.error(`Error al leer archivo PDF ${filePath}: ${error?.message || error}`);
      return { montoExigible: null, expedienteCoactivo: null };
    }
  }

  public extractFromText(text: string): ExtractedPdfInfo {
    if (!text) return { montoExigible: null, expedienteCoactivo: null };

    const cleanText = text.replace(/\s+/g, ' ');

    let montoExigible: string | null = null;
    let expedienteCoactivo: string | null = null;

    // 1. Extraer expedientes coactivos
    const expRegexes = [
      /EXPEDIENTE\s*(?:NÚMERO|N°|Nº|NO\.?)\s*:?\s*([\w\-]{8,25})/i,
      /RESOLUCIÓN\s*(?:DE\s*EJECUCIÓN\s*COACTIVA|COACTIVA)?\s*N[°º.]?\s*:?\s*([\w\-]{8,25})/i,
      /EXPEDIENTE\s*:?\s*([\w\-]{8,25})/i,
    ];

    for (const reg of expRegexes) {
      const match = cleanText.match(reg);
      if (match && match[1]) {
        const val = match[1].trim();
        if (/\d{5,}/.test(val)) {
          expedienteCoactivo = val;
          break;
        }
      }
    }

    // 2. Extraer monto exigible
    const montoRegexes = [
      /total\s*deuda\s*exigible:?\s*(S\/?\.?\s*[\d,]+\.\d{2})/i,
      /asciende\s*a\s*la\s*suma\s*de:?\s*(S\/?\.?\s*[\d,]+\.\d{2})/i,
      /total\s*a\s*pagar:?\s*(S\/?\.?\s*[\d,]+\.\d{2})/i,
      /deuda\s*tributaria\s*pendiente[^\n\r]*?:?\s*(S\/?\.?\s*[\d,]+\.\d{2})/i,
      /monto\s*exigible:?\s*(S\/?\.?\s*[\d,]+\.\d{2})/i,
      /suma\s*de:?\s*(S\/?\.?\s*[\d,]+\.\d{2})/i,
      /(S\/?\.\s*[\d,]+\.\d{2})/i,
    ];

    for (const reg of montoRegexes) {
      const match = cleanText.match(reg);
      if (match && match[1]) {
        let val = match[1].trim();
        if (!val.startsWith('S/')) {
          val = val.replace(/^S\/?\.?\s*/i, 'S/ ');
        }
        montoExigible = val;
        break;
      }
    }

    return {
      montoExigible,
      expedienteCoactivo,
    };
  }
}
