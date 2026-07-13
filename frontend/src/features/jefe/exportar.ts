// Exportación de la vista filtrada a Excel (ExcelJS) y PDF (jsPDF).
// Las librerías se importan dinámicamente: pesan más que el resto de la app
// y solo se necesitan cuando el jefe presiona Exportar, así no infla el
// bundle que el chofer precachea para el modo offline.
import type { TrasladoDetalle } from '../../types/database'

const COLUMNAS = [
  { header: 'N° Orden', key: 'numero_orden' },
  { header: 'Fecha', key: 'fecha' },
  { header: 'Chofer', key: 'chofer_nombre' },
  { header: 'Camión', key: 'camion_patente' },
  { header: 'Cliente', key: 'cliente_nombre' },
  { header: 'Producto', key: 'producto' },
  { header: 'N° Guía', key: 'numero_guia' },
  { header: 'Dir. inicial', key: 'direccion_inicial' },
  { header: 'Dir. final', key: 'direccion_final' },
  { header: 'Kg inicial', key: 'kg_inicial' },
  { header: 'Kg final', key: 'kg_final' },
  { header: 'Kg promedio', key: 'kg_neto' },
  { header: 'Km inicial', key: 'km_inicial' },
  { header: 'Km final', key: 'km_final' },
  { header: 'Km recorrido', key: 'km_recorrido' },
] as const

function nombreArchivo(extension: string): string {
  return `traslados_${new Date().toISOString().slice(0, 10)}.${extension}`
}

export async function exportarTrasladosExcel(filas: TrasladoDetalle[]): Promise<void> {
  const [{ default: ExcelJS }, { saveAs }] = await Promise.all([
    import('exceljs'),
    import('file-saver'),
  ])
  const workbook = new ExcelJS.Workbook()
  const hoja = workbook.addWorksheet('Traslados')

  hoja.columns = COLUMNAS.map((c) => ({ header: c.header, key: c.key, width: 16 }))
  hoja.getRow(1).font = { bold: true }

  for (const t of filas) {
    hoja.addRow(COLUMNAS.map((c) => t[c.key]))
  }

  const buffer = await workbook.xlsx.writeBuffer()
  saveAs(new Blob([buffer]), nombreArchivo('xlsx'))
}

export async function exportarTrasladosPdf(filas: TrasladoDetalle[]): Promise<void> {
  const [{ jsPDF }, { default: autoTable }] = await Promise.all([
    import('jspdf'),
    import('jspdf-autotable'),
  ])
  const doc = new jsPDF({ orientation: 'landscape' })
  doc.setFontSize(14)
  doc.text('KNS Transportes — Órdenes de Traslado', 14, 15)
  doc.setFontSize(9)
  doc.text(`Generado: ${new Date().toLocaleString('es-CL')} · ${filas.length} registros`, 14, 21)

  autoTable(doc, {
    startY: 26,
    head: [['N°', 'Fecha', 'Chofer', 'Camión', 'Cliente', 'Producto', 'Guía', 'Kg promedio', 'Km']],
    body: filas.map((t) => [
      t.numero_orden ?? '',
      t.fecha,
      t.chofer_nombre,
      t.camion_patente,
      t.cliente_nombre,
      t.producto,
      t.numero_guia,
      t.kg_neto.toLocaleString('es-CL'),
      t.km_recorrido.toLocaleString('es-CL'),
    ]),
    styles: { fontSize: 8 },
    headStyles: { fillColor: [15, 23, 42] },
  })

  doc.save(nombreArchivo('pdf'))
}
