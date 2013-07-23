var fsPath = require('path'),
    spawn = require('./index').spawn,
    debug = require('debug')('marionette-b2g-host'),
    remove = require('remove');

var DOWNLOAD_DIR = fsPath.join(process.cwd(), 'b2g');

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

  // quick hack to ensure profile generation works.
  this.options.product = 'b2g';
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
   * Path to profile on disk.
   *
   * @type {String}
   * @private
   */
  _profile: null,

  /**
   * Port where marionette is running.
   *
   * @type Number
   */
  port: null,

  metadata: Object.freeze({
    host: 'b2g-desktop'
  }),

  /**
   * Starts the b2g-desktop process.
   *
   * @param {Function} callback [Error err].
   */
  start: function(callback) {
    debug('start');
    spawn(DOWNLOAD_DIR, this.options, function(err, port, child, profile) {
      if (err) return callback(err);
      // private state used in stop/restart
      this._profile = profile;
      this._process = child;

      // where marionette port is running
      this.port = port;
      debug('started', port);

      callback(err, port);
    }.bind(this));
  },

  /**
   * Restarts the b2g-desktop process
   */
  restart: function(callback) {
    debug('restart');
    this.stop(function(err) {
      if (err) return callback(err);
      this.start(callback);
    }.bind(this));
  },

  /**
   * Stop the currently running host.
   *
   * @param {Function} callback [Error err].
   */
  stop: function(callback) {
    debug('stop');
    this.port = null;
    if (this._process) {
      this._process.on('exit', function() {
        // if the user didn't specify a custom profile
        // TODO: the global profile handling stuff should remove the need
        //       for this.
        if (!this.options.profile) {
          remove(this._profile, callback);
        }
      }.bind(this));
      this._process.kill();
    }
  }
};

module.exports = Host;
