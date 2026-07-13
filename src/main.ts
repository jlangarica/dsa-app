function doGet() {
  return HtmlService.createHtmlOutputFromFile('formulario')
    .setTitle('Registrador de Compras DSA')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function guardarCompraDesdeForm(payload) {
  if (!payload || !payload.cabecera || !payload.detalles) {
    throw new Error('El paquete de datos enviado está corrupto o incompleto.');
  }

  return insertarCompraDSADetalle(payload.cabecera, payload.detalles);
}
