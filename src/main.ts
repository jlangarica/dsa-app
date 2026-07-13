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

function analizarPdfConGemini(base64Pdf) {
  const props = PropertiesService.getScriptProperties();
  const apiKey = props.getProperty('GEMINI_API_KEY');

  if (!apiKey) {
    throw new Error('Falta configurar la propiedad del script GEMINI_API_KEY.');
  }

  const url = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=' + apiKey;

  const prompt = 'Analiza detalladamente este oficio de solicitud en PDF. Realiza un OCR estricto y extrae la información necesaria. Debes responder ÚNICAMENTE con un objeto JSON válido con la siguiente estructura: {"folio_dsa":"Extrae el número o identificador de folio de la solicitud (vuelve a formatear si es necesario)","no_oficio":"El número de oficio que identifica al documento","fecha_recepcion":"La fecha del documento convertida al formato estricto YYYY-MM-DD (ej: 2026-03-15)","observaciones":"Un resumen muy conciso de 1 renglón del asunto o justificación de la compra","articulos":[{"codigo_art":"El código del artículo o SKU si aparece de forma exacta, sino déjalo vacío \"\"","cantidad":número entero de piezas solicitadas,"precio_unitario":precio sugerido si aparece en el texto, sino pon 0}]} Requisitos: No envíes explicaciones, no uses marcas de bloques de código markdown (```json). Solo devuelve el string del JSON puro. Si un campo de texto no se encuentra, devuélvelo como null o un arreglo vacío [] en el caso de los artículos.';

  const payload = {
    contents: [{
      parts: [
        { text: prompt },
        {
          inlineData: {
            mimeType: 'application/pdf',
            data: base64Pdf
          }
        }
      ]
    }],
    generationConfig: {
      responseMimeType: 'application/json'
    }
  };

  const opciones = {
    method: 'post',
    contentType: 'application/json',
    payload: JSON.stringify(payload),
    muteHttpExceptions: true
  };

  const response = UrlFetchApp.fetch(url, opciones);
  const code = response.getResponseCode();
  const text = response.getContentText();

  if (code !== 200) {
    throw new Error('Error en el motor IA Gemini [Código ' + code + ']: ' + text);
  }

  const jsonResponse = JSON.parse(text);
  const textoExtraido = jsonResponse.candidates[0].content.parts[0].text;

  return JSON.parse(textoExtraido);
}
