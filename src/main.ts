function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('DSA App')
    .addItem('Run', 'runMain')
    .addItem('Test Supabase', 'probarConexionSupabase')
    .addToUi();
}

function runMain() {
  Logger.log('DSA App initialized');
}

function probarConexionSupabase() {
  try {
    const datos = supabaseFetch('usuarios?select=*&limit=1');
    Logger.log('Conexión exitosa con Supabase.');
    Logger.log(JSON.stringify(datos));
  } catch (error) {
    Logger.log(`Error en la prueba de conexión: ${error}`);
  }
}
