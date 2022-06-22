const path = require('path');
const { screen } = require('electron');
const windowStateKeeper = require('electron-window-state');

const { fetchConfig } = require('./config.js');
const { getLocale } = require('./locale.js');

// replaces properties in <properties> from <config> when it exists
function replaceExistingProperties(properties, config, keys) {
  for (key of keys) {
    if (config[key] !== undefined) {
      properties[key] = config[key];
    }
  }
}

// returns the absolute build path of a filename in the repo
// /<absolute path>/app.asar/dist/<locale dir>/<filename>
function getPath(filename) {
  return path.format({
    dir: path.normalize(__dirname + '/../dist/' + getLocale()),
    base: filename,
  });
}

module.exports = {
  configure(args) {
    const mainScreen = screen.getPrimaryDisplay();
    const config = fetchConfig();
    const big = args.includes('--big');
    const full = args.includes('--fullscreen');
    const serve = args.includes('--serve');
    const dev = args.includes('--dev');

    // defaults
    const properties = {
      dev: dev || serve,
      url: null,
      windowState: null,
      window: {
        frame: true,
        fullscreen: false,
        useContentSize: false,
        width: big ? 1920 : 1280,
        height: big ? 1080 : 720,
        x: 0,
        y: 0,
        backgroundColor: '#353b48',
        webPreferences: {
          nodeIntegration: true,
          enableRemoteModule: true,
          worldSafeExecuteJavaScript: true,
          contextIsolation: false,
        },
        icon: getPath('assets/icon/icon.png'),
      }
    };
    if (!big && !properties.dev &&
        config.octodash.window && config.octodash.window.enabled) {
      replaceExistingProperties(
        properties.window,
        config.octodash.window,
        ['width', 'height', 'x', 'y', 'fullscreen', 'frame', 'backgroundColor'],
      );
    }
    properties.windowState = windowStateKeeper({
        defaultWidth: properties.window.width,
        defaultHeight: properties.window.height,
    });
    if (!config.octodash.window || !config.octodash.window.enabled) {
      if (!big) {
        properties.window.width = properties.windowState.width;
        properties.window.height = properties.windowState.height;
      }
      properties.window.x = properties.windowState.x;
      properties.window.y = properties.windowState.y;
    }
    if (full ||
        (properties.window.width >= mainScreen.size.width ||
         properties.window.height >= mainScreen.size.height)) {
      properties.window.width = mainScreen.size.width;
      properties.window.height = mainScreen.size.height;
      properties.window.x = 0;
      properties.window.y = 0;
      properties.window.fullscreen = true;
      properties.window.frame = false;
    }

    
    properties.url = serve ? 'http://localhost:4200' :
                             'file://' + getPath('index.html');
    if (properties.dev) {
      properties.window.frame = true;
      properties.window.fullscreen = false;
      properties.window.width = big ? 1500 : 1200;
      properties.window.height = big ? 600 : 450;
    } else {
      const { session } = require('electron');
      session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
        callback({
          responseHeaders: {
            ...details.responseHeaders,
            // TODO: re-enable
            // "Content-Security-Policy": ["script-src 'self'"],
          },
        });
      });
    }

    return properties;
  },
};
