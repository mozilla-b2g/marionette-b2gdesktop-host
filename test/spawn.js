suite('spawn', function() {
  var assert = require('assert'),
      hostSpawn = require('../lib/spawn').spawn,
      net = require('net');

  var B2G_DESKTOP = __dirname + '/fixtures/b2g';

  suite('spawn', function() {
    var child;
    var port;

    teardown(function() {
      // if there is a child kill the process
      child && child.kill && child.kill();
      child = null;
    });

    setup(function(done) {
      hostSpawn(B2G_DESKTOP, function(err, _port, _child) {
        if (err) return done(err);
        port = _port;
        child = _child;
        console.log(port);
        done();
      });
    });

    function openSocket(callback) {
      var sock = net.connect({ port: port }, function() {
        console.log('OPENZ!');
        callback(sock);
      });
      sock.on('error', function() {
        console.log('ERRORS!');
        setTimeout(openSocket, 2000, callback);
      });
    }

    test('spawn', function(done) {
      openSocket(function(sock) {
        sock.on('data', function(content) {
          content = content.toString();
          console.log(content);
          if (content.indexOf('gecko') !== -1)
            done();
        });
      });
    });

  });
});
