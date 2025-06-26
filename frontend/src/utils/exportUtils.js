import { jsPDF } from 'jspdf';

// Función para formatear valores de celda
const formatCellValue = (value, isNumeric = false) => {
  // Manejar valores nulos o indefinidos
  if (value === null || value === undefined || value === '') return '';
  
  // Si es numérico, formatear como número
  if (isNumeric || typeof value === 'number') {
    // Verificar si es un número decimal
    const numValue = parseFloat(value);
    if (!isNaN(numValue)) {
      // Formatear con separadores de miles y 2 decimales si es decimal
      return numValue.toLocaleString('es-ES', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 2
      });
    }
  }
  
  // Para cualquier otro caso, convertir a string y limpiar
  const strValue = String(value).trim();
  return strValue === 'undefined' || strValue === 'null' ? '' : strValue;
};

// Función para crear una tabla simple con manejo de saltos de página
const createTable = (doc, data, columns, startY, margin, pageWidth, maxY) => {
  const rowHeight = 10;
  const cellPadding = 5;
  const fontSize = 10;
  const headerHeight = 15;
  const lineWidth = 0.1;
  
  // Establecer fuente
  doc.setFont('helvetica');
  doc.setFontSize(fontSize);
  
  // Calcular ancho de columnas
  const colCount = columns.length;
  const colWidth = (pageWidth - (margin * 2)) / colCount;
  
  // Función para dibujar encabezados
  const drawHeader = (y) => {
    doc.setFillColor(41, 128, 185);
    doc.setTextColor(255, 255, 255);
    doc.setFont(undefined, 'bold');
    
    columns.forEach((header, i) => {
      doc.rect(
        margin + (i * colWidth),
        y,
        colWidth,
        headerHeight,
        'F'
      );
      
      doc.text(
        header,
        margin + (i * colWidth) + cellPadding,
        y + headerHeight - 5,
        { align: 'left', maxWidth: colWidth - (cellPadding * 2) }
      );
    });
    
    return y + headerHeight;
  };
  
  // Dibujar encabezados iniciales
  let currentY = drawHeader(startY);
  
  // Dibujar filas
  doc.setTextColor(0, 0, 0);
  doc.setFont(undefined, 'normal');
  
  let rowsDrawn = 0;
  let remainingData = [...data];
  
  while (remainingData.length > 0) {
    // Verificar si necesitamos una nueva página
    if (currentY + rowHeight > maxY && rowsDrawn > 0) {
      // Devolver el estado actual y los datos restantes
      return {
        y: currentY,
        remainingData,
        needsNewPage: true
      };
    }
    
    const row = remainingData[0];
    const rowY = currentY + (rowsDrawn * rowHeight);
    
    // Color de fondo alterno
    if (rowsDrawn % 2 === 0) {
      doc.setFillColor(245, 245, 245);
      doc.rect(
        margin,
        rowY,
        pageWidth - (margin * 2),
        rowHeight,
        'F'
      );
    }
    
    // Dibujar celdas
    row.forEach((cell, cellIndex) => {
      const x = margin + (cellIndex * colWidth);
      const isNumeric = cellIndex >= 2; // Asumimos que las columnas 2+ son numéricas
      const align = isNumeric ? 'right' : 'left';
      
      // Formatear el valor según el tipo de celda
      const displayValue = formatCellValue(cell, isNumeric);
      
      doc.text(
        displayValue,
        x + (align === 'right' ? colWidth - cellPadding : cellPadding),
        rowY + rowHeight - 3,
        { 
          align,
          maxWidth: colWidth - (cellPadding * 2),
          ellipsis: '...'
        }
      );
      
      // Dibujar bordes
      doc.setDrawColor(200, 200, 200);
      doc.setLineWidth(lineWidth);
      doc.rect(x, rowY, colWidth, rowHeight);
    });
    
    rowsDrawn++;
    remainingData.shift();
  }
  
  return {
    y: currentY + (rowsDrawn * rowHeight),
    remainingData: [],
    needsNewPage: false
  };
};

