suite('spawn', function() {
  var assert = require('assert'),
      hostSpawn = require('../lib/spawn').spawn,
      net = require('net'),
      fs = require('fs');

  var B2G_DESKTOP = __dirname + '/fixtures/b2g';
  var child;
  var port;

  teardown(function() {
    // if there is a child kill the process
    child && child.kill && child.kill();
    child = null;
  });

  suite('spawn with given profile', function() {
    // the profile has its own port
    var port = 60023;
    var profile = __dirname + '/fixtures/test-profile/';

    test('with given profile', function(done) {
      hostSpawn(B2G_DESKTOP,
                { profile: profile },
                function(err, givenPort, _child, _profile) {

        if (err) return done(err);
        assert.ok(!givenPort, 'port is not given');
        child = _child;
        assert.equal(_profile, profile, 'returns same profile');
        done();
      });
    });
  });

  suite('spawn', function() {
    var port;

    var profile;
    setup(function(done) {
      hostSpawn(B2G_DESKTOP, function(err, _port, _child, _profile) {
        if (err) return done(err);
        port = _port;
        child = _child;
        profile = _profile;
        done();
      });
    });

    function openSocket(callback) {
      var sock = net.connect({ port: port }, function() {
        callback(sock);
      });
      sock.on('error', function() {
        setTimeout(openSocket, 2000, callback);
      });
    }

    test('profile exists', function() {
      assert.ok(fs.existsSync(profile));
    });

    test('spawn', function(done) {
      openSocket(function(sock) {
        sock.on('data', function(content) {
          content = content.toString();
          if (content.indexOf('gecko') !== -1)
            done();
        });
      });
    });

  });
});
