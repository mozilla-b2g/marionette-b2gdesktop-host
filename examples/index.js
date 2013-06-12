var Marionette = require('marionette-client'),
    host = require('../index');

var B2G_ROOT = __dirname + '/b2g';

host.spawn('b2g', B2G_ROOT, function(err, port, child) {
  setTimeout(function() {
    var driver = new Marionette.Drivers.Tcp({ port: port });
    driver.connect(function() {
      var client = new Marionette.Client(driver);
      client.startSession(function() {
        console.log('WOOT SHIT WORKS!!');
      });
    });
  }, 5000);
});
