suite('host', function() {
  var Marionette = require('marionette-client'),
      Host = require('../'),
      mozprofile = require('mozilla-profile-builder'),
      emptyPort = require('empty-port');
      net = require('net'),
      fs = require('fs');

  function connect(port, callback) {
    var Tcp = Marionette.Drivers.Tcp;

    // the intent is to verify that the marionette connection can/cannot work.
    (new Tcp({ port: port, tries: 5 })).connect(callback);
  }

  var subject;
  setup(function() {
    subject = new Host();
  });

  var port;
  setup(function(done) {
    emptyPort({ startPort: 60000 }, function(err, _port) {
      port = _port;
      done(err);
    });
  });

  var profile;
  setup(function(done) {
    var options = {
      profile: ['gaia', __dirname + '/../b2g'],
      prefs: {
        'marionette.defaultPrefs.enabled': true,
        'marionette.defaultPrefs.port': port
      }
    };

    mozprofile.create(options, function(err, _profile) {
      profile = _profile;
      done(err);
    });
  });

  teardown(function(done) {
    profile.destroy(done);
  });

  test('.options', function() {
    var subject = new Host({ xxx: true });
    assert.equal(subject.options.xxx, true);
  });

  test('Host.metadata', function() {
    assert.equal(Host.metadata.host, 'b2g-desktop');
  });

  suite('#start', function() {
    var state;
    setup(function(done) {
      subject.start(profile.path, {}, function(err, _state) {
        if (err) return done(err);
        state = _state;
        done();
      });
    });

    test('can connect after start', function(done) {
      connect(port, done);
    });

    test('logging', function(done) {
      state.log.on('data', function onData(data) {
        if (data.toString().indexOf('marionette') !== -1) {
          state.log.removeListener('data', onData);
          done();
        }
      });
    });

    teardown(function(done) {
      if (subject._process)
        subject._process.on('exit', done);
        subject._process.kill();
    });
  });

  suite('#stop', function() {
    setup(function(done) {
      subject.start(profile.path, done);
    });

    setup(function(done) {
      subject.stop(done);
    });

    test('after closing process', function(done) {
      var socket = net.connect(port);
      socket.on('error', function(err) {
        assert.equal(err.code, 'ECONNREFUSED');
        done();
      });
    });
  });
});
