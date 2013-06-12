// outside of a test
var host = require('marionette-host-environment');
var options = {};
// spawn a child process
host.spawn(__dirname, options, function(err, port, child) {

});
