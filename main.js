/* eslint-disable @typescript-eslint/no-var-requires */
/* eslint-disable import/no-commonjs */

require('v8-compile-cache');

const { app, BrowserWindow, ipcMain, protocol } = require('electron');
const path = require('path');
const init = require('./helper/init.js');
const serve = process.argv.slice(1).some(val => val === '--serve');
const activateListeners = require('./helper/listener');

let window;

if (!serve) {
  const createProtocol = require('./helper/protocol');
  const scheme = 'app';

  protocol.registerSchemesAsPrivileged([{ scheme: scheme, privileges: { standard: true } }]);
  createProtocol(scheme, path.join(__dirname, 'dist'));
}

function createWindow() {
  const properties = init.configure(process.argv.slice(1));

  window = new BrowserWindow(properties.window);
  properties.windowState.manage(window);

  if (properties.dev) {
    window.webContents.openDevTools();
  } else {
    // Remove the default menu bar.
    // It's mostly useless and some of the options are harmful.
    window.removeMenu();
  }

  window.loadURL(properties.url);
  activateListeners(ipcMain, window, app, properties.url);

  window.on('closed', () => {
    window = null;
  });
}

app.commandLine.appendSwitch('touch-events', 'enabled');
app.on('ready', createWindow);

app.on('window-all-closed', () => {
  app.quit();
});

app.on('activate', () => {
  if (window === null) {
    createWindow();
  }
});
