function getSupabaseConfig() {
  const props = PropertiesService.getScriptProperties();

  return {
    url: props.getProperty('SUPABASE_URL') || '',
    key: props.getProperty('SUPABASE_ANON_KEY') || ''
  };
}
