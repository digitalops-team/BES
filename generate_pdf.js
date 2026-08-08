const puppeteer = require('./backend/node_modules/puppeteer');
const path = require('path');
const fs = require('fs');

const htmlContent = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title>Resumen de Exposición - Sistema BES</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&family=Outfit:wght@400;600;700&display=swap');

    @page {
      size: A4;
      margin: 15mm 15mm 18mm 15mm;
    }

    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }

    body {
      font-family: 'Inter', sans-serif;
      color: #1e293b;
      background-color: #ffffff;
      font-size: 10.5pt;
      line-height: 1.5;
    }

    /* Header Banner */
    .header {
      background: linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #1e3a8a 100%);
      color: #ffffff;
      padding: 24px 28px;
      border-radius: 12px;
      margin-bottom: 24px;
      position: relative;
      box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
    }

    .header-badge {
      display: inline-block;
      background: rgba(59, 130, 246, 0.25);
      border: 1px solid rgba(147, 197, 253, 0.4);
      color: #93c5fd;
      font-size: 8.5pt;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 1px;
      padding: 4px 10px;
      border-radius: 20px;
      margin-bottom: 8px;
    }

    .header h1 {
      font-family: 'Outfit', sans-serif;
      font-size: 22pt;
      font-weight: 700;
      letter-spacing: -0.5px;
      margin-bottom: 4px;
      color: #ffffff;
    }

    .header p {
      font-size: 11pt;
      color: #cbd5e1;
      font-weight: 300;
    }

    .meta-bar {
      display: flex;
      gap: 16px;
      margin-top: 14px;
      padding-top: 12px;
      border-top: 1px solid rgba(255, 255, 255, 0.15);
      font-size: 8.5pt;
      color: #94a3b8;
    }

    .meta-item {
      display: flex;
      align-items: center;
      gap: 4px;
    }

    .meta-item strong {
      color: #e2e8f0;
    }

    /* Section Styles */
    .section {
      margin-bottom: 22px;
      page-break-inside: avoid;
    }

    .section-title {
      font-family: 'Outfit', sans-serif;
      font-size: 13.5pt;
      font-weight: 700;
      color: #0f172a;
      border-bottom: 2px solid #e2e8f0;
      padding-bottom: 6px;
      margin-bottom: 12px;
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .section-title .number {
      background: #2563eb;
      color: #ffffff;
      width: 24px;
      height: 24px;
      border-radius: 6px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      font-size: 9pt;
      font-weight: 700;
    }

    /* Grid layout */
    .grid-2 {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 14px;
    }

    .card {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      padding: 14px;
    }

    .card-title {
      font-size: 10.5pt;
      font-weight: 600;
      margin-bottom: 6px;
      display: flex;
      align-items: center;
      gap: 6px;
    }

    .card-title.danger { color: #dc2626; }
    .card-title.success { color: #16a34a; }
    .card-title.primary { color: #2563eb; }

    .card p, .card ul {
      font-size: 9.5pt;
      color: #475569;
    }

    ul {
      padding-left: 16px;
      margin-top: 6px;
    }

    li {
      margin-bottom: 4px;
    }

    /* Table Styles */
    table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 8px;
      font-size: 9pt;
    }

    th {
      background: #0f172a;
      color: #ffffff;
      text-align: left;
      padding: 8px 10px;
      font-weight: 600;
      font-size: 8.5pt;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    th:first-child { border-top-left-radius: 6px; }
    th:last-child { border-top-right-radius: 6px; }

    td {
      padding: 8px 10px;
      border-bottom: 1px solid #e2e8f0;
      color: #334155;
    }

    tr:nth-child(even) td {
      background-color: #f8fafc;
    }

    .tech-tag {
      display: inline-block;
      background: #eff6ff;
      color: #1d4ed8;
      border: 1px solid #bfdbfe;
      padding: 2px 7px;
      border-radius: 4px;
      font-size: 8pt;
      font-weight: 600;
    }

    /* Modules list */
    .module-box {
      border-left: 3px solid #2563eb;
      background: #ffffff;
      border-top: 1px solid #f1f5f9;
      border-right: 1px solid #f1f5f9;
      border-bottom: 1px solid #f1f5f9;
      padding: 10px 14px;
      border-radius: 0 6px 6px 0;
      margin-bottom: 10px;
      box-shadow: 0 1px 2px rgba(0,0,0,0.03);
    }

    .module-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 4px;
    }

    .module-name {
      font-weight: 700;
      font-size: 10pt;
      color: #0f172a;
    }

    .badge {
      font-size: 7.5pt;
      padding: 2px 6px;
      border-radius: 12px;
      font-weight: 600;
    }

    .badge-blue { background: #dbeafe; color: #1e40af; }
    .badge-green { background: #dcfce7; color: #166534; }
    .badge-purple { background: #f3e8ff; color: #6b21a8; }
    .badge-amber { background: #fef3c7; color: #92400e; }

    .module-desc {
      font-size: 9pt;
      color: #475569;
    }

    /* Slides table */
    .slide-card {
      background: #ffffff;
      border: 1px solid #cbd5e1;
      border-radius: 8px;
      padding: 10px 14px;
      margin-bottom: 10px;
      page-break-inside: avoid;
    }

    .slide-num {
      font-size: 8.5pt;
      font-weight: 700;
      color: #2563eb;
      text-transform: uppercase;
      margin-bottom: 2px;
    }

    .slide-title {
      font-size: 10.5pt;
      font-weight: 700;
      color: #0f172a;
      margin-bottom: 4px;
    }

    .slide-script {
      font-size: 9pt;
      color: #334155;
      background: #f8fafc;
      padding: 6px 10px;
      border-radius: 4px;
      border-left: 2px solid #94a3b8;
      font-style: italic;
    }

    /* Footer */
    .footer {
      position: fixed;
      bottom: 0;
      left: 0;
      right: 0;
      height: 12mm;
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 8pt;
      color: #94a3b8;
      border-top: 1px solid #e2e8f0;
      padding: 0 15mm;
    }

    .page-break {
      page-break-after: always;
    }

    /* Metrics Summary */
    .metrics-container {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 10px;
      margin-top: 12px;
      margin-bottom: 18px;
    }

    .metric-card {
      background: linear-gradient(135deg, #f8fafc 0%, #eff6ff 100%);
      border: 1px solid #bfdbfe;
      border-radius: 8px;
      padding: 10px;
      text-align: center;
    }

    .metric-value {
      font-family: 'Outfit', sans-serif;
      font-size: 16pt;
      font-weight: 800;
      color: #1d4ed8;
      line-height: 1.1;
    }

    .metric-label {
      font-size: 7.5pt;
      font-weight: 600;
      color: #475569;
      text-transform: uppercase;
      margin-top: 2px;
    }
  </style>
</head>
<body>

  <!-- HEADER -->
  <div class="header">
    <div class="header-badge">Documento Oficial de Exposición</div>
    <h1>Sistema BES — Buzón Electrónico SUNAT</h1>
    <p>Plataforma Centralizada de Scraping Robotizado, Monitoreo y Gestión Multiempresa</p>
    <div class="meta-bar">
      <div class="meta-item"><strong>Proyecto:</strong> BES Monitoreo</div>
      <div class="meta-item"><strong>Versión:</strong> 1.0.0 (Producción)</div>
      <div class="meta-item"><strong>Fecha:</strong> Agosto 2026</div>
      <div class="meta-item"><strong>Target:</strong> Servidor Xeon Local / Docker</div>
    </div>
  </div>

  <!-- METRICAS DE IMPACTO -->
  <div class="metrics-container">
    <div class="metric-card">
      <div class="metric-value">+90%</div>
      <div class="metric-label">Ahorro de Tiempo Operativo</div>
    </div>
    <div class="metric-card">
      <div class="metric-value">AES-256</div>
      <div class="metric-label">Encriptación Claves SOL</div>
    </div>
    <div class="metric-card">
      <div class="metric-value">24/7</div>
      <div class="metric-label">Monitoreo Automático Cron</div>
    </div>
    <div class="metric-card">
      <div class="metric-value">0%</div>
      <div class="metric-label">Riesgo de Multas por Vencimiento</div>
    </div>
  </div>

  <!-- SECCIÓN 1: PROBLEMA Y SOLUCIÓN -->
  <div class="section">
    <div class="section-title">
      <span class="number">1</span>Contexto de Negocio: El Problema y la Solución
    </div>
    <div class="grid-2">
      <div class="card">
        <div class="card-title danger">⚠️ El Problema Tradicional</div>
        <ul>
          <li><strong>Pérdida de Tiempo:</strong> Las firmas contables administran decenas/cientos de RUCs ingresando manualmente a SUNAT.</li>
          <li><strong>Riesgo de Multas:</strong> Omisión de notificaciones con plazos perentorios (Esquelas, Resoluciones, Requerimientos).</li>
          <li><strong>Inseguridad:</strong> Manejo no encriptado de Usuarios y Claves SOL en archivos de Excel o notas.</li>
          <li><strong>Falta de Trazabilidad:</strong> Inexistencia de registro sobre qué usuario leyó o atendió cada documento fiscal.</li>
        </ul>
      </div>

      <div class="card">
        <div class="card-title success">✅ La Solución del Sistema BES</div>
        <ul>
          <li><strong>Scraping Robotizado:</strong> Agente automatizado que navega la plataforma SOL sin intervención humana.</li>
          <li><strong>Bandeja Unificada:</strong> Consolidación de notificaciones de todos los RUCs en una sola interfaz web.</li>
          <li><strong>Seguridad Integrada:</strong> Credenciales SOL encriptadas con algoritmos criptográficos robustos.</li>
          <li><strong>Alertas Multicanal:</strong> Avisos al instante por Correo, Telegram, WhatsApp y WebSockets.</li>
        </ul>
      </div>
    </div>
  </div>

  <!-- SECCIÓN 2: ARQUITECTURA TECNOLÓGICA -->
  <div class="section">
    <div class="section-title">
      <span class="number">2</span>Arquitectura del Sistema y Stack Tecnológico
    </div>
    <table>
      <thead>
        <tr>
          <th>Capa / Componente</th>
          <th>Tecnología</th>
          <th>Función Técnica</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td><strong>Frontend (UI)</strong></td>
          <td><span class="tech-tag">Next.js 14</span> <span class="tech-tag">React</span> <span class="tech-tag">Tailwind CSS</span></td>
          <td>Dashboard interactivo en tiempo real, visor de PDFs integrado, filtros y responsive design.</td>
        </tr>
        <tr>
          <td><strong>Backend API</strong></td>
          <td><span class="tech-tag">NestJS</span> <span class="tech-tag">TypeScript</span></td>
          <td>Arquitectura modular REST, autenticación JWT, guards de seguridad y lógica de negocio.</td>
        </tr>
        <tr>
          <td><strong>Scraper Bot</strong></td>
          <td><span class="tech-tag">Puppeteer</span> <span class="tech-tag">Chromium</span></td>
          <td>Emulación de navegador web para login SOL, extracción de metadatos y descarga de PDFs.</td>
        </tr>
        <tr>
          <td><strong>Colas Asíncronas</strong></td>
          <td><span class="tech-tag">BullMQ</span> <span class="tech-tag">Redis</span></td>
          <td>Procesamiento secuencial de scraping para evitar saturación de red o bloqueos de IP de SUNAT.</td>
        </tr>
        <tr>
          <td><strong>Base de Datos</strong></td>
          <td><span class="tech-tag">PostgreSQL</span> <span class="tech-tag">Prisma ORM</span></td>
          <td>Persistencia relacional de Usuarios, Empresas, Notificaciones, Lecturas y Logs de Auditoría.</td>
        </tr>
        <tr>
          <td><strong>Notificaciones & Sockets</strong></td>
          <td><span class="tech-tag">Socket.IO</span> <span class="tech-tag">Nodemailer</span> <span class="tech-tag">Telegram</span></td>
          <td>Push instantáneo en pantalla, correos automatizados, bot de Telegram y alertas WhatsApp.</td>
        </tr>
        <tr>
          <td><strong>Despliegue</strong></td>
          <td><span class="tech-tag">Docker Compose</span></td>
          <td>Orquestación completa en servidor de producción (Workstation Xeon local).</td>
        </tr>
      </tbody>
    </table>
  </div>

  <div class="page-break"></div>

  <!-- SECCIÓN 3: MÓDULOS DEL SISTEMA -->
  <div class="section">
    <div class="section-title">
      <span class="number">3</span>Módulos y Funcionalidades Detalladas
    </div>

    <div class="module-box">
      <div class="module-header">
        <span class="module-name">1. Gestión de Empresas y Credenciales Encriptadas</span>
        <span class="badge badge-purple">Seguridad AES-256</span>
      </div>
      <div class="module-desc">
        Catálogo central de RUCs y Razones Sociales. Almacena Usuario y Clave SOL mediante cifrado simétrico AES-256. Monitorea el estado de la conexión (<code>CONECTADO</code>, <code>REQUIERE_ACTUALIZACION</code>, <code>ERROR_SISTEMA</code>).
      </div>
    </div>

    <div class="module-box">
      <div class="module-header">
        <span class="module-name">2. Motor de Scraping Automático (Robot SUNAT)</span>
        <span class="badge badge-blue">Puppeteer + BullMQ</span>
      </div>
      <div class="module-desc">
        Navega de forma automatizada por la plataforma SOL de SUNAT. Soporta ejecuciones programadas por Cron o a demanda. Extrae asuntó, fecha, fileId y descarga el documento PDF directamente a la infraestructura local.
      </div>
    </div>

    <div class="module-box">
      <div class="module-header">
        <span class="module-name">3. Bandeja de Entrada Centralizada y Visor de PDF</span>
        <span class="badge badge-green">Visor Integrado</span>
      </div>
      <div class="module-desc">
        Consolida todas las notificaciones recibidas de múltiples empresas en una sola vista. Permite filtrar por RUC, fechas y tipo. Permite previsualizar PDFs en el navegador sin descargas externas y trackea lecturas por usuario.
      </div>
    </div>

    <div class="module-box">
      <div class="module-header">
        <span class="module-name">4. Sistema Multicanal de Alertas en Tiempo Real</span>
        <span class="badge badge-amber">WebSockets + Bot</span>
      </div>
      <div class="module-desc">
        Push de alertas en vivo al dashboard mediante Socket.IO cuando llega un nuevo documento. Envío de resúmenes o alertas individuales vía Email (SMTP), Telegram Bot y mensajería de WhatsApp.
      </div>
    </div>

    <div class="module-box">
      <div class="module-header">
        <span class="module-name">5. Control de Acceso por Roles (RBAC) y Asignación de RUCs</span>
        <span class="badge badge-purple">SUPER_ADMIN / ADMIN / LOCAL</span>
      </div>
      <div class="module-desc">
        Sistema jerárquico de permisos. Permite asignar empresas específicas a contables o clientes, garantizando que cada usuario solo visualice la información de las empresas bajo su jurisdicción.
      </div>
    </div>

    <div class="module-box">
      <div class="module-header">
        <span class="module-name">6. Módulo de Auditoría Inalterable (Audit Log)</span>
        <span class="badge badge-blue">Cumplimiento & Control</span>
      </div>
      <div class="module-desc">
        Registra cada interacción crítica en el sistema: inicio de sesión, actualización de claves SOL, descargas de PDF, lecturas y disparos de scraping. Guarda timestamp, IP, User-Agent y usuario actor.
      </div>
    </div>
  </div>

  <!-- SECCIÓN 4: GUION PARA LA EXPOSICIÓN -->
  <div class="section">
    <div class="section-title">
      <span class="number">4</span>Guion Estructurado por Diapositivas (Presentación Oral)
    </div>

    <div class="slide-card">
      <div class="slide-num">Diapositiva 1</div>
      <div class="slide-title">Portada e Introducción al Sistema BES</div>
      <div class="slide-script">
        "Buenas tardes. Hoy presentamos BES, un sistema centralizado diseñado para resolver una de las mayores cargas operativas en la gestión contable: el monitoreo diario del Buzón Electrónico de SUNAT..."
      </div>
    </div>

    <div class="slide-card">
      <div class="slide-num">Diapositiva 2</div>
      <div class="slide-title">El Desafío Operativo vs. La Solución Automatizada</div>
      <div class="slide-script">
        "Revisar manualmente decenas de RUCs implica un alto costo en horas hombre y un riesgo crítico de perder plazos legales. BES elimina este trabajo manual mediante un robot automatizado que trabaja 24/7 de forma segura..."
      </div>
    </div>

    <div class="slide-card">
      <div class="slide-num">Diapositiva 3</div>
      <div class="slide-title">Arquitectura Tecnológica de Alto Rendimiento</div>
      <div class="slide-script">
        "Nuestra plataforma utiliza Next.js en el frontend y NestJS en el backend. Para el robot de scraping usamos Puppeteer orquestado con Redis y BullMQ, garantizando ejecuciones secuenciales seguras sin bloqueos por parte de SUNAT..."
      </div>
    </div>

    <div class="slide-card">
      <div class="slide-num">Diapositiva 4</div>
      <div class="slide-title">Demostración: Scraping, Bandeja Unificada y Visor PDF</div>
      <div class="slide-script">
        "Como se observa en pantalla, el sistema consolida todas las notificaciones en una sola bandeja. Los usuarios pueden previsualizar los PDFs al instante, filtrarlos por empresa y verificar su estado de lectura en tiempo real..."
      </div>
    </div>

    <div class="slide-card">
      <div class="slide-num">Diapositiva 5</div>
      <div class="slide-title">Seguridad, Control de Usuarios y Auditoría</div>
      <div class="slide-script">
        "La seguridad es prioritaria: las claves SOL se cifran con AES-256. Además, contamos con asignación estricta de RUCs por usuario y un registro inalterable de auditoría (Audit Logs) que rastrea cada acción realizada..."
      </div>
    </div>

    <div class="slide-card">
      <div class="slide-num">Diapositiva 6</div>
      <div class="slide-title">Impacto Operativo y Conclusiones</div>
      <div class="slide-script">
        "En conclusión, BES genera un ahorro de más del 90% en tiempo operativo, reduce a cero el riesgo de multas por vencimiento de notificaciones y profesionaliza la gestión tributaria corporativa."
      </div>
    </div>

  </div>

</body>
</html>
`;

async function generatePDF() {
  console.log('Iniciando Puppeteer para generar PDF...');
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  await page.setContent(htmlContent, { waitUntil: 'networkidle0' });

  const pdfPath = path.join(__dirname, 'Resumen_Exposicion_BES.pdf');
  
  await page.pdf({
    path: pdfPath,
    format: 'A4',
    printBackground: true,
    margin: {
      top: '12mm',
      bottom: '12mm',
      left: '12mm',
      right: '12mm'
    }
  });

  await browser.close();
  console.log('PDF generado exitosamente en:', pdfPath);
}

generatePDF().catch(err => {
  console.error('Error al generar PDF:', err);
  process.exit(1);
});
