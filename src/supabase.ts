function getSupabaseConfig() {
  const props = PropertiesService.getScriptProperties();

  return {
    url: props.getProperty('SUPABASE_URL') || '',
    key: props.getProperty('SUPABASE_KEY') || props.getProperty('SUPABASE_ANON_KEY') || ''
  };
}

function supabaseFetch(endpoint, options) {
  const config = getSupabaseConfig();

  if (!config.url || !config.key) {
    throw new Error('Faltan las propiedades del script SUPABASE_URL o SUPABASE_KEY.');
  }

  const url = `${config.url}/rest/v1/${endpoint}`;
  const defaultHeaders = {
    apikey: config.key,
    Authorization: `Bearer ${config.key}`,
    Accept: 'application/json'
  };

  options.headers = { ...defaultHeaders, ...options.headers };
  options.muteHttpExceptions = true;

  const response = UrlFetchApp.fetch(url, options);
  const code = response.getResponseCode();
  const text = response.getContentText();

  if (code >= 200 && code < 300) {
    return text ? JSON.parse(text) : null;
  }

  throw new Error(`Error en Supabase [${code}]: ${text}`);
}

function subirPdfASupabaseStorage(base64Data, nombreArchivo) {
  const config = getSupabaseConfig();
  if (!config.url || !config.key) {
    throw new Error('Faltan las propiedades del script SUPABASE_URL o SUPABASE_KEY.');
  }

  const url = `${config.url}/storage/v1/object/oficios-dsa/${nombreArchivo}`;
  const bytes = Utilities.base64Decode(base64Data);
  const blob = Utilities.newBlob(bytes, 'application/pdf', nombreArchivo);

  const opciones = {
    method: 'post',
    headers: {
      apikey: config.key,
      Authorization: `Bearer ${config.key}`,
      'Content-Type': 'application/pdf'
    },
    payload: blob.getBytes(),
    muteHttpExceptions: true
  };

  const response = UrlFetchApp.fetch(url, opciones);
  const code = response.getResponseCode();
  if (code >= 200 && code < 300) {
    return `${config.url}/storage/v1/object/public/oficios-dsa/${nombreArchivo}`;
  }

  throw new Error('No se pudo respaldar el PDF en Supabase Storage: ' + response.getContentText());
}
