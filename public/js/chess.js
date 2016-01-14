var pieceTypes = {
    PAWN:   0,
    ROOK:   1,
    KNIGHT: 2,
    BISHOP: 3,
    QUEEN:  4,
    KING:   5
};

var Colors = {
    BLACK: -1,
    WHITE:  1
};

var gameStates = {
    RUNNING:       0,
    CHECK_W:       1,
    CHECK_B:      -1,
    CHECK_MATE_W:  2,
    CHECK_MATE_B: -2,
    DRAW:          5,
    INVALID:       6
};

var msgTypes = {
    INIT:   0,
    SYNC:   1,
    UPDATE: 2,
    MOVE:   3,
    CHAT:   4
};

var Moves = {
    MOVE:      0,
    DIE:       1,
    SWAP:      2
};

var socket = null;
var board = [];
var turn = null;
var state = null;
var me = null;

var selected = null;

function getPieceClass(type, color) {
    var c = '';
    if (color === Colors.BLACK)
        c += 'b_';
    else
        c += 'w_';
    switch(type) {
        case pieceTypes.PAWN:
            return c+'pawn';
        case pieceTypes.ROOK:
            return c+'rook';
        case pieceTypes.KNIGHT:
            return c+'knight';
        case pieceTypes.BISHOP:
            return c+'bishop';
        case pieceTypes.QUEEN:
            return c+'queen';
        case pieceTypes.KING:
            return c+'king';
    }
}

function resetBoard() {
    $('#status').text('Game disconnected')
}

function updateBoard() {
    if (turn === me) {
        $('#status').text('Your move')
    } else {
        $('#status').text('Opponent\'s move');
    }
    for (y = 0; y < 8; y++) {
        for (x = 0; x < 8; x++) {
            var sel = '#'+x+'-'+y;
            $(sel).css('background-image', 'none');
            if (board[x][y])
                $(sel).css('background-image', 'url(/img/'+getPieceClass(board[x][y].type, board[x][y].color)+'.png')
        }
    }
}

function updateBoardPartial(u) {
    if (!u.move.valid) {
        console.log(u.move.message);
        return;
    }
    if (turn === me) {
        $('#status').text('Your move')
    } else {
        $('#status').text('Opponent\'s move');
    }

    for (var i = 0; i < u.move.steps.length; i++) {
        var s = u.move.steps[i];
        if (s.move === Moves.MOVE) {
            board[s.to.x][s.to.y] = board[s.x][s.y];
            board[s.x][s.y] = undefined;
            $('#'+ s.x+'-'+ s.y).css('background-image', 'none');
            $('#'+ s.to.x+'-'+ s.to.y).css('background-image', 'url(/img/'+getPieceClass(board[s.to.x][s.to.y].type, board[s.to.x][s.to.y].color)+'.png)');
        } else if (s.move === Moves.DIE) {
            $('#'+ s.x+'-'+ s.y).css('background-image', 'none');
            board[s.x][s.y] = undefined;
        }
    }

    $('#dead_w').empty();
    for (var i = 0; i < u.dead_w.length; i++) {
        $('#dead_w').append($('<div>').addClass('dead')
        .css('background-image', 'url(/img/'+getPieceClass(u.dead_w[i].type, u.dead_w[i].color)+'.png)'));
    }

    $('#dead_b').empty();
    for (var i = 0; i < u.dead_b.length; i++) {
        $('#dead_b').append($('<div>').addClass('dead')
        .css('background-image', 'url(/img/'+getPieceClass(u.dead_b[i].type, u.dead_b[i].color)+'.png)'));
    }
}

function parseId(id) {
    var p = id.split('-');
    return {
        x: parseInt(p[0]),
        y: parseInt(p[1])
    }
}

function sendMove(from, to) {
    var msg = {
        from: from,
        to: to,
        _type: msgTypes.MOVE
    }
    console.log('Sending move: %O', msg);
    socket.send(JSON.stringify(msg));
}


$(document).ready(function() {
    socket = new WebSocket('ws://'+window.location.hostname + ':' + window.location.port);

    socket.onopen = function(event) {
        console.log('socket opened');
    };

    socket.onmessage = function(event) {
        var m = JSON.parse(event.data)
        if (!m.hasOwnProperty('_type')) {
            console.log('Message has no type: %O', m);
            return;
        }
        switch(m._type) {
            case msgTypes.INIT:
                console.log('game init');
                me = m.you;
                if (me === Colors.WHITE)
                    $('#player-color').text('You are white player.');
                else
                    $('#player-color').text('You are black player.');
            case msgTypes.SYNC:
                console.log('game sync');
                board = m.board;
                turn = m.turn;
                state = m.state;
                updateBoard();
                break;
            case msgTypes.UPDATE:
                console.log('game update');
                turn = m.turn;
                state = m.state;
                updateBoardPartial(m);
                break;
            case msgTypes.CHAT:
                var div = $('#chat-log');
                if (m.from === me)
                    div.append($('<p>').text('Me: '+m.text));
                else
                    div.append($('<p>').text('Opponent: '+m.text));

                div.animate({scrollTop: div.prop('scrollHeight') - div.height()}, 150);
                break;
            default:
                console.log('Unknown message type: %O', m)
        }
    };

    socket.onclose = function(event) {
        resetBoard();
        console.log('Websocket closed.');
    };

    $('.board > tbody > tr > td').click(function(e) {
        if (!selected) {
            selected = e.target.id;
            $('#'+selected).addClass('selected');
            console.log('Piece selected');
        } else if (selected === e.target.id) {
            $('#'+selected).removeClass('selected');
            selected = undefined;
            console.log('Selection cleared');
        } else {
            sendMove(parseId(selected), parseId(e.target.id));
            $('#'+selected).removeClass('selected');
            selected = undefined;
        }
    });

    $('#chat-input').keypress(function(e) {
        if (e.which == 13) {
            if (socket) {
                var msg = {
                    _type: msgTypes.CHAT,
                    text: $('#chat-input').val()
                };
                $('#chat-input').val('');
                socket.send(JSON.stringify(msg));
            }
        }
    });
});