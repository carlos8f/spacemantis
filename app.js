var express = require('express'),
    app = module.exports = express.createServer(),
    conf = require('./conf.js');

app.configure(function() {
  app.use(app.router);
  app.use(express.static(__dirname + '/static'));
  // Static HTML render.
  app.register('.html', {
    compile: function(str, options) {
      return function (locals) {
        return str;
      };
    }
  });
  app.set('view engine', 'html');
  app.set('view options', {
    layout: false
  });
});
app.configure('development', function() {
  app.use(express.errorHandler({ dumpExceptions: true, showStack: true })); 
});
app.configure('production', function() {
  app.use(express.errorHandler()); 
});

app.get('/', function(req, res) {
  res.render('index');
});

require('./server');

if (!module.parent) {
  app.listen(conf.port);
  console.log("Express server listening on port %d in %s mode", app.address().port, app.settings.env);
}
