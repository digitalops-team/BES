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
    private readonly mailService: MailService
  ) {}

  async updateSyncStatus(empresaId: string, status: string) {
    await this.prisma.empresa.update({
      where: { id: empresaId },
      data: { estadoSincro: status },
    });
  }

  private async handleSunatPopups(page: Page) {
    this.logger.log('Comprobando ventanas emergentes o pantallas de validación de SUNAT en todos los frames...');
    try {
      // Esperar a que el DOM y los frames carguen
      await new Promise(r => setTimeout(r, 4500));

      const frames = page.frames();
      this.logger.log(`Detectados ${frames.length} frames en total para analizar.`);

      // 1. Detectar y presionar 'Finalizar' en cualquier frame
      let clickedFinalizar = false;
      for (const frame of frames) {
        try {
          const clicked = await frame.evaluate(() => {
            const selectors = ['button', 'input[type="button"]', 'a', '[role="button"]', 'span', 'div'];
            for (const selector of selectors) {
              const elements = Array.from(document.querySelectorAll(selector));
              const btn = elements.find(el => {
                const text = el.textContent?.trim().toUpperCase() || "";
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
            this.logger.log(`Se presionó el botón "Finalizar" en el frame: ${frame.url()}`);
            break;
          }
        } catch (frameError) {
          // Ignorar errores de CORS/seguridad en frames remotos
        }
      }

      if (clickedFinalizar) {
        await new Promise(r => setTimeout(r, 3000));
      }

      // 2. Detectar y presionar 'Continuar sin confirmar' en cualquier frame
      let clickedContinuar = false;
      for (const frame of page.frames()) {
        try {
          const clicked = await frame.evaluate(() => {
            const selectors = ['button', 'input[type="button"]', 'a', '[role="button"]', 'span', 'div'];
            for (const selector of selectors) {
              const elements = Array.from(document.querySelectorAll(selector));
              const btn = elements.find(el => {
                const text = el.textContent?.trim().toUpperCase() || "";
                return text.includes('CONTINUAR SIN CONFIRMAR') || (text.includes('CONTINUAR') && text.length < 30);
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
            this.logger.log(`Se presionó el botón "Continuar sin confirmar" en el frame: ${frame.url()}`);
            break;
          }
        } catch (frameError) {
          // Ignorar
        }
      }

      if (clickedContinuar) {
        await new Promise(r => setTimeout(r, 4500));
      }

      // 3. Cerrar avisos genéricos o banners típicos en cualquier frame
      for (const frame of page.frames()) {
        try {
          const closed = await frame.evaluate(() => {
            const closeBtn = document.querySelector('button[aria-label="Close"], .modal-header .close, #btnCerrarAviso') as HTMLElement;
            if (closeBtn) {
              closeBtn.click();
              return true;
            }
            return false;
          });
          if (closed) {
            this.logger.log(`Se cerró un aviso/modal genérico en el frame: ${frame.url()}`);
            await new Promise(r => setTimeout(r, 1500));
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
      include: { usuario: true }
    });

    if (!empresa) {
      throw new Error(`Empresa con ID ${empresaId} no encontrada.`);
    }

    const password = this.encryptionService.decrypt(empresa.claveSol);

    const browser = await puppeteer.launch({
      headless: process.env.PUPPETEER_HEADLESS === 'true',
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
        '--password-store=basic'
      ],
    });

    const context = await browser.createBrowserContext();
    const page = await context.newPage();
    page.setDefaultNavigationTimeout(60000);

    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36');
    await page.setExtraHTTPHeaders({
      'Accept-Language': 'es-ES,es;q=0.9'
    });

    page.on('dialog', async dialog => {
      this.logger.log(`Diálogo detectado: [${dialog.type()}] ${dialog.message()}. Aceptando...`);
      await dialog.accept();
    });

    try {
      this.logger.log(`Navegando a SUNAT para RUC ${empresa.ruc}`);
      const sunatPortalUrl = 'https://e-menu.sunat.gob.pe/cl-ti-itmenu/MenuInternet.htm';
      
      let connected = false;
      for (let i = 0; i < 3; i++) {
        try {
          await page.goto(sunatPortalUrl, { waitUntil: 'networkidle0', timeout: 60000 });
          connected = true;
          break;
        } catch (e) {
          this.logger.warn(`Intento ${i+1} fallido (RUC ${empresa.ruc}), reintentando en 5s...`);
          await new Promise(r => setTimeout(r, 5000));
        }
      }

      if (!connected) throw new Error('No se pudo establecer conexión con SUNAT tras varios intentos.');

      await page.waitForSelector('#txtRuc', { timeout: 20000 });
      await page.type('#txtRuc', empresa.ruc);
      await page.type('#txtUsuario', empresa.usuarioSol);
      await page.type('#txtContrasena', password);
      
      await new Promise(r => setTimeout(r, 1000));
      
      this.logger.log(`Haciendo clic y esperando dashboard principal de SUNAT...`);
      // Prevenir Race Condition: Lanzamos la promesa de navegación ANTES o al mismo tiempo que el clic
      await Promise.all([
          page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 60000 }).catch(() => null),
          page.click('#btnAceptar')
      ]);
      
      // Evasión de ventanas emergentes o validación de contacto de SUNAT
      await this.handleSunatPopups(page);
      
      // Verificación de seguridad: Comprobar que realmente estamos dentro
      const isLogged = await page.evaluate(() => {
          return !!document.querySelector('#aBuzon, .icon-buzon, [title*="Buzón"]');
      });
      
      if (!isLogged) {
          this.logger.warn('⚠️ No se detectó el buzón tras el login, posible pantalla de confirmación extra...');
      }
      
      await new Promise(r => setTimeout(r, 2000));
      this.logger.log(`Navegando automáticamente al Buzón Electrónico...`);
      
      try {
         const closeButton = await page.$('button[aria-label="Close"], .modal-header .close, #btnCerrarAviso');
         if (closeButton) await closeButton.click();

         const buzonButton = await page.evaluateHandle(() => {
            return [...document.querySelectorAll('a, button')].find(el => el.textContent?.includes('Buzón Electrónico'));
         });

         if (buzonButton && (buzonButton as any).asElement()) {
            await (buzonButton as any).asElement().click();
         } else {
            await page.waitForSelector('#aBuzon, .icon-buzon, [title*="Buzón"]', { timeout: 5000 });
            await page.click('#aBuzon, .icon-buzon, [title*="Buzón"]');
         }
      } catch (e) {
         await page.goto('https://e-menu.sunat.gob.pe/cl-ti-itmenu/MenuInternet.htm?pestana=*&agrupacion=*', { waitUntil: 'networkidle2' });
      }

      await new Promise(r => setTimeout(r, 20000));
      
      const uploadDir = path.join(process.cwd(), 'uploads');
      if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

      let notificacionesExtraidas: any[] = [];
      const notificacionesNuevas: any[] = []; // Solo las que NO existen en BD
      const pdfsFallidos: { asunto: string; fecha: string }[] = [];
      const anoActual = new Date().getFullYear();

      // IDEMPOTENCIA: Cargar fileIds ya existentes en BD para esta empresa (1 sola query)
      const registrosExistentes = await this.prisma.notificacion.findMany({
        where: { empresaId: empresa.id },
        select: { fileId: true }
      });
      const fileIdsExistentes = new Set(registrosExistentes.map(r => r.fileId).filter(Boolean));

      try {
        const framesList = page.frames();
        const mainFrame = framesList.find(f => f.url().includes('visor') || f.url().includes('master'));
        
        if (mainFrame) {
          this.logger.log(`Frame de buzón detectado: ${mainFrame.url()}`);
          await mainFrame.evaluate(() => { window.print = () => {}; });

          // Evaluación masiva dentro del navegador para evitar saturación IPC
          
          // NUEVO: Evaluación masiva dentro del navegador (1000x más rápido y no se cuelga)
          const containersHandles = await mainFrame.evaluateHandle(() => {
              const elements = Array.from(document.querySelectorAll('*'));
              const uniqueRows = new Set<HTMLElement>();
              
              for (const node of elements) {
                  const text = (node as HTMLElement).innerText || "";
                  // Buscar el patrón de fecha típico de SUNAT
                  if (/^\d{2}\/\d{2}\/\d{4}\s+\d{2}:\d{2}/.test(text.trim()) && node.childNodes.length <= 1) {
                      let p = node.parentElement;
                      // Subir en el DOM hasta encontrar la fila contenedora (TR, LI o div con clase row)
                      while (p && p.tagName !== "TR" && p.tagName !== "LI" && !p.className.includes("row")) { 
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

          this.logger.log(`Detectadas ${containersArray.length} filas reales procesadas en milisegundos.`);

          let lastFileId = "";
          let consecutivasAnioAnterior = 0; // Counter para break temprano

          for (const container of containersArray) {
             try {
                const rowData = await (container as any).evaluate((node: HTMLElement) => {
                   return {
                      fullText: node.innerText,
                      asunto: node.querySelector('.asunto, [class*="asunto"], b, strong')?.textContent || node.innerText.split('\n')[0]
                   };
                });

                // FIX DE FECHA: Leer desde el texto de la FILA, no del body completo
                const rowDateMatch = rowData.fullText.match(/(\d{2}\/\d{2}\/\d{4}\s+\d{2}:\d{2}:\d{2})/)
                                  || rowData.fullText.match(/(\d{2}\/\d{2}\/\d{4})/);

                if (!rowDateMatch) {
                   this.logger.warn(`⚠️ No se pudo extraer fecha de la fila. Saltando.`);
                   continue;
                }

                // Parsear fecha para el filtro de año
                const parts = rowDateMatch[1].includes(':') 
                   ? rowDateMatch[1].split(/[\s\/:]/)
                   : [...rowDateMatch[1].split('/'), '0', '0', '0'];
                const rowFecha = new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0]));

                // BREAK TEMPRANO: Si esta fila es del año anterior, aumentar contador
                if (rowFecha.getFullYear() < anoActual) {
                   consecutivasAnioAnterior++;
                   this.logger.log(`⏭️ Fila del ${rowFecha.getFullYear()} (${consecutivasAnioAnterior}/2 consecutivas): ${rowData.asunto.substring(0, 50)}`);
                   if (consecutivasAnioAnterior >= 2) {
                      this.logger.log(`⏹️ 2 filas consecutivas del año anterior. Deteniendo escaneo.`);
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
                
                let currentId = "";
                for (let i = 0; i < 6; i++) {
                   await new Promise(r => setTimeout(r, 2000));
                   currentId = await mainFrame.evaluate(() => {
                      const match = document.body.innerHTML.match(/bajarArchivo\/(\d{9,13})/);
                      return match ? match[1] : "";
                   });
                   if (currentId && currentId !== lastFileId) break;
                }
                lastFileId = currentId;

                // IDEMPOTENCIA: Si este fileId ya existe en BD, saltar (no descargar ni insertar)
                if (currentId && fileIdsExistentes.has(currentId)) {
                   this.logger.log(`⏭️ Ya existe en BD: ${currentId}. Saltando descarga.`);
                   continue;
                }

                const data = await mainFrame.evaluate(() => {
                   const visor = document.querySelector('iframe[src*="visor"], #divDetalleMensaje, [id*="visor"], .constancia-container');
                   return {
                      text: document.body.innerText,
                      html: visor ? visor.outerHTML : document.body.innerHTML
                   };
                });

                const textBlock = data.text;
                const htmlBlock = data.html;
                // Usar la fecha ya extraída de la fila (rowDateMatch / rowFecha)
                const dateMatch = rowDateMatch;
                
                if (dateMatch) {
                    let asunto = rowData.asunto.trim();
                    if (!asunto.toUpperCase().includes('ASUNTO:')) asunto = `ASUNTO: ${asunto}`;
                    let tipoMensaje = asunto.toUpperCase().includes('NOTIFICACI') ? "NOTIFICACION" : "MENSAJE";
                    
                    // Usar la fecha ya parseada desde la fila
                    const fechaMensaje = rowFecha;

                    // A1: El filtro de año ya fue aplicado arriba con rowFecha, no hace falta repetir

                    // --- ESTRATEGIA SUPREMA: EXTRACCIÓN PROFUNDA (ANTICOLISIONES) ---
                    // 1. Iniciamos en null. Nunca guardes rutas dummy en BD para evitar errores 404 en el frontend.
                    let finalHref = null; 
                    let fileId = null;

                    try {
                        this.logger.log(`🎯 Ejecutando escaneo profundo del DOM (incluyendo iframes internos)...`);
                        
                        const docInfo = await mainFrame.evaluate(() => {
                            // Recolectar elementos del frame principal
                            let allElements = Array.from(document.querySelectorAll('a, span, u, b, div'));
                            
                            // Atravesar la barrera de los iframes anidados (el visor interno de SUNAT)
                            const iframes = document.querySelectorAll('iframe');
                            iframes.forEach(iframe => {
                                try {
                                    if (iframe.contentDocument) {
                                        const iframeElements = Array.from(iframe.contentDocument.querySelectorAll('a, span, u, b, div'));
                                        allElements = allElements.concat(iframeElements);
                                    }
                                } catch(e) { /* Ignorar bloqueos de CORS si el iframe es externo */ }
                            });

                            for (const el of allElements) {
                                const text = el.textContent?.trim().toLowerCase() || "";
                                // Analizar el código fuente real del elemento
                                const html = el.outerHTML?.toLowerCase() || "";

                                // REGLA 1: Filtrar elementos de constancia
                                if (text.includes('constancia') || html.includes('constancia')) {
                                    continue;
                                }

                                // REGLA 2: Regex robusto sobre el HTML crudo
                                const idMatch = html.match(/(?:bajararchivo(?:\/|['"]|%27)|goarchivodescarga\s*\(\s*['"]?)(\d{8,15})/i);
                                
                                if (idMatch && idMatch[1]) {
                                    // Buscamos algo que DE VERDAD parezca un código de resolución (que contenga al menos 5 números seguidos)
                                    const textNumber = text.match(/\b([a-z0-9-]*\d{5,}[a-z0-9-]*)\b/i);
                                    const visualId = textNumber ? textNumber[0].toUpperCase() : idMatch[1];
                                    return { internalId: idMatch[1], visualId };
                                }
                            }
                            return null;
                        });

                        if (docInfo && docInfo.internalId) {
                            // CLAVE: Usar internalId para garantizar unicidad en BD y en disco
                            fileId = docInfo.internalId; 
                            this.logger.log(`✅ ¡ID interno capturado tras escaneo profundo!: ${docInfo.internalId} (Visual: ${docInfo.visualId})`);
                            
                            const sunatUrl = `https://ww1.sunat.gob.pe/ol-ti-itvisornoti/visor/bajarArchivo/${docInfo.internalId}/0/0/${empresa.ruc}`;

                            // Fetch silencioso
                            const base64Data = await mainFrame.evaluate(async (url) => {
                                try {
                                    const response = await fetch(url);
                                    if (!response.ok) return null;
                                    const blob = await response.blob();
                                    return new Promise<string>((resolve) => {
                                        const reader = new FileReader();
                                        reader.onloadend = () => resolve(reader.result as string);
                                        reader.readAsDataURL(blob);
                                    });
                                } catch (err) { return null; }
                            }, sunatUrl);

                            if (base64Data && base64Data.includes(',')) {
                                const buffer = Buffer.from(base64Data.split(',')[1], 'base64');
                                
                                // Validamos que sea mayor a 1KB o que empiece con la firma mágica de un PDF '%PDF'
                                if (buffer.length > 1000 || buffer.toString('utf8', 0, 4) === '%PDF') {
                                    const fileName = `${docInfo.internalId}.pdf`; // <-- Nombre de archivo 100% único
                                    const filePath = path.join(uploadDir, fileName);
                                    fs.writeFileSync(filePath, buffer);
                                    const backendUrl = process.env.BACKEND_URL || 'http://localhost:3000';
                                    finalHref = `${backendUrl}/uploads/${fileName}`;
                                    this.logger.log(`🚀 ¡Jaque Mate! Documento físico guardado: ${fileName}`);
                                } else {
                                    this.logger.warn(`⚠️ PDF vacío/corrupto para: ${asunto.substring(0, 60)}`);
                                    pdfsFallidos.push({ asunto, fecha: dateMatch[1] });
                                }
                            }
                        } else {
                             this.logger.warn(`⚠️ No se encontro ID interno en el DOM para: ${asunto.substring(0, 60)}`);
                             pdfsFallidos.push({ asunto, fecha: dateMatch[1] });
                         }
                     } catch (e) {
                         this.logger.error(`❌ Error fatal en la estrategia de extraccion: ${e.message}`);
                         pdfsFallidos.push({ asunto, fecha: dateMatch[1] });
                     }

                    if (tipoMensaje === "NOTIFICACION") {
                       // Agregar a la lista de NUEVAS (no duplicadas) para insertar
                       notificacionesNuevas.push({
                          empresaId: empresa.id,
                          fileId: fileId || null,        // ID único de SUNAT
                          asunto: asunto.length > 200 ? asunto.substring(0, 197) + '...' : asunto,
                          fechaMensaje,
                          tipo: tipoMensaje,
                          estado: finalHref ? 'NO_LEIDO' : 'SIN_PDF',
                          rutaArchivoPdf: finalHref
                       });
                    }
                }
                // MEJORA ANTI-BAN: Pausa entre notificaciones para no saturar SUNAT
                await new Promise(r => setTimeout(r, 1500));
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
              skipDuplicates: true
          });
          this.logger.log(`📦 ${result.count} nueva(s) notificacion(es) insertada(s) en BD. (${notificacionesNuevas.length - result.count} duplicado(s) omitido(s))`);
      } else {
          this.logger.log(`✅ Sin nuevas notificaciones. La BD ya estaba al día.`);
      }


      for (const notif of notificacionesExtraidas) {
        if (notif.asunto.toLowerCase().includes("orden de pago") || notif.asunto.toLowerCase().includes("esquela")) {
          // MEJORA: Retry de email con backoff exponencial para evitar ECONNRESET
          let emailSent = false;
          for (let attempt = 1; attempt <= 3; attempt++) {
            try {
              await this.mailService.sendUrgentAlert(empresa.usuario.email, empresa.razonSocial, notif.asunto);
              emailSent = true;
              break;
            } catch (mailErr) {
              this.logger.warn(`⚠️ Intento ${attempt}/3 de email falló: ${mailErr.message}. ${attempt < 3 ? `Reintentando en ${attempt * 3}s...` : 'Abandonando.'}`);
              if (attempt < 3) await new Promise(r => setTimeout(r, attempt * 3000));
            }
          }
          if (!emailSent) this.logger.error(`❌ No se pudo enviar email de alerta para: ${notif.asunto}`);
        }
      }

      // B3: EMAIL RESUMEN — Un solo correo al final con todos los PDFs que no se pudieron descargar
      if (pdfsFallidos.length > 0) {
        this.logger.warn(`📋 ${pdfsFallidos.length} documento(s) sin PDF. Enviando resumen al admin...`);
        try {
          await this.mailService.sendPdfFailureSummary(
            empresa.usuario.email,
            empresa.razonSocial,
            pdfsFallidos
          );
        } catch (mailErr) {
          this.logger.error(`❌ No se pudo enviar el resumen de PDFs fallidos: ${mailErr.message}`);
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
      await new Promise(r => setTimeout(r, 5000));
      if (browser) await browser.close();
    }
  }
}
