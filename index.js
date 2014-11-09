var fsPath = require('path'),
    fs = require('fs'),
    mozrunner = require('mozilla-runner'),
    spawn = require('./index').spawn,
    debug = require('debug')('marionette-b2g-host'),
    debugChild = require('debug')('b2g-desktop');

var PassThrough = require('stream').PassThrough;

var DEFAULT_LOCATION = fsPath.join(process.cwd(), 'b2g');

/**
 * Handles piping process details to debug.
 * @param {ChildProcess} process to watch.
 * @private
 */
function debugProcess(stream) {
  // XXX: Remove this code entirely in favor of better options from
  // marionette-js-runner...
  stream.on('data', function(buffer) {
    debugChild(buffer.toString());
  });
}

/**
 * Host interface for marionette-js-runner.
 *
 * TODO: I think this API is much more sane then the original
 *       |spawn| interface but we also need to do some refactoring
 *       in the mozilla-profile-builder project to improve the apis.
 *
 * @param {Object} [options] for host see spawn for now.
 */
function Host(options) {
  // TODO: host api should have some concept of a "asset" directory
  //       where we can stuff b2g-desktop without saving it in node_modules or
  //       cwd.
  this.options = options || {};
  this.options.runtime = this.options.runtime || DEFAULT_LOCATION;
}

Host.help = {
  group: {
    title: 'B2G Desktop Host',
    description: 'Additional parameters for b2g desktop',
  },

  arguments: {
    '--runtime': {
      help: 'Folder where b2g-bin or b2g binary lives',
      defaultValue: DEFAULT_LOCATION
    },

    '--chrome': {
      help: 'Starting point of chrome (--chrome)',
      defaultValue: 'chrome://b2g/content/shell.html',
    },

    '--start-debugger-server': {
      dest: 'startDebugger',
      help: 'When true starts debugger server (-start-debugger-server)',
      action: 'storeTrue',
      defaultValue: false
    },

    '--oop': {
      help: 'Start with out of process applications enabled',
      action: 'storeTrue',
      defaultValue: false
    }
  }
};

/**
 * Immutable metadata describing this host.
 *
 * @type {Object}
 */
Host.metadata = Object.freeze({
  host: 'b2g-desktop'
});

Host.prototype = {
  /**
   * Reference to b2g-desktop process.
   *
   * @type {ChildProcess}
   * @private
   */
  _process: null,

  /**
   * Starts the b2g-desktop process.
   *
   * @param {String} profile path.
   * @param {Object} [options] settings provided by caller.
   * @param {Function} callback [Error err].
   */
  start: function(profile, options, callback) {
    if (typeof options === 'function') {
      callback = options;
      options = null;
    }

    var userOptions = {};

    for (var key in options) {
      userOptions[key] = options[key];
    }
    userOptions.profile = userOptions.profile || profile;
    userOptions.product = userOptions.product || 'b2g';

    debug('start');
    var self = this;
    var target = userOptions.runtime || self.options.runtime;

    function run() {
      debug('binary: ', target);
      debug('profile: ', profile);
      mozrunner.run(
        target,
        userOptions,
        saveState
      );
    }

    function saveState(err, process) {
      if (err) return callback(err);

      // Why not pipe? Back pressure here will "freeze" the gecko instance
      // preventing real interaction with the process. I am not clear as to why
      // but this fixed it.
      var log = new PassThrough();
      process.stdout.on('data', log.write.bind(log));
      process.stderr.on('data', log.write.bind(log));

      debugProcess(log);
      self._process = process;
      callback(null, { log: log });
    }

    run();
  },

  /**
   * Stop the currently running host.
   *
   * @param {Function} callback [Error err].
   */
  stop: function(callback) {
    debug('stop');
    if (this._process) {
      this._process.on('exit', callback);
      this._process.kill();
    }
  }
};

module.exports = Host;
