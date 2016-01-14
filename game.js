var Piece = require('./piece.js');

var Game = module.exports = function(p1, p2) {
    this.player_w = p1;
    this.player_b = p2;
    this.turn = Piece.Colors.WHITE;
    this.state = Game.States.RUNNING;
    this.dead_w = [];
    this.dead_b = [];
    this.lastMoveTime = Date.now();
    this.board = [];

    // White pieces
    for (var i = 0; i < 8; i++) {
        this.board[i] = [];
        this.board[i][1] = new Piece(Piece.Types.PAWN, Piece.Colors.WHITE, i, 1);
    }
    this.board[0][0] = new Piece(Piece.Types.ROOK,   Piece.Colors.WHITE, 0, 0);
    this.board[1][0] = new Piece(Piece.Types.KNIGHT, Piece.Colors.WHITE, 1, 0);
    this.board[2][0] = new Piece(Piece.Types.BISHOP, Piece.Colors.WHITE, 2, 0);
    this.board[3][0] = new Piece(Piece.Types.QUEEN,  Piece.Colors.WHITE, 3, 0);
    this.board[4][0] = new Piece(Piece.Types.KING,   Piece.Colors.WHITE, 4, 0);
    this.board[5][0] = new Piece(Piece.Types.BISHOP, Piece.Colors.WHITE, 5, 0);
    this.board[6][0] = new Piece(Piece.Types.KNIGHT, Piece.Colors.WHITE, 6, 0);
    this.board[7][0] = new Piece(Piece.Types.ROOK,   Piece.Colors.WHITE, 7, 0);

    // Black pieces
    for (var i = 0; i < 8; i++) {
        this.board[i][6] = new Piece(Piece.Types.PAWN, Piece.Colors.BLACK, i, 6);
    }
    this.board[0][7] = new Piece(Piece.Types.ROOK,   Piece.Colors.BLACK, 0, 7);
    this.board[1][7] = new Piece(Piece.Types.KNIGHT, Piece.Colors.BLACK, 1, 7);
    this.board[2][7] = new Piece(Piece.Types.BISHOP, Piece.Colors.BLACK, 2, 7);
    this.board[3][7] = new Piece(Piece.Types.QUEEN,  Piece.Colors.BLACK, 3, 7);
    this.board[4][7] = new Piece(Piece.Types.KING,   Piece.Colors.BLACK, 4, 7);
    this.board[5][7] = new Piece(Piece.Types.BISHOP, Piece.Colors.BLACK, 5, 7);
    this.board[6][7] = new Piece(Piece.Types.KNIGHT, Piece.Colors.BLACK, 6, 7);
    this.board[7][7] = new Piece(Piece.Types.ROOK,   Piece.Colors.BLACK, 7, 7);
}

Game.States = {
    RUNNING:       0,
    CHECK_W:       1,
    CHECK_B:      -1,
    CHECK_MATE_W:  2,
    CHECK_MATE_B: -2,
    DRAW:          5,
    INVALID:       6
};

Game.MsgTypes = {
    INIT:   0,
    SYNC:   1,
    UPDATE: 2,
    MOVE:   3,
    CHAT:   4
}

Game.prototype.executeMove = function(move) {
    for (var i = 0; i < move.steps.length; i++) {
        var s = move.steps[i];
        switch(move.steps[i].move) {
            case Piece.Moves.MOVE:
                if (move.passantVulnerable) {
                    this.board[s.x][s.y].passantVulnerable = true;
                }
                this.board[s.to.x][s.to.y] = this.board[s.x][s.y];
                this.board[s.x][s.y] = undefined;
                this.board[s.to.x][s.to.y].move(s.to.x, s.to.y);
                break;
            case Piece.Moves.DIE:
                if (this.board[s.x][s.y].color === Piece.Colors.WHITE) {
                    this.dead_w.push(this.board[s.x][s.y]);
                    this.board[s.x][s.y] = undefined;
                } else {
                    this.dead_b.push(this.board[s.x][s.y]);
                    this.board[s.x][s.y] = undefined;
                }
                break;
            case Piece.Moves.SWAP:
                // Unused?
                break;
            default:
        }
    }
};

Game.prototype.undoMove = function(move) {
    for (var i = move.steps.length-1; i >= 0; i--) {
        switch(move.steps[i].move) {
            case Piece.Moves.MOVE:
                var s = move.steps[i];
                if (move.passantVulnerable) {
                    this.board[s.to.x][s.to.y].passantVulnerable = false;
                }
                this.board[s.x][s.y] = this.board[s.to.x][s.to.y];
                this.board[s.to.x][s.to.y] = undefined;
                this.board[s.x][s.y].move(s.x, s.y);
                break;
            case Piece.Moves.DIE:
                if (this.board[s.x][s.y].color === Piece.Colors.WHITE) {
                    this.board[s.x][s.y] = this.dead_w.pop();
                } else {
                    this.board[s.x][s.y] = this.dead_b.pop();
                }
                break;
            case Piece.Moves.SWAP:
                // Unused?
                break;
            default:
        }
    }
};

