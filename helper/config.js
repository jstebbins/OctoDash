/* eslint-disable @typescript-eslint/no-var-requires */

const Store = require('electron-store');
const Ajv = require('ajv');
const configSchema = require('./config.schema');

let store;
const ajv = new Ajv({ allErrors: true });
const validate = ajv.compile(configSchema);

function fetchConfig(window) {
  let config;
  try {
    if (!store) {
      store = new Store();
    }
    config = store.get('config');
  } catch {
    throw e;
  }
  return config;
}

function readConfig(window) {
  try {
    const config = fetchConfig();
    window.webContents.send('configRead', config);
  } catch {
    window.webContents.send('configError', "Can't read config file.");
  }
}

function saveConfig(window, config) {
  if (validate(config)) {
    try {
      store.set('config', config);
      window.webContents.send('configSaved', config);
    } catch {
      window.webContents.send('configError', "Can't save config file.");
    }
  } else {
    window.webContents.send('configSaveFail', getConfigErrors());
  }
}

function checkConfig(window, config) {
  result = validate(config);
  if (window) {
    if (!result) {
      window.webContents.send('configFail', getConfigErrors());
    } else {
      window.webContents.send('configPass');
    }
  }
  return result;
}

function getConfigErrors() {
  const errors = [];
  validate.errors?.forEach(error => {
    if (error.keyword === 'type') {
      errors.push(`${error.instancePath} ${error.message}`);
    } else {
      errors.push(`${error.instancePath === '' ? '/' : error.instancePath} ${error.message}`);
    }
  });
  return errors;
}

module.exports = { fetchConfig, readConfig, saveConfig, checkConfig };
