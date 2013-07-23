suite('host', function() {
  var Marionette = require('marionette-client'),
      Host = require('../host'),
      net = require('net'),
      fs = require('fs');

  function connect(port, callback) {
    var Tcp = Marionette.Drivers.Tcp;

    // the intent is to verify that the marionette connection can/cannot work.
    (new Tcp({ port: port, tries: 1 })).connect(callback);
  }

  var subject;

  setup(function() {
    subject = new Host();
  });

  test('.options', function() {
    var subject = new Host({ xxx: true });
    assert.equal(subject.options.xxx, true);
  });

  test('Host.metadata', function() {
    assert.equal(Host.metadata.host, 'b2g-desktop');
  });

  suite('#start', function() {
    var port;
    setup(function(done) {
      subject.start(done);
    });

    test('can connect after start', function(done) {
      connect(subject.port, done);
    });

    teardown(function() {
      if (subject._process)
        subject._process.kill();
    });
  });

  suite('#stop - without custom profile', function() {
    var port,
        profile;

    setup(function(done) {
      subject.start(done);
    });

    setup(function(done) {
      port = subject.port;
      profile = subject._profile;

      subject.stop(done);
    });

    test('should set .port to null', function() {
      assert.ok(!subject.port);
    });

    test('should delete profile', function() {
      assert.ok(profile, 'has profile');
      assert.ok(!fs.existsSync(profile), 'removes profile');
    });

    test('after closing process', function(done) {
      var socket = net.connect(port);
      socket.on('error', function(err) {
        assert.equal(err.code, 'ECONNREFUSED');
        done();
      });
    });
  });

  suite('#restart', function() {
    var originalPort;
    setup(function(done) {
      subject.start(done);
    });

    setup(function(done) {
      originalPort = subject.port;
      subject.restart(done);
    });

    teardown(function(done) {
      subject.stop(done);
    });

    test('starts on new port', function(done) {
      assert.notEqual(originalPort, subject.port, 'port changes');
      connect(subject.port, done);
    });
  });
});
