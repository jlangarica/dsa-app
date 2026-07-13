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
    throw new Error('Falta configurar la propiedad del script GEMINI_API_KEY en Google Apps Script.');
  }

  const url = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-lite-latest:generateContent?key=' + apiKey;

  const prompt = `Analiza este documento oficial en PDF del Hospital Civil de Guadalajara. Realiza un OCR estricto y estructurado.
  Debes identificar y mapear los campos requeridos respondiendo ÚNICAMENTE con un objeto JSON con el siguiente formato:
  {
    "folio_dsa": "Busca el sello de 'RECIBI' o 'DIV. DE SERVS. ADMVOS.' y extrae el número de FOLIO manuscrito o estampado de 3 o 4 dígitos (ej: '0241'). Si no hay sello, usa el número de oficio limpio",
    "no_oficio": "El código identificador del oficio en la parte superior derecha (ej: 'AHCGFAA/COEΡ/189/2026')",
    "fecha_recepcion": "La fecha que se encuentra DENTRO del sello de recibido. Conviértela obligatoriamente al formato YYYY-MM-DD (ej: si dice '16 FEB. 2026' debe ser '2026-02-16')",
    "observaciones": "Usa el texto del campo 'ASUNTO:' de la cabecera (ej: 'SOLICITUD PARA TONER IMPRESORA')",
    "uc_cod_sugerido": "Busca en el documento (normalmente en la hoja de Negativa de Insumo o metadatos) una clave bajo el término 'U.C.' o 'Servicio Solicitante' (ej: '4038'). Si no existe, pon null",
    "articulos": [
      {
        "codigo_art": "El número de código del insumo de 10 dígitos (ej: '2141002079')",
        "cantidad": Extrae solo el número entero aislado del campo 'CANTIDAD REQUERIDA' (ej: si dice '1 (UNO)' o '1' guarda el número 1),
        "precio_unitario": 0
      }
    ]
  }
  Reglas críticas de formato:
  1. No agregues texto introductorio ni explicaciones secundarias.
  2. No utilices bloques de código Markdown como \`\`\`json ... \`\`\`.
  3. Si un dato no es visible, establécelo como null.`;

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