Game.prototype.attemptMove = function(from_x, from_y, to_x, to_y) {
    var piece = this.board[from_x][from_y];
    var target = this.board[to_x][to_y];

    if (!piece) {
        return {
            valid: false,
            message: 'There is no piece to move at ('+from_x+', '+from_y+')'
        }
    }

    if (piece.color !== this.turn) {
        return {
            valid: false,
            message: 'You cannot move an opponent\'s piece.'
        }
    }

    if (to_x < 0 || to_x > 7 || to_y < 0 || to_y > 7) {
        return {
            valid: false,
            message: 'Invalid move, ('+to_x+', '+to_y+') is not a valid position.'
        }
    }

    var moveSummary = piece.moveSummary(to_x, to_y, this.board);
    if (moveSummary.valid) {
        var lastState = this.state;
        this.executeMove(moveSummary);
        this.updateState();

        // Check if this move leaves the player in check
        if (this.state !== this.turn) {
            // Change turn
            this.turn *= -1;

            // Mark pieces as moved
            for (var i = 0; i < moveSummary.steps.length; i++) {
                if (moveSummary.steps[i].move === Piece.Moves.MOVE)
                    this.board[moveSummary.steps[i].to.x][moveSummary.steps[i].to.y].moved = true;
            }

            this.lastMoveTime = Date.now();
            return moveSummary;
        } else {
            // Move results in check
            this.state = lastState
            this.undoMove(moveSummary);
            return {
                valid: false,
                message: 'This move leaves you in check.'
            }
        }
    } else {
        return moveSummary
    }
};

Game.prototype.updateState = function() {
    if (this.state === Game.States.INVALID)
        return;
    // How do you even check for check.
    // Loop over every piece, and attempt to attack the opponent king.
};

Game.prototype.broadcast = function(msg) {
    if (this.player_w)
        this.player_w.send(msg);
    if (this.player_b)
        this.player_b.send(msg);
};

Game.prototype.start = function(complete) {
    // Player White - Message Handler
    this.player_w.on('message', function(data) {
        console.log('Recieved msg from player_w:');
        var m = JSON.parse(data);
        if (!m.hasOwnProperty('_type')) {
            console.log('Message has no type');
            return;
        }
        switch(m._type) {
            case Game.MsgTypes.MOVE:
                var r;
                if (this.turn !== Piece.Colors.WHITE) {
                    r = {
                        valid: false,
                        message: 'It is not your turn to move.'
                    };
                } else {
                    var r = this.attemptMove(m.from.x, m.from.y, m.to.x, m.to.y);
                }
                var updateMsg = {
                    _type: Game.MsgTypes.UPDATE,
                    state: this.state,
                    turn: this.turn,
                    dead_w: this.dead_w,
                    dead_b: this.dead_b,
                    move: r
                }
                if (r.valid)
                    this.broadcast(JSON.stringify(updateMsg));
                else
                    this.player_w.send(JSON.stringify(updateMsg));
                break;
            case Game.MsgTypes.CHAT:
                m.from = Piece.Colors.WHITE;
                this.broadcast(JSON.stringify(m));
                break;
            default:
                console.log('Unknown message type.');
        }
    }.bind(this));

    // Player Black - Message Handler
    this.player_b.on('message', function(data) {
        console.log('Recieved msg from player_b:');
        var m = JSON.parse(data);
        if (!m.hasOwnProperty('_type')) {
            console.log('Message has no type');
            return;
        }

        switch(m._type) {
            case Game.MsgTypes.MOVE:
                if (this.turn !== Piece.Colors.BLACK) {
                    r = {
                        valid: false,
                        message: 'It is not your turn to move.'
                    };
                } else {
                    var r = this.attemptMove(m.from.x, m.from.y, m.to.x, m.to.y);
                }
                var updateMsg = {
                    _type: Game.MsgTypes.UPDATE,
                    state: this.state,
                    turn: this.turn,
                    dead_w: this.dead_w,
                    dead_b: this.dead_b,
                    move: r
                }
                if (r.valid)
                    this.broadcast(JSON.stringify(updateMsg));
                else
                    this.player_b.send(JSON.stringify(updateMsg));
                break;
            case Game.MsgTypes.CHAT:
                m.from = Piece.Colors.BLACK;
                this.broadcast(JSON.stringify(m));
                break;
            default:
                console.log('Unknown message type.');
        }
    }.bind(this));

    // Player White - Close handler
    this.player_w.on('close', function() {
        this.state = Game.States.INVALID;
        this.player_b.close();
        complete();
    }.bind(this));

    // Player Black - Close handler
    this.player_b.on('close', function() {
        this.state = Game.States.INVALID;
        this.player_w.close();
    }.bind(this));


    // Send init sync message
    var startMsg = {
        _type: Game.MsgTypes.INIT,
        turn: this.turn,
        board: this.board,
        state: this.state,
        you: Piece.Colors.BLACK
    }

    this.player_b.send(JSON.stringify(startMsg));
    startMsg.you = Piece.Colors.WHITE;
    this.player_w.send(JSON.stringify(startMsg));
    startMsg.you = undefined;
};

Game.prototype.toString = function() {
    var s = '';
    for (var y = 7; y >= 0; y--) {
        s += y + '  ';
        for (var x = 0; x < 8; x++) {
            if (this.board[x][y]) {
                //s += ' ('+this.board[x][y].x + ','+this.board[x][y].y+') ';
                s += ' ' + this.board[x][y].type;
                if (this.board[x][y].color === Piece.Colors.WHITE) {
                    s += 'w ';
                } else {
                    s += 'b ';
                }
            } else {
                s += '    ';
            }
        }
        s += '\n';
    }
    s += '\n    0   1   2   3   4   5   6   7\n';
    return s;
}

