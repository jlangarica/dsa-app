function getSupabaseConfig() {
  const props = PropertiesService.getScriptProperties();

  return {
    url: props.getProperty('SUPABASE_URL') || '',
    key: props.getProperty('SUPABASE_KEY') || props.getProperty('SUPABASE_ANON_KEY') || ''
  };
}

function supabaseFetch(endpoint: string, options: GoogleAppsScript.URL_Fetch.URLFetchRequestOptions = {}) {
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
