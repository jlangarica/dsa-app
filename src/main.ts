function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('DSA App')
    .addItem('Run', 'runMain')
    .addToUi();
}

function runMain() {
  Logger.log('DSA App initialized');
}
