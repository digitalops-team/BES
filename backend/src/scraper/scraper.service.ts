import { Injectable, Logger } from '@nestjs/common';
import puppeteer, { Page } from 'puppeteer';
import { PrismaService } from '../prisma.service';
import { EncryptionService } from '../encryption/encryption.service';
import { MailService } from '../mail/mail.service';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class ScraperService {
  private readonly logger = new Logger(ScraperService.name);

  private readonly proxies = [];

  constructor(
    private readonly prisma: PrismaService,
    private readonly encryptionService: EncryptionService,
    private readonly mailService: MailService,
  ) {}

  cleanUtf8(text: string): string {
    if (!text) return '';
    let result = text.trim();
    try {
      // Detectar mojibake: caracteres típicos de texto UTF-8 leído como latin1
      // Ej: "ó" leído como latin1 produce "Ã³", "°" produce "Â°"
      if (result.includes('Ã') || result.includes('Â')) {
        const decoded = Buffer.from(result, 'latin1').toString('utf8');
        // Verificar que la decodificación mejoró el texto (no introdujo caracteres inválidos)
        if (decoded && !/\uFFFD/.test(decoded)) {
          result = decoded.trim();
        }
      }
    } catch (e) {
      /* ignore */
    }
    return result;
  }

  async updateSyncStatus(empresaId: string, status: string) {
    await this.prisma.empresa.update({
      where: { id: empresaId },
      data: { estadoSincro: status },
    });
  }

  private async handleSunatPopups(page: Page) {
    this.logger.log(
      'Comprobando ventanas emergentes o pantallas de validación de SUNAT en todos los frames...',
    );
    try {
      // Esperar a que el DOM y los frames carguen
      await new Promise((r) => setTimeout(r, 4500));

      const frames = page.frames();
      this.logger.log(
        `Detectados ${frames.length} frames en total para analizar.`,
      );

      // 1. Detectar y presionar 'Finalizar' en cualquier frame
      let clickedFinalizar = false;
      for (const frame of frames) {
        try {
          const clicked = await frame.evaluate(() => {
            const selectors = [
              'button',
              'input[type="button"]',
              'a',
              '[role="button"]',
              'span',
              'div',
            ];
            for (const selector of selectors) {
              const elements = Array.from(document.querySelectorAll(selector));
              const btn = elements.find((el) => {
                const text = el.textContent?.trim().toUpperCase() || '';
                return text.includes('FINALIZAR') && text.length < 20;
              });
              if (btn) {
                (btn as HTMLElement).click();
                return true;
              }
            }
            return false;
          });
          if (clicked) {
            clickedFinalizar = true;
            this.logger.log(
              `Se presionó el botón "Finalizar" en el frame: ${frame.url()}`,
            );
            break;
          }
        } catch (frameError) {
          // Ignorar errores de CORS/seguridad en frames remotos
        }
      }

      if (clickedFinalizar) {
        await new Promise((r) => setTimeout(r, 3000));
      }

      // 2. Detectar y presionar 'Continuar sin confirmar' en cualquier frame
      let clickedContinuar = false;
      for (const frame of page.frames()) {
        try {
          const clicked = await frame.evaluate(() => {
            const selectors = [
              'button',
              'input[type="button"]',
              'a',
              '[role="button"]',
              'span',
              'div',
            ];
            for (const selector of selectors) {
              const elements = Array.from(document.querySelectorAll(selector));
              const btn = elements.find((el) => {
                const text = el.textContent?.trim().toUpperCase() || '';
                return (
                  text.includes('CONTINUAR SIN CONFIRMAR') ||
                  (text.includes('CONTINUAR') && text.length < 30)
                );
              });
              if (btn) {
                (btn as HTMLElement).click();
                return true;
              }
            }
            return false;
          });
          if (clicked) {
            clickedContinuar = true;
            this.logger.log(
              `Se presionó el botón "Continuar sin confirmar" en el frame: ${frame.url()}`,
            );
            break;
          }
        } catch (frameError) {
          // Ignorar
        }
      }

      if (clickedContinuar) {
        await new Promise((r) => setTimeout(r, 4500));
      }

      // 3. Cerrar avisos genéricos o banners típicos en cualquier frame
      for (const frame of page.frames()) {
        try {
          const closed = await frame.evaluate(() => {
            const closeBtn = document.querySelector(
              'button[aria-label="Close"], .modal-header .close, #btnCerrarAviso',
            ) as HTMLElement;
            if (closeBtn) {
              closeBtn.click();
              return true;
            }
            return false;
          });
          if (closed) {
            this.logger.log(
              `Se cerró un aviso/modal genérico en el frame: ${frame.url()}`,
            );
            await new Promise((r) => setTimeout(r, 1500));
            break;
          }
        } catch (frameError) {
          // Ignorar
        }
      }
    } catch (e) {
      this.logger.warn(`Error al manejar popups de SUNAT: ${e.message}`);
    }
  }

  async checkBuzonForEmpresa(empresaId: string) {
    this.logger.log(`Iniciando revisión de buzón para la empresa ${empresaId}`);
    const empresa = await this.prisma.empresa.findUnique({
      where: { id: empresaId },
      include: { usuario: true },
    });

    if (!empresa) {
      throw new Error(`Empresa con ID ${empresaId} no encontrada.`);
    }

    const password = this.encryptionService.decrypt(empresa.claveSol);

    const isHeadless =
      process.env.PUPPETEER_HEADLESS?.replace(/['"]/g, '').trim() === 'true';
    this.logger.log(
      `Iniciando Puppeteer. Variable de entorno PUPPETEER_HEADLESS: "${process.env.PUPPETEER_HEADLESS}" -> ¿Modo Oculto?: ${isHeadless}`,
    );

    const browser = await puppeteer.launch({
      headless: isHeadless,
      defaultViewport: { width: 1920, height: 1080 },
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--start-maximized',
        '--disable-dev-shm-usage',
        '--disable-gpu',
        '--no-first-run',
        '--no-zygote',
        '--incognito',
        '--disable-features=PasswordLeakDetection,AutofillServerCommunication',
        '--disable-save-password-bubble',
        '--password-store=basic',
      ],
    });

    const context = await browser.createBrowserContext();
    const page = await context.newPage();
    page.setDefaultNavigationTimeout(60000);

    await page.setUserAgent(
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    );
    await page.setExtraHTTPHeaders({
      'Accept-Language': 'es-ES,es;q=0.9',
    });

    page.on('dialog', async (dialog) => {
      this.logger.log(
        `Diálogo detectado: [${dialog.type()}] ${dialog.message()}. Aceptando...`,
      );
      await dialog.accept();
    });

    try {
      this.logger.log(`Navegando a SUNAT para RUC ${empresa.ruc}`);
      const sunatPortalUrl =
        'https://e-menu.sunat.gob.pe/cl-ti-itmenu/MenuInternet.htm';

      let connected = false;
      for (let i = 0; i < 3; i++) {
        try {
          await page.goto(sunatPortalUrl, {
            waitUntil: 'networkidle0',
            timeout: 60000,
          });
          connected = true;
          break;
        } catch (e) {
          this.logger.warn(
            `Intento ${i + 1} fallido (RUC ${empresa.ruc}), reintentando en 5s...`,
          );
          await new Promise((r) => setTimeout(r, 5000));
        }
      }

      if (!connected)
        throw new Error(
          'No se pudo establecer conexión con SUNAT tras varios intentos.',
        );

      await page.waitForSelector('#txtRuc', { timeout: 20000 });
      await page.type('#txtRuc', empresa.ruc);
      await page.type('#txtUsuario', empresa.usuarioSol);
      await page.type('#txtContrasena', password);

      await new Promise((r) => setTimeout(r, 1000));

      this.logger.log(
        `Haciendo clic y esperando dashboard principal de SUNAT...`,
      );
      // Prevenir Race Condition: Lanzamos la promesa de navegación ANTES o al mismo tiempo que el clic
      await Promise.all([
        page
          .waitForNavigation({ waitUntil: 'networkidle2', timeout: 60000 })
          .catch(() => null),
        page.click('#btnAceptar'),
      ]);

      // Evasión de ventanas emergentes o validación de contacto de SUNAT
      await this.handleSunatPopups(page);

      // Verificación de seguridad: Comprobar que realmente estamos dentro
      const isLogged = await page.evaluate(() => {
        return !!document.querySelector(
          '#aBuzon, .icon-buzon, [title*="Buzón"]',
        );
      });

      if (!isLogged) {
        this.logger.warn(
          '⚠️ No se detectó el buzón tras el login, posible pantalla de confirmación extra...',
        );
      }

      await new Promise((r) => setTimeout(r, 2000));
      this.logger.log(`Navegando automáticamente al Buzón Electrónico...`);

      try {
        const closeButton = await page.$(
          'button[aria-label="Close"], .modal-header .close, #btnCerrarAviso',
        );
        if (closeButton) await closeButton.click();

        const buzonButton = await page.evaluateHandle(() => {
          return [...document.querySelectorAll('a, button')].find((el) =>
            el.textContent?.includes('Buzón Electrónico'),
          );
        });

        if (buzonButton && (buzonButton as any).asElement()) {
          await (buzonButton as any).asElement().click();
        } else {
          await page.waitForSelector('#aBuzon, .icon-buzon, [title*="Buzón"]', {
            timeout: 5000,
          });
          await page.click('#aBuzon, .icon-buzon, [title*="Buzón"]');
        }
      } catch (e) {
        await page.goto(
          'https://e-menu.sunat.gob.pe/cl-ti-itmenu/MenuInternet.htm?pestana=*&agrupacion=*',
          { waitUntil: 'networkidle2' },
        );
      }

      await new Promise((r) => setTimeout(r, 20000));

      const uploadDir = path.join(process.cwd(), 'uploads');
      if (!fs.existsSync(uploadDir))
        fs.mkdirSync(uploadDir, { recursive: true });

      let notificacionesExtraidas: any[] = [];
      const notificacionesNuevas: any[] = []; // Solo las que NO existen en BD
      const pdfsFallidos: { asunto: string; fecha: string }[] = [];
      const anoActual = new Date().getFullYear();

      // IDEMPOTENCIA: Cargar fileIds ya existentes en BD para esta empresa (1 sola query)
      const registrosExistentes = await this.prisma.notificacion.findMany({
        where: { empresaId: empresa.id },
        select: { fileId: true },
      });
      const fileIdsExistentes = new Set(
        registrosExistentes.map((r) => r.fileId).filter(Boolean),
      );

      try {
        const framesList = page.frames();
        const mainFrame = framesList.find(
          (f) => f.url().includes('visor') || f.url().includes('master'),
        );

        if (mainFrame) {
          this.logger.log(`Frame de buzón detectado: ${mainFrame.url()}`);
          await mainFrame.evaluate(() => {
            window.print = () => {};
          });

          // Evaluación masiva dentro del navegador para evitar saturación IPC

          // NUEVO: Evaluación masiva dentro del navegador (1000x más rápido y no se cuelga)
          const containersHandles = await mainFrame.evaluateHandle(() => {
            const elements = Array.from(document.querySelectorAll('*'));
            const uniqueRows = new Set<HTMLElement>();

            for (const node of elements) {
              const text = (node as HTMLElement).innerText || '';
              // Buscar el patrón de fecha típico de SUNAT
              if (
                /^\d{2}\/\d{2}\/\d{4}\s+\d{2}:\d{2}/.test(text.trim()) &&
                node.childNodes.length <= 1
              ) {
                let p = node.parentElement;
                // Subir en el DOM hasta encontrar la fila contenedora (TR, LI o div con clase row)
                while (
                  p &&
                  p.tagName !== 'TR' &&
                  p.tagName !== 'LI' &&
                  !p.className.includes('row')
                ) {
                  p = p.parentElement;
                }
                if (p) uniqueRows.add(p);
              }
            }
            // Devolver un array limpio con las filas
            return Array.from(uniqueRows);
          });

          // Convertir la respuesta del navegador en un array de ElementHandles para Node.js
          const properties = await containersHandles.getProperties();
          const containersArray = [];
          for (const property of properties.values()) {
            const element = property.asElement();
            if (element) containersArray.push(element);
          }

          this.logger.log(
            `Detectadas ${containersArray.length} filas reales procesadas en milisegundos.`,
          );

          let lastFileId = '';
          let consecutivasAnioAnterior = 0; // Counter para break temprano

          for (const container of containersArray) {
            try {
              const rowData = await (container as any).evaluate(
                (node: HTMLElement) => {
                  return {
                    fullText: node.innerText,
                    asunto:
                      node.querySelector(
                        '.asunto, [class*="asunto"], b, strong',
                      )?.textContent || node.innerText.split('\n')[0],
                  };
                },
              );

              // FIX DE FECHA: Leer desde el texto de la FILA, no del body completo
              const rowDateMatch =
                rowData.fullText.match(
                  /(\d{2}\/\d{2}\/\d{4}\s+\d{2}:\d{2}:\d{2})/,
                ) || rowData.fullText.match(/(\d{2}\/\d{2}\/\d{4})/);

              if (!rowDateMatch) {
                this.logger.warn(
                  `⚠️ No se pudo extraer fecha de la fila. Saltando.`,
                );
                continue;
              }

              // Parsear fecha y hora para el filtro de año y registro en BD
              const parts = rowDateMatch[1].includes(':')
                ? rowDateMatch[1].split(/[\s\/:]/)
                : [...rowDateMatch[1].split('/'), '0', '0', '0'];
              const rowFecha = new Date(
                parseInt(parts[2]),
                parseInt(parts[1]) - 1,
                parseInt(parts[0]),
                parseInt(parts[3] || '0'),
                parseInt(parts[4] || '0'),
                parseInt(parts[5] || '0'),
              );

              // BREAK TEMPRANO: Si esta fila es del año anterior, aumentar contador
              if (rowFecha.getFullYear() < anoActual) {
                consecutivasAnioAnterior++;
                this.logger.log(
                  `⏭️ Fila del ${rowFecha.getFullYear()} (${consecutivasAnioAnterior}/2 consecutivas): ${rowData.asunto.substring(0, 50)}`,
                );
                if (consecutivasAnioAnterior >= 2) {
                  this.logger.log(
                    `⏹️ 2 filas consecutivas del año anterior. Deteniendo escaneo.`,
                  );
                  break;
                }
                continue;
              }
              consecutivasAnioAnterior = 0; // Reset si encontramos una del año actual

              await (container as any).evaluate((node: HTMLElement) => {
                node.scrollIntoView();
                const link = node.querySelector('a, span');
                if (link) (link as HTMLElement).click();
                node.click();
              });

              let currentId = '';
              for (let i = 0; i < 6; i++) {
                await new Promise((r) => setTimeout(r, 2000));
                currentId = await mainFrame.evaluate(() => {
                  const match = document.body.innerHTML.match(
                    /bajarArchivo\/(\d{9,13})/,
                  );
                  return match ? match[1] : '';
                });
                if (currentId && currentId !== lastFileId) break;
              }
              lastFileId = currentId;

              // IDEMPOTENCIA: Si este fileId ya existe en BD, saltar (no descargar ni insertar)
              if (currentId && fileIdsExistentes.has(currentId)) {
                this.logger.log(
                  `⏭️ Ya existe en BD: ${currentId}. Saltando descarga.`,
                );
                continue;
              }

              const data = await mainFrame.evaluate(() => {
                const visor = document.querySelector(
                  'iframe[src*="visor"], #divDetalleMensaje, [id*="visor"], .constancia-container',
                );
                return {
                  text: document.body.innerText,
                  html: visor ? visor.outerHTML : document.body.innerHTML,
                };
              });

              const textBlock = data.text;
              const htmlBlock = data.html;
              // Usar la fecha ya extraída de la fila (rowDateMatch / rowFecha)
              const dateMatch = rowDateMatch;

              if (dateMatch) {
                let asunto = this.cleanUtf8(rowData.asunto.trim());
                if (!asunto.toUpperCase().includes('ASUNTO:'))
                  asunto = `ASUNTO: ${asunto}`;
                const tipoMensaje = asunto.toUpperCase().includes('NOTIFICACI')
                  ? 'NOTIFICACION'
                  : 'MENSAJE';

                // Usar la fecha ya parseada desde la fila
                const fechaMensaje = rowFecha;

                // A1: El filtro de año ya fue aplicado arriba con rowFecha, no hace falta repetir

                // --- ESTRATEGIA SUPREMA: EXTRACCIÓN PROFUNDA (ANTICOLISIONES) ---
                // 1. Iniciamos en null. Nunca guardes rutas dummy en BD para evitar errores 404 en el frontend.
                let finalHref = null;
                let fileId = null;

                try {
                  this.logger.log(
                    `🎯 Ejecutando escaneo profundo del DOM (incluyendo iframes internos)...`,
                  );

                  const docInfo = await mainFrame.evaluate(() => {
                    // Recolectar elementos del frame principal
                    let allElements = Array.from(
                      document.querySelectorAll('a, span, u, b, div'),
                    );

                    // Atravesar la barrera de los iframes anidados (el visor interno de SUNAT)
                    const iframes = document.querySelectorAll('iframe');
                    iframes.forEach((iframe) => {
                      try {
                        if (iframe.contentDocument) {
                          const iframeElements = Array.from(
                            iframe.contentDocument.querySelectorAll(
                              'a, span, u, b, div',
                            ),
                          );
                          allElements = allElements.concat(iframeElements);
                        }
                      } catch (e) {
                        /* Ignorar bloqueos de CORS si el iframe es externo */
                      }
                    });

                    for (const el of allElements) {
                      const text = el.textContent?.trim().toLowerCase() || '';
                      // Analizar el código fuente real del elemento
                      const html = el.outerHTML?.toLowerCase() || '';

                      // REGLA 1: Filtrar elementos de constancia
                      if (
                        text.includes('constancia') ||
                        html.includes('constancia')
                      ) {
                        continue;
                      }

                      // REGLA 2: Regex robusto sobre el HTML crudo
                      const idMatch = html.match(
                        /(?:bajararchivo(?:\/|['"]|%27)|goarchivodescarga\s*\(\s*['"]?)(\d{8,15})/i,
                      );

                      if (idMatch && idMatch[1]) {
                        // Buscamos algo que DE VERDAD parezca un código de resolución (que contenga al menos 5 números seguidos)
                        const textNumber = text.match(
                          /\b([a-z0-9-]*\d{5,}[a-z0-9-]*)\b/i,
                        );
                        const visualId = textNumber
                          ? textNumber[0].toUpperCase()
                          : idMatch[1];
                        return { internalId: idMatch[1], visualId };
                      }
                    }
                    return null;
                  });

                  if (docInfo && docInfo.internalId) {
                    // CLAVE: Usar internalId para garantizar unicidad en BD y en disco
                    fileId = docInfo.internalId;
                    this.logger.log(
                      `✅ ¡ID interno capturado tras escaneo profundo!: ${docInfo.internalId} (Visual: ${docInfo.visualId})`,
                    );

                    const sunatUrl = `https://ww1.sunat.gob.pe/ol-ti-itvisornoti/visor/bajarArchivo/${docInfo.internalId}/0/0/${empresa.ruc}`;

                    // Fetch silencioso
                    const base64Data = await mainFrame.evaluate(async (url) => {
                      try {
                        const response = await fetch(url);
                        if (!response.ok) return null;
                        const blob = await response.blob();
                        return new Promise<string>((resolve) => {
                          const reader = new FileReader();
                          reader.onloadend = () =>
                            resolve(reader.result as string);
                          reader.readAsDataURL(blob);
                        });
                      } catch (err) {
                        return null;
                      }
                    }, sunatUrl);

                    if (base64Data && base64Data.includes(',')) {
                      const buffer = Buffer.from(
                        base64Data.split(',')[1],
                        'base64',
                      );

                      // Validamos que sea mayor a 1KB o que empiece con la firma mágica de un PDF '%PDF'
                      if (
                        buffer.length > 1000 ||
                        buffer.toString('utf8', 0, 4) === '%PDF'
                      ) {
                        const fileName = `${docInfo.internalId}.pdf`; // <-- Nombre de archivo 100% único
                        const filePath = path.join(uploadDir, fileName);
                        fs.writeFileSync(filePath, buffer);
                        const backendUrl =
                          process.env.BACKEND_URL || 'http://localhost:4000';
                        finalHref = `${backendUrl}/uploads/${fileName}`;
                        this.logger.log(
                          `🚀 ¡Jaque Mate! Documento físico guardado: ${fileName}`,
                        );
                      } else {
                        this.logger.warn(
                          `⚠️ Intento 1 (escaneo profundo) devolvió buffer inválido para: ${asunto.substring(0, 50)}`,
                        );
                      }
                    }
                  } else {
                    // SEGUNDO ESCANEO DE RESPALDO: Para Resoluciones de Conclusión donde el texto
                    // contiene "constancia" y el escaneo profundo lo descartó.
                    // Buscamos TODOS los IDs bajarArchivo en el HTML crudo y elegimos uno
                    // diferente al currentId (que ya capturó la constancia del primer paso).
                    this.logger.log(
                      `🔍 Segundo escaneo: buscando IDs alternativos en el HTML crudo...`,
                    );

                    const allIds = await mainFrame.evaluate(() => {
                      const matches = document.body.innerHTML.match(
                        /bajarArchivo\/(\d{8,15})/g,
                      );
                      if (!matches) return [];
                      return matches.map((m) => {
                        const idMatch = m.match(/(\d{8,15})/);
                        return idMatch ? idMatch[1] : '';
                      }).filter((id) => id !== '');
                    });

                    // Buscar un ID diferente a currentId (que es la constancia) y diferente al RUC
                    const alternativeId = allIds.find(
                      (id) => id !== currentId && id !== empresa.ruc,
                    );

                    if (alternativeId) {
                      fileId = alternativeId;
                      this.logger.log(
                        `✅ ¡ID alternativo encontrado!: ${alternativeId} (constancia era: ${currentId})`,
                      );

                      const sunatUrl = `https://ww1.sunat.gob.pe/ol-ti-itvisornoti/visor/bajarArchivo/${alternativeId}/0/0/${empresa.ruc}`;

                      const base64Data = await mainFrame.evaluate(async (url) => {
                        try {
                          const response = await fetch(url);
                          if (!response.ok) return null;
                          const blob = await response.blob();
                          return new Promise<string>((resolve) => {
                            const reader = new FileReader();
                            reader.onloadend = () =>
                              resolve(reader.result as string);
                            reader.readAsDataURL(blob);
                          });
                        } catch (err) {
                          return null;
                        }
                      }, sunatUrl);

                      if (base64Data && base64Data.includes(',')) {
                        const buffer = Buffer.from(
                          base64Data.split(',')[1],
                          'base64',
                        );

                        if (
                          buffer.length > 1000 ||
                          buffer.toString('utf8', 0, 4) === '%PDF'
                        ) {
                          const fileName = `${alternativeId}.pdf`;
                          const filePath = path.join(uploadDir, fileName);
                          fs.writeFileSync(filePath, buffer);
                          const backendUrl =
                            process.env.BACKEND_URL || 'http://localhost:4000';
                          finalHref = `${backendUrl}/uploads/${fileName}`;
                          this.logger.log(
                            `🚀 ¡PDF de resolución recuperado exitosamente!: ${fileName}`,
                          );
                        } else {
                          this.logger.warn(
                            `⚠️ Intento 2 (escaneo alternativo) devolvió buffer inválido para: ${asunto.substring(0, 50)}`,
                          );
                        }
                      }
                    } else {
                      this.logger.warn(
                        `⚠️ Intento 2: No se encontró ID alternativo en el DOM para: ${asunto.substring(0, 50)}`,
                      );
                    }
                  }

                  // TERCER ESCANEO DE RESPALDO EN CALIENTE (gendocS01Alias / Form POST)
                  if (!finalHref) {
                    this.logger.log(
                      `🔍 Tercer escaneo: intentando extracción en caliente vía gendocS01Alias / Form POST para: ${asunto.substring(0, 50)}...`,
                    );
                    const inFlightResult = await this.extractGendocPdfInFlight(
                      page,
                      mainFrame,
                      asunto,
                      currentId,
                      empresa.ruc,
                      uploadDir,
                    );
                    if (inFlightResult) {
                      finalHref = inFlightResult.finalHref;
                      if (inFlightResult.fileId) fileId = inFlightResult.fileId;
                    } else {
                      this.logger.warn(
                        `⚠️ PDF vacío/corrupto para: ${asunto.substring(0, 60)}`,
                      );
                      pdfsFallidos.push({ asunto, fecha: dateMatch[1] });
                    }
                  }
                } catch (e) {
                  this.logger.error(
                    `❌ Error fatal en la estrategia de extraccion: ${e.message}`,
                  );
                  pdfsFallidos.push({ asunto, fecha: dateMatch[1] });
                }

                if (tipoMensaje === 'NOTIFICACION') {
                  // Agregar a la lista de NUEVAS (no duplicadas) para insertar
                  notificacionesNuevas.push({
                    empresaId: empresa.id,
                    fileId: fileId || null, // ID único de SUNAT
                    asunto:
                      asunto.length > 200
                        ? asunto.substring(0, 197) + '...'
                        : asunto,
                    fechaMensaje,
                    tipo: tipoMensaje,
                    estado: finalHref ? 'NO_LEIDO' : 'SIN_PDF',
                    rutaArchivoPdf: finalHref,
                  });
                }
              }
              // MEJORA ANTI-BAN: Pausa entre notificaciones para no saturar SUNAT
              await new Promise((r) => setTimeout(r, 1500));
            } catch (err) {
              this.logger.warn(`Error en fila: ${err.message}`);
            }
          }
        }
        notificacionesExtraidas = notificacionesNuevas;
      } catch (domError) {
        this.logger.error('Fallo crítico:', domError);
      }

      // IDEMPOTENCIA: Solo insertar las nuevas (no existentes en BD)
      // skipDuplicates: true maneja silenciosamente duplicados del mismo ciclo (mismo fileId procesado dos veces)
      if (notificacionesNuevas.length > 0) {
        const result = await this.prisma.notificacion.createMany({
          data: notificacionesNuevas,
          skipDuplicates: true,
        });
        this.logger.log(
          `📦 ${result.count} nueva(s) notificacion(es) insertada(s) en BD. (${notificacionesNuevas.length - result.count} duplicado(s) omitido(s))`,
        );
      } else {
        this.logger.log(
          `✅ Sin nuevas notificaciones. La BD ya estaba al día.`,
        );
      }

      for (const notif of notificacionesExtraidas) {
        if (
          notif.asunto.toLowerCase().includes('orden de pago') ||
          notif.asunto.toLowerCase().includes('esquela')
        ) {
          // MEJORA: Retry de email con backoff exponencial para evitar ECONNRESET
          let emailSent = false;
          for (let attempt = 1; attempt <= 3; attempt++) {
            try {
              await this.mailService.sendUrgentAlert(
                empresa.usuario.email,
                empresa.razonSocial,
                notif.asunto,
              );
              emailSent = true;
              break;
            } catch (mailErr) {
              this.logger.warn(
                `⚠️ Intento ${attempt}/3 de email falló: ${mailErr.message}. ${attempt < 3 ? `Reintentando en ${attempt * 3}s...` : 'Abandonando.'}`,
              );
              if (attempt < 3)
                await new Promise((r) => setTimeout(r, attempt * 3000));
            }
          }
          if (!emailSent)
            this.logger.error(
              `❌ No se pudo enviar email de alerta para: ${notif.asunto}`,
            );
        }
      }

      // B3: EMAIL RESUMEN — Un solo correo al final con todos los PDFs que no se pudieron descargar
      if (pdfsFallidos.length > 0) {
        this.logger.warn(
          `📋 ${pdfsFallidos.length} documento(s) sin PDF. Enviando resumen al admin...`,
        );
        try {
          await this.mailService.sendPdfFailureSummary(
            empresa.usuario.email,
            empresa.razonSocial,
            pdfsFallidos,
          );
        } catch (mailErr) {
          this.logger.error(
            `❌ No se pudo enviar el resumen de PDFs fallidos: ${mailErr.message}`,
          );
        }
      }

      await this.prisma.empresa.update({
        where: { id: empresaId },
        data: { ultimaSincronizacion: new Date() },
      });
    } catch (error) {
      this.logger.error(`Error Scraping:`, error);
      throw error;
    } finally {
      await new Promise((r) => setTimeout(r, 5000));
      if (browser) await browser.close();
    }
  }

  async fixCorruptAsuntos() {
    this.logger.log('🔧 Iniciando limpieza de asuntos corruptos en BD...');
    const notifs = await this.prisma.notificacion.findMany({
      where: {
        OR: [
          { asunto: { contains: 'Ã' } },
          { asunto: { contains: 'Â' } },
        ],
      },
      select: { id: true, asunto: true },
    });

    this.logger.log(`🔍 Encontradas ${notifs.length} notificaciones con asunto corrupto.`);

    let fixed = 0;
    for (const notif of notifs) {
      const cleaned = this.cleanUtf8(notif.asunto);
      if (cleaned !== notif.asunto) {
        await this.prisma.notificacion.update({
          where: { id: notif.id },
          data: { asunto: cleaned },
        });
        fixed++;
      }
    }

    this.logger.log(`✅ ${fixed} asuntos corregidos en BD.`);
    return { fixed, total: notifs.length };
  }

  private async extractGendocPdfInFlight(
    page: any,
    visorFrame: any,
    asunto: string,
    currentId: string,
    empresaRuc: string,
    uploadDir: string,
  ): Promise<{ finalHref: string; fileId: string } | null> {
    try {
      this.logger.log(
        `🔄 Intentando extracción en caliente de PDF de resolución (gendocS01Alias)...`,
      );
      const numResMatch = asunto.match(/(\d{10,15})/);
      const numResolucion = numResMatch ? numResMatch[1] : '';

      let capturedPdfUrl: string | null = null;
      const requestListener = (req: any) => {
        const url: string = req.url();
        if (
          url.includes('gendocS01') ||
          url.includes('fisca') ||
          (url.includes('sunat') && url.endsWith('.pdf')) ||
          url.includes('genPDF') ||
          url.includes('generarDoc')
        ) {
          this.logger.log(
            `🎯 Request interceptada en caliente: ${url.substring(0, 120)}`,
          );
          capturedPdfUrl = url;
          req.continue();
        } else {
          req.continue();
        }
      };

      await page.setRequestInterception(true);
      page.on('request', requestListener);

      const blueLinkClicked = await visorFrame.evaluate(
        (kw: string, fid: string) => {
          const allLinks = Array.from(document.querySelectorAll('a'));

          if (kw) {
            const exactLink = allLinks.find((a) =>
              (a.textContent || '').includes(kw),
            );
            if (exactLink) {
              exactLink.click();
              return `exact: ${exactLink.textContent?.substring(0, 50)}`;
            }
          }

          if (fid) {
            const fidLink = allLinks.find((a) => a.outerHTML.includes(fid));
            if (fidLink) {
              fidLink.click();
              return `fid: ${fidLink.textContent?.substring(0, 50)}`;
            }
          }

          const conclusionLink = allLinks.find((a) => {
            const text = (a.textContent || '').trim();
            const isSidebar = a.closest(
              'nav, #sidebar, .sidebar, #menu, ul.nav',
            );
            return (
              text.includes('Conclusi') &&
              !text.toLowerCase().includes('ejecuci') &&
              !isSidebar &&
              text.length < 100
            );
          });
          if (conclusionLink) {
            conclusionLink.click();
            return `conclusion: ${conclusionLink.textContent?.substring(0, 50)}`;
          }

          return 'not-found';
        },
        numResolucion,
        currentId,
      );

      this.logger.log(`🔗 Click en link azul (en caliente): ${blueLinkClicked}`);
      await new Promise((r) => setTimeout(r, 4000));

      page.off('request', requestListener);
      await page.setRequestInterception(false);

      if (capturedPdfUrl) {
        const pdfUrlStr = capturedPdfUrl as string;
        if (
          pdfUrlStr.includes('accion=genhtml') ||
          pdfUrlStr.includes('gendocS01')
        ) {
          this.logger.log(
            `🔍 Procesando vista HTML / Form de gendocS01Alias en caliente...`,
          );

          const datosMatch = pdfUrlStr.match(/datos=(\{[^}]+\})/);
          let idArchivoFromDatos = currentId;
          if (datosMatch) {
            try {
              const decoded = decodeURIComponent(datosMatch[1]);
              const parsed = JSON.parse(decoded);
              idArchivoFromDatos = parsed.id_archivo || currentId;
            } catch (_) {}
          }

          const formResult = await visorFrame.evaluate(
            async (genhtmlUrl: string, idArchivo: string) => {
              try {
                const gendocDirectUrl = genhtmlUrl.replace(
                  'accion=genhtml',
                  'accion=gendoc',
                );
                try {
                  const resDirect = await fetch(gendocDirectUrl, {
                    credentials: 'include',
                  });
                  if (resDirect.ok) {
                    const buf = await resDirect.arrayBuffer();
                    const u8 = new Uint8Array(buf);
                    if (
                      u8.length > 500 &&
                      u8[0] === 0x25 &&
                      u8[1] === 0x50 &&
                      u8[2] === 0x44 &&
                      u8[3] === 0x46
                    ) {
                      return {
                        type: 'pdf',
                        bytes: Array.from(u8),
                        url: gendocDirectUrl,
                      };
                    }
                  }
                } catch (_) {}

                const resHtml = await fetch(genhtmlUrl, {
                  credentials: 'include',
                });
                const textHtml = await resHtml.text();

                const fiscaMatch =
                  textHtml.match(
                    /(https?:\/\/[^\s"'<>]*fisca[^\s"'<>]*\.pdf)/i,
                  ) ||
                  textHtml.match(/["'](\/[^\s"'<>]*fisca[^\s"'<>]*\.pdf)["']/i);
                if (fiscaMatch) {
                  const pdfHref = fiscaMatch[1].startsWith('http')
                    ? fiscaMatch[1]
                    : 'https://ww1.sunat.gob.pe' + fiscaMatch[1];
                  const pdfResp = await fetch(pdfHref, {
                    credentials: 'include',
                  });
                  const arrayBuf = await pdfResp.arrayBuffer();
                  return {
                    type: 'pdf',
                    bytes: Array.from(new Uint8Array(arrayBuf)),
                    url: pdfHref,
                  };
                }

                let codMensajeFromDatos = '';
                let idArchivoFromDatosParsed = idArchivo;
                let sistemaFromDatos = '6';

                if (genhtmlUrl.includes('datos=')) {
                  const m = genhtmlUrl.match(/datos=(\{[^}]+\})/);
                  if (m) {
                    try {
                      const decoded = decodeURIComponent(m[1]);
                      const obj = JSON.parse(decoded);
                      if (obj.cod_mensaje)
                        codMensajeFromDatos = String(obj.cod_mensaje);
                      if (obj.id_archivo)
                        idArchivoFromDatosParsed = String(obj.id_archivo);
                      if (obj.sistema) sistemaFromDatos = String(obj.sistema);
                    } catch (_) {}
                  }
                }

                if (!codMensajeFromDatos) {
                  const idMsgMatch =
                    textHtml.match(
                      /name=["']idMensaje["'][^>]*value=["']([^"']+)["']/i,
                    ) ||
                    textHtml.match(
                      /value=["']([^"']+)["'][^>]*name=["']idMensaje["']/i,
                    );
                  if (idMsgMatch) codMensajeFromDatos = idMsgMatch[1];
                }

                const bajarParams = new URLSearchParams();
                bajarParams.append('accion', 'archivo');
                bajarParams.append('idMensaje', codMensajeFromDatos);
                bajarParams.append('idArchivo', idArchivoFromDatosParsed);
                bajarParams.append('sistema', sistemaFromDatos);

                const bajarUrl =
                  'https://ww1.sunat.gob.pe/ol-ti-itvisornoti/visor/bajarArchivo';
                const bajarResp = await fetch(bajarUrl, {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                  },
                  body: bajarParams.toString(),
                  credentials: 'include',
                });

                const bajarBuf = await bajarResp.arrayBuffer();
                const u8Bajar = new Uint8Array(bajarBuf);
                if (
                  u8Bajar.length > 500 &&
                  u8Bajar[0] === 0x25 &&
                  u8Bajar[1] === 0x50 &&
                  u8Bajar[2] === 0x44 &&
                  u8Bajar[3] === 0x46
                ) {
                  return {
                    type: 'pdf',
                    bytes: Array.from(u8Bajar),
                    url: bajarUrl,
                  };
                }

                const anexosParams = new URLSearchParams();
                anexosParams.append('accion', 'archivoConAnexos');
                anexosParams.append('idMensaje', codMensajeFromDatos);
                anexosParams.append('idArchivo', idArchivoFromDatosParsed);
                anexosParams.append('sistema', sistemaFromDatos);

                const anexosResp = await fetch(bajarUrl, {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                  },
                  body: anexosParams.toString(),
                  credentials: 'include',
                });

                const anexosBuf = await anexosResp.arrayBuffer();
                const u8Anexos = new Uint8Array(anexosBuf);
                if (
                  u8Anexos.length > 500 &&
                  u8Anexos[0] === 0x25 &&
                  u8Anexos[1] === 0x50 &&
                  u8Anexos[2] === 0x44 &&
                  u8Anexos[3] === 0x46
                ) {
                  return {
                    type: 'pdf',
                    bytes: Array.from(u8Anexos),
                    url: bajarUrl,
                  };
                }

                return { type: 'none' };
              } catch (err: any) {
                return { type: 'error', text: String(err) };
              }
            },
            pdfUrlStr,
            idArchivoFromDatos,
          );

          if (
            formResult?.type === 'pdf' &&
            formResult.bytes &&
            formResult.bytes.length > 500
          ) {
            const pdfBuffer = Buffer.from(formResult.bytes);
            const resId = numResolucion || currentId || idArchivoFromDatos;
            const fileName = `${resId}_resolucion.pdf`;
            const filePath = path.join(uploadDir, fileName);
            fs.writeFileSync(filePath, pdfBuffer);
            const backendUrl =
              process.env.BACKEND_URL || 'http://localhost:4000';
            const pdfRuta = `${backendUrl}/uploads/${fileName}`;
            this.logger.log(
              `✅ ¡ÉXITO! PDF de resolución guardado en caliente vía Form POST (${pdfBuffer.length} bytes): ${fileName}`,
            );
            return { finalHref: pdfRuta, fileId: resId };
          }
        }
      }
    } catch (err: any) {
      this.logger.warn(`⚠️ Excepción en extracción en caliente: ${err.message}`);
    }
    return null;
  }

  async retryPdf(notificacionId: string) {
    const notif = await this.prisma.notificacion.findUnique({
      where: { id: notificacionId },
      include: { empresa: true },
    });

    if (!notif) throw new Error('Notificación no encontrada');

    let targetFileId: string | null = null;

    const cleanedAsunto = (notif.asunto || '').replace(/RUC:?\s*\d+/gi, '');
    const numMatches = cleanedAsunto.match(/\b\d+(?:-\d+)*\b/g);
    if (numMatches) {
      for (const rawNum of numMatches) {
        const digitsOnly = rawNum.replace(/\D/g, '');
        if (digitsOnly.length >= 9 && digitsOnly.length <= 15 && digitsOnly !== notif.empresa.ruc) {
          targetFileId = digitsOnly;
          this.logger.log(`📌 ID extraído del asunto: ${digitsOnly} (fileId en BD era: ${notif.fileId})`);
          break;
        }
      }
    }

    if (!targetFileId) {
      targetFileId = notif.fileId;
    }

    if (!targetFileId || targetFileId === notif.empresa.ruc) {
      throw new Error('No se encontró un ID de archivo válido para esta notificación.');
    }

    const uploadDir = path.join(process.cwd(), 'uploads');
    if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

    const fileName = `${targetFileId}.pdf`;
    const filePath = path.join(uploadDir, fileName);
    const backendUrl = process.env.BACKEND_URL || 'http://localhost:4000';
    const finalHref = `${backendUrl}/uploads/${fileName}`;

    if (fs.existsSync(filePath)) {
      const buf = fs.readFileSync(filePath);
      if (buf.length > 1000 || buf.toString('utf8', 0, 4) === '%PDF') {
        await this.prisma.notificacion.update({
          where: { id: notificacionId },
          data: { rutaArchivoPdf: finalHref, estado: 'NO_LEIDO', fileId: targetFileId },
        });
        return { success: true, rutaArchivoPdf: finalHref };
      }
    }

    const empresa = notif.empresa;
    this.logger.log(`🔄 Reintentando PDF (${targetFileId}) para ${empresa.razonSocial}...`);

    const isHeadless =
      process.env.PUPPETEER_HEADLESS?.replace(/['"]/g, '').trim() === 'true';

    let browser;
    try {
      browser = await puppeteer.launch({
        headless: isHeadless,
        defaultViewport: { width: 1920, height: 1080 },
        args: [
          '--no-sandbox', '--disable-setuid-sandbox', '--start-maximized',
          '--disable-dev-shm-usage', '--disable-gpu', '--no-first-run',
          '--no-zygote', '--incognito',
          '--disable-features=PasswordLeakDetection,AutofillServerCommunication',
          '--disable-save-password-bubble', '--password-store=basic',
        ],
      });

      const context = await browser.createBrowserContext();
      const page = await context.newPage();
      page.setDefaultNavigationTimeout(60000);
      await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36');
      await page.setExtraHTTPHeaders({ 'Accept-Language': 'es-ES,es;q=0.9' });

      const password = this.encryptionService.decrypt(empresa.claveSol);

      // Login en portal SUNAT
      let connected = false;
      for (let i = 0; i < 3; i++) {
        try {
          await page.goto('https://e-menu.sunat.gob.pe/cl-ti-itmenu/MenuInternet.htm', {
            waitUntil: 'networkidle0', timeout: 60000,
          });
          connected = true;
          break;
        } catch (e) {
          await new Promise((r) => setTimeout(r, 3000));
        }
      }
      if (!connected) throw new Error('No se pudo conectar al portal de SUNAT.');

      await page.waitForSelector('#txtRuc', { timeout: 20000 });
      await page.type('#txtRuc', empresa.ruc);
      await page.type('#txtUsuario', empresa.usuarioSol);
      await page.type('#txtContrasena', password);
      await new Promise((r) => setTimeout(r, 1000));
      await Promise.all([
        page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 60000 }).catch(() => null),
        page.click('#btnAceptar'),
      ]);
      await this.handleSunatPopups(page);

      // ── NAVEGACIÓN AL BUZÓN: idéntica a checkBuzonForEmpresa ──────────────
      await new Promise((r) => setTimeout(r, 2000));
      this.logger.log(`🌐 Navegando al Buzón Electrónico...`);

      try {
        const closeButton = await page.$('button[aria-label="Close"], .modal-header .close, #btnCerrarAviso');
        if (closeButton) await closeButton.click();

        const buzonButton = await page.evaluateHandle(() =>
          [...document.querySelectorAll('a, button')].find((el) =>
            el.textContent?.includes('Buzón Electrónico'),
          ),
        );
        if (buzonButton && (buzonButton as any).asElement()) {
          await (buzonButton as any).asElement().click();
        } else {
          await page.waitForSelector('#aBuzon, .icon-buzon, [title*="Buzón"]', { timeout: 5000 });
          await page.click('#aBuzon, .icon-buzon, [title*="Buzón"]');
        }
      } catch {
        await page.goto(
          'https://e-menu.sunat.gob.pe/cl-ti-itmenu/MenuInternet.htm?pestana=*&agrupacion=*',
          { waitUntil: 'networkidle2' },
        );
      }

      // Esperar a que el Buzón cargue completamente (iframes internos)
      this.logger.log(`⏳ Esperando carga completa del Buzón (20s)...`);
      await new Promise((r) => setTimeout(r, 20000));

      // Obtener el frame del visor (igual que en checkBuzonForEmpresa)
      const framesList = page.frames();
      this.logger.log(`🔍 Frames activos: ${framesList.map((f) => f.url().substring(0, 70)).join(' | ')}`);

      const visorFrame = framesList.find(
        (f) => f.url().includes('visor') || f.url().includes('master'),
      );

      if (!visorFrame) {
        throw new Error('No se encontró el frame del Buzón. SUNAT puede haber bloqueado la sesión.');
      }

      this.logger.log(`📡 Frame del visor: ${visorFrame.url().substring(0, 80)}`);

      // ── PASO 1: Click en la fila correcta usando textContent (no innerHTML) ──
      // Busca celdas cuyo texto VISIBLE contenga el número de la resolución (no el href)
      const asuntoKeyword = targetFileId; // ej: "1630070849092"
      const constanciaId = notif.fileId ?? '';

      this.logger.log(`🖱️ Buscando fila por texto visible (${asuntoKeyword})...`);

      const clickedRow = await visorFrame.evaluate((kw: string, fid: string, asuntoText: string) => {
        const rows = Array.from(document.querySelectorAll('tr, li, div.row, div[class*="item"]'));
        for (const row of rows) {
          const text = (row.textContent || '').replace(/\s+/g, ' ').trim();
          const html = row.outerHTML || '';
          if (
            (kw && (text.includes(kw) || html.includes(kw))) ||
            (fid && (text.includes(fid) || html.includes(fid))) ||
            (asuntoText && text.includes(asuntoText))
          ) {
            const clickable = (row as HTMLElement).querySelector('a, span, td') as HTMLElement || (row as HTMLElement);
            clickable.click();
            return `found: ${text.substring(0, 60)}`;
          }
        }
        return 'not-found';
      }, asuntoKeyword, constanciaId, notif.asunto ? notif.asunto.replace('ASUNTO: ', '').substring(0, 30) : '');

      this.logger.log(`🖱️ Resultado click fila: ${clickedRow}`);
      await new Promise((r) => setTimeout(r, 5000)); // Esperar que cargue la constancia

      // ── PASO 2: Interceptar click en el link azul ──
      // Configurar intercepción ANTES del click
      let capturedPdfUrl: string | null = null;

      const requestListener = (req: any) => {
        const url: string = req.url();
        if (
          url.includes('gendocS01') ||
          url.includes('fisca') ||
          (url.includes('sunat') && url.endsWith('.pdf')) ||
          url.includes('genPDF') ||
          url.includes('generarDoc')
        ) {
          this.logger.log(`🎯 Request interceptada: ${url.substring(0, 120)}`);
          capturedPdfUrl = url;
          req.continue();
        } else {
          req.continue();
        }
      };

      await page.setRequestInterception(true);
      page.on('request', requestListener);

      // Hacer click en el link azul (panel de detalle, evitando nav/sidebar)
      const blueLinkClicked = await visorFrame.evaluate((kw: string, fid: string) => {
        const allLinks = Array.from(document.querySelectorAll('a'));

        // 1. Link con número exacto de resolución
        const exactLink = allLinks.find((a) => (a.textContent || '').includes(kw));
        if (exactLink) { exactLink.click(); return `exact: ${exactLink.textContent?.substring(0, 50)}`; }

        // 2. Link con fileId / constanciaId
        if (fid) {
          const fidLink = allLinks.find((a) => a.outerHTML.includes(fid));
          if (fidLink) { fidLink.click(); return `fid: ${fidLink.textContent?.substring(0, 50)}`; }
        }

        // 3. Link de Conclusión (excluyendo menú lateral)
        const conclusionLink = allLinks.find((a) => {
          const text = (a.textContent || '').trim();
          const isSidebar = a.closest('nav, #sidebar, .sidebar, #menu, ul.nav');
          return text.includes('Conclusi') && !text.toLowerCase().includes('ejecuci') && !isSidebar && text.length < 100;
        });
        if (conclusionLink) { conclusionLink.click(); return `conclusion: ${conclusionLink.textContent?.substring(0, 50)}`; }

        return 'not-found';
      }, asuntoKeyword, constanciaId);

      this.logger.log(`🔗 Click en link azul: ${blueLinkClicked}`);
      await new Promise((r) => setTimeout(r, 5000));

      page.off('request', requestListener);
      await page.setRequestInterception(false);

      this.logger.log(`🔗 URL capturada: ${capturedPdfUrl ?? 'ninguna'}`);

      // ── PASO 3: Resolver la URL final del PDF ──
      // Si capturamos gendocS01Alias?accion=genhtml → ese endpoint devuelve HTML (no PDF)
      // Necesitamos buscar la URL fisca*.pdf DENTRO de esa página HTML.
      const allBajarIds = await visorFrame.evaluate(() => {
        const matches = document.body.innerHTML.match(/bajarArchivo\/(\d{8,15})/g) || [];
        return [...new Set(matches.map((m) => {
          const match = m.match(/(\d{8,15})/);
          return match ? match[1] : '';
        }).filter(Boolean))];
      });
      this.logger.log(`🔎 IDs bajarArchivo en DOM (fallback): [${allBajarIds.join(', ')}]`);

      let downloadUrl: string;
      let resolvedFileId: string;

      if (capturedPdfUrl) {
        const pdfUrlStr = capturedPdfUrl as string;

        // Si el URL es genhtml o gendocS01Alias, procesar el HTML/Form de la resolución
        if (pdfUrlStr.includes('accion=genhtml') || pdfUrlStr.includes('gendocS01')) {
          this.logger.log(`🔍 Procesando vista HTML / Form de gendocS01Alias...`);

          const datosMatch = pdfUrlStr.match(/datos=(\{[^}]+\})/);
          let idArchivoFromDatos = constanciaId;
          if (datosMatch) {
            try {
              const decoded = decodeURIComponent(datosMatch[1]);
              const parsed = JSON.parse(decoded);
              idArchivoFromDatos = parsed.id_archivo || constanciaId;
            } catch (_) { /* usar constanciaId */ }
          }
          this.logger.log(`📋 id_archivo extraído del datos JSON: ${idArchivoFromDatos}`);

          // Ejecutar en el navegador: Probar accion=gendoc directo -> Regex fisca*.pdf -> Regex inputs Form POST
          const formResult = await visorFrame.evaluate(async (genhtmlUrl: string, idArchivo: string) => {
            try {
              // Estrategia A: Reemplazar accion=genhtml por accion=gendoc directamente
              const gendocDirectUrl = genhtmlUrl.replace('accion=genhtml', 'accion=gendoc');
              try {
                const resDirect = await fetch(gendocDirectUrl, { credentials: 'include' });
                if (resDirect.ok) {
                  const buf = await resDirect.arrayBuffer();
                  const u8 = new Uint8Array(buf);
                  // Verificar si empieza con %PDF (0x25, 0x50, 0x44, 0x46)
                  if (u8.length > 500 && u8[0] === 0x25 && u8[1] === 0x50 && u8[2] === 0x44 && u8[3] === 0x46) {
                    return { type: 'pdf', bytes: Array.from(u8), url: gendocDirectUrl };
                  }
                }
              } catch (_) { /* continuar */ }

              // Estrategia B: Fetch de la página genhtml y guardar en debug para inspección
              const resHtml = await fetch(genhtmlUrl, { credentials: 'include' });
              const textHtml = await resHtml.text();

              // Guardar textHtml en window para que el backend lo pueda leer si es necesario
              (window as any).__lastGenHtml = textHtml;

              // Buscar link a fisca*.pdf
              const fiscaMatch = textHtml.match(/(https?:\/\/[^\s"'<>]*fisca[^\s"'<>]*\.pdf)/i) ||
                textHtml.match(/["'](\/[^\s"'<>]*fisca[^\s"'<>]*\.pdf)["']/i);
              if (fiscaMatch) {
                const pdfHref = fiscaMatch[1].startsWith('http') ? fiscaMatch[1] : 'https://ww1.sunat.gob.pe' + fiscaMatch[1];
                const pdfResp = await fetch(pdfHref, { credentials: 'include' });
                const arrayBuf = await pdfResp.arrayBuffer();
                return { type: 'pdf', bytes: Array.from(new Uint8Array(arrayBuf)), url: pdfHref };
              }

              // Extraer idMensaje e idArchivo del datos JSON o de textHtml
              let codMensajeFromDatos = '';
              let idArchivoFromDatosParsed = idArchivo;
              let sistemaFromDatos = '6';

              if (genhtmlUrl.includes('datos=')) {
                const m = genhtmlUrl.match(/datos=(\{[^}]+\})/);
                if (m) {
                  try {
                    const decoded = decodeURIComponent(m[1]);
                    const obj = JSON.parse(decoded);
                    if (obj.cod_mensaje) codMensajeFromDatos = String(obj.cod_mensaje);
                    if (obj.id_archivo) idArchivoFromDatosParsed = String(obj.id_archivo);
                    if (obj.sistema) sistemaFromDatos = String(obj.sistema);
                  } catch (_) {}
                }
              }

              if (!codMensajeFromDatos) {
                const idMsgMatch = textHtml.match(/name=["']idMensaje["'][^>]*value=["']([^"']+)["']/i) ||
                  textHtml.match(/value=["']([^"']+)["'][^>]*name=["']idMensaje["']/i);
                if (idMsgMatch) codMensajeFromDatos = idMsgMatch[1];
              }

              // Estrategia C: POST exacto de SUNAT (frmArchivo -> bajarArchivo)
              const bajarParams = new URLSearchParams();
              bajarParams.append('accion', 'archivo');
              bajarParams.append('idMensaje', codMensajeFromDatos);
              bajarParams.append('idArchivo', idArchivoFromDatosParsed);
              bajarParams.append('sistema', sistemaFromDatos);

              const bajarUrl = 'https://ww1.sunat.gob.pe/ol-ti-itvisornoti/visor/bajarArchivo';
              const bajarResp = await fetch(bajarUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: bajarParams.toString(),
                credentials: 'include',
              });

              const bajarBuf = await bajarResp.arrayBuffer();
              const u8Bajar = new Uint8Array(bajarBuf);
              if (u8Bajar.length > 500 && u8Bajar[0] === 0x25 && u8Bajar[1] === 0x50 && u8Bajar[2] === 0x44 && u8Bajar[3] === 0x46) {
                return { type: 'pdf', bytes: Array.from(u8Bajar), url: bajarUrl, details: bajarParams.toString() };
              }

              // Estrategia D: POST con anexos (frmFileAndAttacheds -> bajarArchivo)
              const anexosParams = new URLSearchParams();
              anexosParams.append('accion', 'archivoConAnexos');
              anexosParams.append('idMensaje', codMensajeFromDatos);
              anexosParams.append('idArchivo', idArchivoFromDatosParsed);
              anexosParams.append('sistema', sistemaFromDatos);

              const anexosResp = await fetch(bajarUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: anexosParams.toString(),
                credentials: 'include',
              });

              const anexosBuf = await anexosResp.arrayBuffer();
              const u8Anexos = new Uint8Array(anexosBuf);
              if (u8Anexos.length > 500 && u8Anexos[0] === 0x25 && u8Anexos[1] === 0x50 && u8Anexos[2] === 0x44 && u8Anexos[3] === 0x46) {
                return { type: 'pdf', bytes: Array.from(u8Anexos), url: bajarUrl, details: anexosParams.toString() };
              }

              const debugText = new TextDecoder().decode(u8Bajar.subarray(0, 500));
              return {
                type: 'debug',
                text: debugText,
                details: bajarParams.toString(),
                action: bajarUrl,
              };
            } catch (err: any) {
              return { type: 'error', text: String(err) };
            }
          }, pdfUrlStr, idArchivoFromDatos);

          this.logger.log(`🔍 Resultado form submission: type=${formResult?.type}, url=${(formResult as any)?.url || (formResult as any)?.action}`);

          if (formResult?.type !== 'pdf') {
            try {
              const htmlDebug = await visorFrame.evaluate(() => (window as any).__lastGenHtml || '');
              if (htmlDebug) {
                fs.writeFileSync(path.join(uploadDir, 'debug_genhtml.html'), htmlDebug);
                this.logger.log(`💾 HTML de depuración guardado en uploads/debug_genhtml.html (${htmlDebug.length} bytes)`);
              }
            } catch (_) {}
          }

          if (formResult?.type === 'pdf' && formResult.bytes && formResult.bytes.length > 500) {
            const pdfBuffer = Buffer.from(formResult.bytes);
            const fileName = `${targetFileId || idArchivoFromDatos}_resolucion.pdf`;
            const filePath = path.join(uploadDir, fileName);
            fs.writeFileSync(filePath, pdfBuffer);
            const backendUrl = process.env.BACKEND_URL || 'http://localhost:4000';
            const pdfRuta = `${backendUrl}/uploads/${fileName}`;
            this.logger.log(`✅ ¡ÉXITO! PDF de resolución guardado vía Form POST (${pdfBuffer.length} bytes): ${fileName}`);

            try {
              await this.prisma.notificacion.update({
                where: { id: notif.id },
                data: { rutaArchivoPdf: pdfRuta, estado: 'NO_LEIDO', fileId: idArchivoFromDatos },
              });
            } catch (dbErr: any) {
              if (dbErr.code === 'P2002') {
                await this.prisma.notificacion.update({
                  where: { id: notif.id },
                  data: { rutaArchivoPdf: pdfRuta, estado: 'NO_LEIDO' },
                });
              }
            }
            return await this.prisma.notificacion.findUnique({ where: { id: notif.id } });
          } else {
            this.logger.warn(`⚠️ Detalle Form POST: details="${(formResult as any)?.details}", debugText="${(formResult as any)?.text?.substring(0, 300)}"`);
          }

          // Fallback
          const innerPdfUrl = `BAJAR:${idArchivoFromDatos}`;

          this.logger.log(`🔍 innerPdfUrl resultado: ${(innerPdfUrl ?? 'null').substring(0, 150)}`);

          if (innerPdfUrl && (innerPdfUrl.startsWith('HTMLCONTENT:') || innerPdfUrl.startsWith('ERROR:'))) {
            this.logger.warn(`📄 Contenido genhtml completo: ${innerPdfUrl.substring(12, 1800)}`);
            // No encontramos PDF → usar bajarArchivo con constanciaId como último recurso
            const fallbackId = constanciaId || targetFileId;
            resolvedFileId = fallbackId;
            downloadUrl = `https://ww1.sunat.gob.pe/ol-ti-itvisornoti/visor/bajarArchivo/${fallbackId}/0/0/${empresa.ruc}`;
          } else if (innerPdfUrl && innerPdfUrl.startsWith('BAJAR:')) {
            const idFromHtml = innerPdfUrl.replace('BAJAR:', '');
            resolvedFileId = idFromHtml;
            downloadUrl = `https://ww1.sunat.gob.pe/ol-ti-itvisornoti/visor/bajarArchivo/${idFromHtml}/0/0/${empresa.ruc}`;
          } else if (innerPdfUrl) {
            downloadUrl = innerPdfUrl;
            const filenameMatch = innerPdfUrl.match(/fisca(\d+)\.pdf/);
            resolvedFileId = filenameMatch ? filenameMatch[1] : (targetFileId || constanciaId);
          } else {
            // Último fallback: bajarArchivo con el primer ID del DOM
            const fallbackId = allBajarIds.find(
              (id) => id !== constanciaId && id !== empresa.ruc && id !== targetFileId,
            ) || allBajarIds.find((id) => id !== empresa.ruc) || constanciaId;
            resolvedFileId = fallbackId;
            downloadUrl = `https://ww1.sunat.gob.pe/ol-ti-itvisornoti/visor/bajarArchivo/${fallbackId}/0/0/${empresa.ruc}`;
          }
        } else {
          // URL directa (fisca*.pdf u otro formato)
          downloadUrl = pdfUrlStr;
          const filenameMatch = pdfUrlStr.match(/fisca(\d+)\.pdf/) ||
            pdfUrlStr.match(/[?&][^&]*?(\d{10,20})/);
          resolvedFileId = filenameMatch ? filenameMatch[1] : (targetFileId || constanciaId);
        }
      } else {
        // No se capturó ninguna URL: fallback a bajarArchivo
        const fallbackId = allBajarIds.find(
          (id) => id !== constanciaId && id !== empresa.ruc && id !== targetFileId,
        ) || allBajarIds.find((id) => id !== empresa.ruc) || constanciaId;
        resolvedFileId = fallbackId;
        downloadUrl = `https://ww1.sunat.gob.pe/ol-ti-itvisornoti/visor/bajarArchivo/${fallbackId}/0/0/${empresa.ruc}`;
      }

      this.logger.log(`🎯 ID resuelto: ${resolvedFileId}`);
      this.logger.log(`📥 URL de descarga final: ${downloadUrl}`);

      let pdfBuffer: Buffer | null = null;

      for (let attempt = 1; attempt <= 5; attempt++) {
        try {
          this.logger.log(`🔄 Intento ${attempt}/5 de descarga del PDF...`);
          const base64Data = await visorFrame.evaluate(async (url) => {
            try {
              const response = await fetch(url, { credentials: 'include' });
              if (!response.ok) return `ERR:${response.status}`;
              const blob = await response.blob();
              return new Promise<string>((resolve) => {
                const reader = new FileReader();
                reader.onloadend = () => resolve(reader.result as string);
                reader.readAsDataURL(blob);
              });
            } catch (e) { return `ERR:${String(e)}`; }
          }, downloadUrl);

          if (base64Data && typeof base64Data === 'string' && base64Data.startsWith('ERR:')) {
            this.logger.warn(`⚠️ Respuesta del fetch en intento ${attempt}: ${base64Data}`);
          } else if (base64Data && base64Data.includes(',')) {
            const buf = Buffer.from(base64Data.split(',')[1], 'base64');
            if (buf.length > 1000 || buf.toString('utf8', 0, 4) === '%PDF') {
              pdfBuffer = buf;
              this.logger.log(`✅ PDF obtenido en intento ${attempt}, tamaño: ${buf.length} bytes`);
              break;
            } else {
              this.logger.warn(`⚠️ Respuesta recibida pero no es PDF válido (${buf.length} bytes)`);
            }
          }
        } catch (fetchErr) {
          this.logger.warn(`⚠️ Error en intento ${attempt}: ${fetchErr}`);
        }
        if (attempt < 5) await new Promise((r) => setTimeout(r, attempt * 1500));
      }

      if (pdfBuffer) {
        const realFileName = `${resolvedFileId}.pdf`;
        const realFilePath = path.join(path.join(process.cwd(), 'uploads'), realFileName);
        const backendUrl = process.env.BACKEND_URL || 'http://localhost:4000';
        const realHref = `${backendUrl}/uploads/${realFileName}`;

        fs.writeFileSync(realFilePath, pdfBuffer);

        // Actualizar la notificación. Si el fileId ya existe en otra fila (unique constraint),
        // actualizar solo la ruta y el estado sin cambiar el fileId.
        try {
          await this.prisma.notificacion.update({
            where: { id: notificacionId },
            data: { rutaArchivoPdf: realHref, estado: 'NO_LEIDO', fileId: resolvedFileId },
          });
        } catch (dbErr: any) {
          if (dbErr?.code === 'P2002') {
            this.logger.warn(`⚠️ fileId ${resolvedFileId} ya existe en BD. Actualizando solo rutaArchivoPdf y estado...`);
            await this.prisma.notificacion.update({
              where: { id: notificacionId },
              data: { rutaArchivoPdf: realHref, estado: 'NO_LEIDO' },
            });
          } else {
            throw dbErr;
          }
        }

        this.logger.log(`✅ PDF recuperado exitosamente: ${realFileName}`);
        return { success: true, rutaArchivoPdf: realHref };
      } else {
        throw new Error('SUNAT no entregó el PDF tras 5 reintentos. Puede ser un comunicado sin adjunto.');
      }
    } finally {
      if (browser) await browser.close();
    }
  }
}

