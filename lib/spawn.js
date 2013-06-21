var fs = require('fs'),
    emptyPort = require('empty-port'),
    mozdown = require('mozilla-download'),
    mozprofile = require('mozilla-profile-builder'),
    mozrunner = require('mozilla-runner');

var DEFAULT_PRODUCT = 'b2g';
var STARTING_PORT = 60030;
var MARIONETTE_ENABLED_PREF = 'marionette.defaultPrefs.enabled';
var MARIONETTE_PORT_PREF = 'marionette.defaultPrefs.port';

/**
 * Builds the profile configuration options.
 *
 *    buildProfileOptions(
 *      // product path
 *      '/path/to/b2g/',
 *      // port
 *      2828,
 *      // all options
 *      options
 *    );
 *
 * @param {String} runtime path for product. (like /path/to/b2g/).
 * @param {Number} port where to open marionette server.
 * @param {Object} options given to spawn.
 * @return {Object} profile configuration.
 */
function buildProfileOptions(runtime, port, options) {
  var config = { runtime: runtime };
  for (var key in options) {
    config[key] = options[key];
  }

  if (!options.prefs)
    config.prefs = {};

  config.prefs[MARIONETTE_PORT_PREF] = port;
  config.prefs[MARIONETTE_ENABLED_PREF] = true;

  return config;
}

function createProfile(product, config, callback) {
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
 *    - (Object) prefs: prefs for runtime.
 *    - (Object) settings: options to add to the settings database.
 *    - (String) profile: sets the target profile.
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
  var port = options.port;
  var prefs = options.prefs || {};

  function beginRunner(profileDir) {
    mozrunner.run(
      product,
      productPath,
      { profile: profileDir },
      function(err, child) {
        callback(err, port, child, profileDir);
      }
    );
  }

  function profile(err) {
    if (err) return callback(err);

    // use the given profile
    if (options.profile) {
      return fs.exists(options.profile, function(fileExists) {
        if (!fileExists) {
          return callback(
            new Error('profile does not exist: "' + fileExists + '"')
          );
        }
        beginRunner(options.profile);
      });
    }

    createProfile(
      product,
      buildProfileOptions(productPath, port, options),
      function(err, _profile) {
        if (err) return callback(err);
        profile = _profile;
        beginRunner(profile);
      }
    );
  }

  function locatePort() {
    // don't locate a port when one is given outright or
    // when the profile is given (it should have its own port).
    if (port || options.profile)
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
      download(product, productPath, options, locatePort);
    }
  });
}

module.exports.spawn = spawn;
