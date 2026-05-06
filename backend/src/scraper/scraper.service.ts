import { Injectable, Logger } from '@nestjs/common';
import puppeteer from 'puppeteer';
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
      data: { estadoSincro: status } as any
    });
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
      headless: false,
      slowMo: 100,
      defaultViewport: { width: 1280, height: 800 },
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
      const notificacionesMap = new Map<string, any>();

      try {
        const framesList = page.frames();
        const mainFrame = framesList.find(f => f.url().includes('visor') || f.url().includes('master'));
        
        if (mainFrame) {
          this.logger.log(`Frame de buzón detectado: ${mainFrame.url()}`);
          await mainFrame.evaluate(() => { window.print = () => {}; });

          const dateElements = await mainFrame.$$('*');
          
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
          for (const container of containersArray) {
             try {
                const rowData = await (container as any).evaluate((node: HTMLElement) => {
                   return {
                      fullText: node.innerText,
                      asunto: node.querySelector('.asunto, [class*="asunto"], b, strong')?.textContent || node.innerText.split('\n')[0]
                   };
                });

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

                const data = await mainFrame.evaluate(() => {
                   const visor = document.querySelector('iframe[src*="visor"], #divDetalleMensaje, [id*="visor"], .constancia-container');
                   return {
                      text: document.body.innerText,
                      html: visor ? visor.outerHTML : document.body.innerHTML
                   };
                });

                const textBlock = data.text;
                const htmlBlock = data.html;
                const dateMatch = textBlock.match(/(\d{2}\/\d{2}\/\d{4}\s+\d{2}:\d{2}:\d{2})/) || rowData.fullText.match(/(\d{2}\/\d{2}\/\d{4})/);
                
                if (dateMatch) {
                    let asunto = rowData.asunto.trim();
                    if (!asunto.toUpperCase().includes('ASUNTO:')) asunto = `ASUNTO: ${asunto}`;
                    let tipoMensaje = asunto.toUpperCase().includes('NOTIFICACI') ? "NOTIFICACION" : "MENSAJE";
                    
                    let fechaMensaje = new Date();
                    if (dateMatch[1].includes(':')) {
                       const parts = dateMatch[1].split(/[\s\/:]/); 
                       fechaMensaje = new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0]), parseInt(parts[3]), parseInt(parts[4]), parseInt(parts[5]));
                    } else {
                       const parts = dateMatch[1].split('/');
                       fechaMensaje = new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0]));
                    }

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
                                    finalHref = `http://localhost:3000/uploads/${fileName}`;
                                    this.logger.log(`🚀 ¡Jaque Mate! Documento físico guardado: ${fileName}`);
                                } else {
                                    this.logger.error(`❌ Archivo corrupto o vacío devuelto por el servidor para el ID ${docInfo.internalId}.`);
                                }
                            }
                        } else {
                            this.logger.warn(`⚠️ Escaneo profundo fallido: No se encontró la ruta interna dentro de ningún frame.`);
                        }
                    } catch (e) {
                        this.logger.error(`❌ Error fatal en la estrategia de extracción: ${e.message}`);
                    }

                    if (tipoMensaje === "NOTIFICACION") {
                       const uniqueKey = fileId || `${asunto}-${dateMatch[1]}`;
                       if (!notificacionesMap.has(uniqueKey)) {
                          notificacionesMap.set(uniqueKey, {
                             empresaId: empresa.id,
                             asunto: asunto.length > 200 ? asunto.substring(0, 197) + '...' : asunto,
                             fechaMensaje,
                             tipo: tipoMensaje,
                             estado: 'NO_LEIDO',
                             rutaArchivoPdf: finalHref
                          });
                       }
                    }
                }
             } catch (err) {
                this.logger.warn(`Error en fila: ${err.message}`);
             }
          }
        }
        notificacionesExtraidas = Array.from(notificacionesMap.values());
      } catch (domError) {
        this.logger.error('Fallo crítico:', domError);
      }

      if (notificacionesExtraidas.length > 0) {
          await this.prisma.notificacion.deleteMany({ where: { empresaId: empresa.id } });
          await this.prisma.notificacion.createMany({ data: notificacionesExtraidas });
          this.logger.log(`📦 Sincronizados ${notificacionesExtraidas.length} elementos.`);
      }

      for (const notif of notificacionesExtraidas) {
        if (notif.asunto.toLowerCase().includes("orden de pago") || notif.asunto.toLowerCase().includes("esquela")) {
          await this.mailService.sendUrgentAlert(empresa.usuario.email, empresa.razonSocial, notif.asunto);
        }
      }

      await this.prisma.empresa.update({
        where: { id: empresaId },
        data: { ultimaSincronizacion: new Date() } as any
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
