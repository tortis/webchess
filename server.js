var restify         = require('restify');
var game            = require('./game.js');
var WebSocketServer = require('ws').Server;
var gameMgr         = require('./gameMgr.js');

var server = restify.createServer({
    name: 'Web Chess'
});

var wss = new WebSocketServer({server: server});
wss.on('connection', function(ws) {
    gameMgr.pending.push(ws);
    gameMgr.match();
});

server.get('/.*', restify.serveStatic({
    directory: './public',
    default: 'index.html'
}))

server.listen(1337, function() {
    console.log('%s listening at %s', server.name, server.url);
});
