var fsPath = require('path'),
    fs = require('fs'),
    mozrunner = require('mozilla-runner'),
    mozdown = require('mozilla-download'),
    spawn = require('./index').spawn,
    debug = require('debug')('marionette-b2g-host'),
    debugChild = require('debug')('b2g-desktop');

var DOWNLOAD_DIR = fsPath.join(process.cwd(), 'b2g');

/**
 * Handles piping process details to debug.
 * @param {ChildProcess} process to watch.
 * @private
 */
function debugProcess(process) {
  function watchStream(type, stream) {
    stream.on('data', function(buffer) {
      debugChild(type, buffer.toString());
    });
  }

  watchStream('stdout', process.stdout);
  watchStream('stderr', process.stderr);
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
  this.options.runtime = this.options.runtime || DOWNLOAD_DIR;
}

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
    options = options || {};

    debug('start');
    var self = this;
    var target = self.options.runtime;

    function download() {
      var version = self.options.version;

      mozdown.download(
        'b2g',
        target,
        { version: version },
        run
      );
    }

    function run(err) {
      if (err) return callback(err);
      mozrunner.run('b2g', target, { profile: profile }, saveState);
    }

    function saveState(err, process) {
      if (err) return callback(err);
      debugProcess(process);
      self._process = process;
      callback();
    }

    download();
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
