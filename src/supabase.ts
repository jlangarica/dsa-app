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
    Authorization: `Bearer ${config.key}`
  };

  options.headers = { ...defaultHeaders, ...options.headers };
  options.muteHttpExceptions = true;

  const response = UrlFetchApp.fetch(url, options);
  return JSON.parse(response.getContentText());
}
