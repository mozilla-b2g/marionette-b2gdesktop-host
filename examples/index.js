var Marionette = require('marionette-client'),
    host = require('../index'),
    static = require('node-static'),
    http = require('http');

var B2G_ROOT = __dirname + '/b2g';
var HTTP_PORT = 60034;

// create server
var file = new(static.Server)(__dirname + '/public');
var server = require('http').createServer(function(request, response) {
  request.addListener('end', function() {
    //
    // Serve files!
    //
    file.serve(request, response);
  }).resume();
}).listen(HTTP_PORT);

var driver;
var client;
var b2gProcess;

// creates connection to marionette
function connect(port) {
  driver = new Marionette.Drivers.Tcp({ port: port });
  driver.connect(function() {
    createSession();
  });
}

// initiates session for tests to use
function createSession() {
  client = new Marionette.Client(driver, {
    defaultCallback: function() {}
  });

  client.startSession(function() {
    invokeTests();
  });
}

// do somethings with marionette
function invokeTests() {
  client.goUrl('http://localhost:' + HTTP_PORT);
  client.findElement('#show-secret', function(err, el) {
    el.click();
    client.findElement('#secret', function(err, el) {
      el.text(function(err, text) {
        console.log('[marionette] secret: "%s"', text);
        client.deleteSession(function() {
          b2gProcess.kill();
          server.close();
        });
      });
    });
  });
}

host.spawn(B2G_ROOT, { product: 'b2g' }, function(err, port, child) {
  b2gProcess = child;
  connect(port);
});
