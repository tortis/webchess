var Game = require('./game.js');

var gameMgr = module.exports = {
    pending: [],
    games: [],
    startGame: function(p1, p2) {
        var g = new Game(p1, p2);
        gameMgr.games.push(p1, p2);
        g.start(function() {
            // Game is complete, remove from list.
            var pos = gameMgr.games.indexOf(g);
            gameMgr.games.splice(pos, 1);
            console.log('Game ended');
        });
    },
    match: function() {
        while (gameMgr.pending.length > 1) {
            var p1 = gameMgr.pending.pop();
            if (p1.readyState !== p1.OPEN) {
                continue;
            }
            var p2 = gameMgr.pending.pop();
            if (p2.readyState !== p2.OPEN) {
                gameMgr.pending.push(p1);
                continue;
            }
            gameMgr.startGame(p1, p2);
        }
    }
}