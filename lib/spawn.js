var fs = require('fs'),
    emptyPort = require('empty-port'),
    mozdown = require('mozilla-download'),
    mozprofile = require('mozilla-profile-builder'),
    mozrunner = require('mozilla-runner');

var DEFAULT_PRODUCT = 'b2g';
var STARTING_PORT = 60030;
var MARIONETTE_ENABLED_PREF = 'marionette.defaultPrefs.enabled';
var MARIONETTE_PORT_PREF = 'marionette.defaultPrefs.port';

function buildUserConfig(port, userConfig) {
  var config = {};
  for (var key in userConfig) {
    config[key] = userConfig[key];
  }

  config[MARIONETTE_PORT_PREF] = port;
  config[MARIONETTE_ENABLED_PREF] = true;

  return config;
}

function createProfile(product, path, userConfig, callback) {
  var config = {
    userPrefs: userConfig,
    runtime: path
  };

  mozprofile[product || DEFAULT_PRODUCT].profile(config, callback);
}

function findPort(callback) {
  emptyPort({ startPort: STARTING_PORT }, function(err, port) {
    if (err) return callback(err);
    callback(null, port);
  });
}

function download(product, path, options, callback) {
  mozdown.download(
    product,
    path,
    { version: options.version },
    callback
  );
}

/**
 * Creates a complete marionette environment for a product.
 *  - downloads b2g desktop (or firefox)
 *  - detects an open port
 *  - configures marionette to use open port
 *  - resolves with the port (for a client) and the gecko process.
 *
 *
 * Options:
 *    - (String) product: "b2g" (or firefox)
 *    - (String) version: (see firefox-get)
 *    - (Object) userConfig: prefs for runtime.
 *    - (Number) port: use the given port rather then finding one.
 *
 * @param {String} productPath path to save or launch gecko runtime from.
 * @param {Object} [options] optional options for spawn.
 * @param {Function} callback [Error err, Number port, ChildProcess child].
 */
function spawn(productPath, options, callback) {
  if (typeof options === 'function') {
    callback = options;
    options = {};
  }

  var product = options.product || DEFAULT_PRODUCT;
  var profileDir;
  var port = options.port;
  var userConfig = options.userConfig || {};

  function beginRunner() {
    mozrunner.run(
      product,
      productPath,
      { profile: profileDir },
      function(err, child) {
        callback(err, port, child);
      }
    );
  }

  function profile(err) {
    if (err) return callback(err);

    createProfile(
      product,
      productPath,
      buildUserConfig(port, userConfig),
      function(err, _profileDir) {
        if (err) return callback(err);
        profileDir = _profileDir;
        beginRunner();
      }
    );
  }

  function locatePort() {
    // don't locate a port when one is given outright
    if (port)
      return profile();

    // find an open tcp port.
    findPort(function(err, _port) {
      if (err) return callback(err);
      port = _port;
      profile();
    });
  }

  fs.exists(productPath, function(exists) {
    if (exists) {
      locatePort();
    } else {
      download(product, productPath, options, locatePort)
    }
  });
}

module.exports.spawn = spawn;