export const exportToPDF = (title, columns, data, filename = 'reporte') => {
  try {
    console.log('Iniciando generación de PDF...');
    
    // Validar datos de entrada
    if (!Array.isArray(columns) || !Array.isArray(data)) {
      throw new Error('Los datos de columnas y filas deben ser arreglos');
    }
    
    if (data.length === 0) {
      throw new Error('No hay datos para mostrar en el reporte');
    }

    // Crear documento PDF
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });

    // Configuración inicial
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 15;
    let yPos = 20;

    // Establecer fuente y color
    doc.setFont('helvetica');
    doc.setTextColor(40, 40, 40);

    // Título principal
    doc.setFontSize(16);
    doc.setFont(undefined, 'bold');
    const titleText = title.split('\n')[0];
    doc.text(titleText, margin, yPos);
    yPos += 10;

    // Subtítulo (rango de fechas)
    if (title.includes('\n')) {
      doc.setFontSize(10);
      doc.setFont(undefined, 'normal');
      const dateLine = title.split('\n')[1];
      doc.text(dateLine, margin, yPos);
      yPos += 8;
    }

    // Fecha de generación
    doc.setFontSize(9);
    doc.text(`Generado el: ${new Date().toLocaleString()}`, margin, yPos);
    yPos += 15; // Más espacio antes de la tabla

    // Preparar datos para la tabla
    const tableData = data.map(row => 
      row.map(cell => formatCellValue(cell))
    );

        // Calcular el espacio disponible por página
    const pageHeight = doc.internal.pageSize.getHeight();
    const maxY = pageHeight - 20; // Margen inferior de 20mm
    
    // Función para agregar nueva página
    const addNewPage = () => {
      doc.addPage();
      yPos = 20; // Reiniciar posición Y para la nueva página
      // Agregar encabezado en cada nueva página
      doc.setFontSize(16);
      doc.setFont(undefined, 'bold');
      doc.text(title.split('\n')[0], margin, yPos);
      yPos += 10;
      
      if (title.includes('\n')) {
        doc.setFontSize(10);
        doc.setFont(undefined, 'normal');
        doc.text(title.split('\n')[1], margin, yPos);
        yPos += 8;
      }
      
      doc.setFontSize(9);
      doc.text(`Generado el: ${new Date().toLocaleString()}`, margin, yPos);
      doc.text(`Página ${doc.internal.getNumberOfPages()}`, pageWidth - margin, yPos, { align: 'right' });
      yPos += 15;
    };
    
    // Generar la tabla con manejo de paginación automática
    let currentData = [...tableData];
    let currentY = yPos;
    let pageNumber = 1;
    
    while (currentData.length > 0) {
      // Generar la tabla para los datos actuales
      const result = createTable(doc, currentData, columns, currentY, margin, pageWidth, maxY);
      
      // Actualizar los datos restantes
      currentData = result.remainingData;
      
      // Si necesitamos una nueva página y aún hay datos por procesar
      if (result.needsNewPage && currentData.length > 0) {
        addNewPage();
        pageNumber++;
        currentY = yPos; // Reiniciar la posición Y para la nueva página
      } else {
        currentY = result.y; // Continuar en la misma página
      }
    }
    
    // Generar el PDF como Blob
    const pdfBlob = doc.output('blob');
    const pdfUrl = URL.createObjectURL(pdfBlob);

    // Abrir en una nueva pestaña
    const newWindow = window.open('', '_blank');
    
    // Crear el contenido HTML para la nueva pestaña
    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Vista Previa - ${filename}</title>
        <style>
          body, html { 
            margin: 0; 
            padding: 0; 
            height: 100%; 
            overflow: hidden;
            font-family: Arial, sans-serif;
          }
          .header {
            background: #2980b9;
            color: white;
            padding: 10px 20px;
            display: flex;
            justify-content: space-between;
            align-items: center;
          }
          .title {
            font-size: 16px;
            font-weight: bold;
          }
          .controls {
            display: flex;
            gap: 10px;
          }
          #downloadBtn {
            background: white;
            border: 1px solid #ccc;
            border-radius: 4px;
            padding: 5px 10px;
            cursor: pointer;
            display: flex;
            align-items: center;
            gap: 5px;
            text-decoration: none;
            color: #333;
          }
          #downloadBtn:hover {
            background: #f5f5f5;
          }
          iframe {
            width: 100%;
            height: calc(100% - 50px);
            border: none;
          }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="title">Vista Previa del Reporte</div>
          <div class="controls">
            <a id="downloadBtn" href="#" download="${filename}.pdf">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                <polyline points="7 10 12 15 17 10"></polyline>
                <line x1="12" y1="15" x2="12" y2="3"></line>
              </svg>
              Descargar PDF
            </a>
          </div>
        </div>
        <iframe src="${pdfUrl}"></iframe>
        <script>
          // Configurar el enlace de descarga
          document.getElementById('downloadBtn').href = '${pdfUrl}';
          document.getElementById('downloadBtn').download = '${filename}_${new Date().toISOString().split('T')[0]}.pdf';
          
          // Limpiar el objeto URL cuando se cierre la pestaña
          window.addEventListener('beforeunload', function() {
            URL.revokeObjectURL('${pdfUrl}');
          });
        </script>
      </body>
      </html>
    `;
    
    // Escribir el contenido en la nueva ventana
    newWindow.document.open();
    newWindow.document.write(htmlContent);
    newWindow.document.close();
    
    return true;
    
  } catch (error) {
    console.error('Error en exportToPDF:', error);
    alert(`Error al generar el PDF: ${error.message || 'Error desconocido'}`);
    return false;
  }
};

export const prepareForPrint = () => {
  const printWindow = window.open('', '_blank');
  printWindow.document.write(`
    <html>
      <head>
        <title>Imprimir Reporte</title>
        <style>
          @media print {
            @page { margin: 0; }
            body { margin: 1.6cm; }
            .no-print { display: none !important; }
          }
          body { font-family: Arial, sans-serif; }
          h1 { color: #333; font-size: 20px; }
          .header { margin-bottom: 20px; }
          .date { margin-bottom: 10px; color: #666; }
          table { width: 100%; border-collapse: collapse; margin-top: 10px; }
          th { background-color: #2980b9; color: white; padding: 8px; text-align: left; }
          td { padding: 6px; border-bottom: 1px solid #ddd; }
          tr:nth-child(even) { background-color: #f9f9f9; }
          .footer { margin-top: 20px; font-size: 12px; color: #777; text-align: center; }
          .print-button { 
            position: fixed; 
            bottom: 20px; 
            right: 20px; 
            padding: 10px 20px; 
            background: #2980b9; 
            color: white; 
            border: none; 
            border-radius: 4px; 
            cursor: pointer; 
          }
        </style>
      </head>
      <body>
        <div id="content"></div>
        <button class="print-button no-print" onclick="window.print()">Imprimir</button>
      </body>
    </html>
  `);
  return printWindow;
};

export const printTable = (title, columns, data) => {
  const printWindow = prepareForPrint();
  
  // Create table HTML
  let tableHtml = `
    <div class="header">
      <h1>${title}</h1>
      <div class="date">Generado el: ${new Date().toLocaleString()}</div>
    </div>
    <table>
      <thead>
        <tr>
          ${columns.map(col => `<th>${col}</th>`).join('')}
        </tr>
      </thead>
      <tbody>
        ${data.map(row => `
          <tr>
            ${row.map(cell => `<td>${cell}</td>`).join('')}
          </tr>
        `).join('')}
      </tbody>
    </table>
    <div class="footer">
      Generado por Sistema de Gestión
    </div>
  `;
  
  printWindow.document.getElementById('content').innerHTML = tableHtml;
  printWindow.document.close();
};
