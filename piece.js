var Piece = module.exports = function(type, color, x, y) {
    this.type = type;
    this.color = color;
    this.x = x;
    this.y = y;
    this.px = x;
    this.py = y;
    this.moved = false;
};

Piece.Types = {
    PAWN:   0,
    ROOK:   1,
    KNIGHT: 2,
    BISHOP: 3,
    QUEEN:  4,
    KING:   5
};

Piece.Colors = {
    BLACK: -1,
    WHITE:  1
};

Piece.Moves = {
    MOVE:      0,
    DIE:       1,
    SWAP:      2
}

Piece.prototype.reset = function() {
    this.x = this.px;
    this.y = this.py;
};

Piece.prototype.move = function(x, y) {
    this.px = this.x
    this.py = this.y;
    this.x = x;
    this.y = y;
}

Piece.prototype.moveSummary = function(x, y, b) {
    var target = b[x][y];
    switch(this.type) {
        case Piece.Types.PAWN:
            // Move forward by one
            if (x === this.x && y === this.y + this.color && !target) {
                return {
                    valid: true,
                    attack: false,
                    steps: [
                        {x: this.x, y: this.y, move: Piece.Moves.MOVE, to: {x: x, y: y}}
                    ]
                };
            }

            // Move forward by two
            // - x does not change
            // - y moves forward by 2
            // - target is empty
            // - space 1 forward is empty
            // - piece has not moved yet
            if (x === this.x && y === this.y + 2*this.color && !target && !b[x][y-this.color] && !this.moved) {
                return {
                    valid: true,
                    attack: false,
                    passantVulnerable: true,
                    steps: [
                        {x: this.x, y: this.y, move: Piece.Moves.MOVE, to: {x: x, y: y}}
                    ]
                };
            }

            // Attacking
            // - x changes by +- 1
            // - y moves forward by 1
            // - target exists
            // - target is opponent piece
            if ((x === this.x + 1 || x === this.x - 1) && y === this.y + this.color && target && target.color === this.color * -1) {
                return {
                    valid: true,
                    attack: true,
                    takes: target,
                    steps: [
                        {x: x, y: y, move: Piece.Moves.DIE},
                        {x: this.x, y:this.y, move: Piece.Moves.MOVE, to: {x: x, y: y}}
                    ]
                };
            }

            // En passant attack
            // - x changes by +- 1
            // - y moves forward by 1
            // - target is empty
            // - passantTarget is opponent piece
            // -- passantTarget is passant vulnerable
            var passantTarget = b[x][this.y]
            if ((x === this.x + 1 || x === this.x - 1)
                && y === this.y + this.color
                && !target && passantTarget
                && passantTarget.color === this.color * -1
                && passantTarget.passantVulnerable) {
                return {
                    valid: true,
                    attack: true,
                    takes: passantTarget,
                    enpassant: true,
                    steps: [
                        {x: passantTarget.x, y: passantTarget.y, move: Piece.Moves.DIE},
                        {x: this.x, y: this.y, move: Piece.Moves.MOVE, to: {x: x, y: y}}
                    ]
                };
            }

            return {
                valid: false,
                message: 'This is not a valid pawn move'
            };
        case Piece.Types.ROOK:
            // Ensure there is only change is x or y
            if (x !== this.x && y !== this.y) {
                return {
                    valid: false,
                    message: 'A rook can only move in one direction on the grid.'
                };
            }

            // Ensure there are no pieces between piece and target
            if (x !== this.x) {
                var low = Math.min(x, this.x);
                var high = Math.max(x, this.x);
                for (var i = low+1; i < high; i++) {
                    if (b[i][y]) {
                        return {
                            valid: false,
                            message: 'There are pieces in the way.'
                        };
                    }
                }
            } else {
                var low = Math.min(y, this.y);
                var high = Math.max(y, this.y);
                for (var i = low+ 1; i < high; i++) {
                    if (b[x][i]) {
                        return {
                            valid: false,
                            message: 'There are pieces in the way.'
                        };
                    }
                }
            }

            if (target) {
                if (target.color === this.color) {
                    return {
                        valid: false,
                        message: 'Rook cannot attack friendly piece.'
                    };
                } else {
                    return {
                        valid: true,
                        attack: true,
                        takes: target,
                        steps: [
                            {x: x, y: y, move: Piece.Moves.DIE},
                            {x: this.x, y: this.y, move: Piece.Moves.MOVE, to: {x: x, y: y}}
                        ]
                    };
                }
            }

            return {
                valid: true,
                attack: false,
                steps: [
                    {x: this.x, y: this.y, move: Piece.Moves.MOVE, to: {x: x, y: y}}
                ]
            };
        case Piece.Types.KNIGHT:
            var dx = Math.abs(x - this.x);
            var dy = Math.abs(y - this.y);
            if (!((dx === 1 && dy === 2) || (dx === 2 && dy === 1))) {
                return {
                    valid: false,
                    message: 'A Knight muust move in a 2x1 L pattern.'
                };
            }

            if (target) {
                if (target.color === this.color) {
                    return {
                        valid: false,
                        message: 'Knight cannot attack friendly piece.'
                    };
                } else {
                    return {
                        valid: true,
                        attack: true,
                        takes: target,
                        steps: [
                            {x: x, y: y, move: Piece.Moves.DIE},
                            {x: this.x, y: this.y, move: Piece.Moves.MOVE, to: {x: x, y: y}}
                        ]
                    };
                }
            }

            return {
                valid: true,
                attack: false,
                steps: [
                    {x: this.x, y: this.y, move: Piece.Moves.MOVE, to: {x: x, y: y}}
                ]
            };
        case Piece.Types.BISHOP:
            var dx = Math.abs(x - this.x);
            var dy = Math.abs(y - this.y);
            if (dx !== dy) {
                return {
                    valid: false,
                    message: 'Bishops may only move along diagonal paths.'
                };
            }
            var xdir = 1;
            if (x < this.x) {
                xdir = -1;
            }
            var ydir = 1;
            if (y  < this.y) {
                ydir = -1;
            }

            var cx = this.x + xdir;
            var cy = this.y + ydir;

            // Check if path is blocked
            while (cx !== x) {
                if (b[cx][cy]) {
                    return {
                        valid: false,
                        message: 'The path is blocked.'
                    };
                }
                cx += xdir;
                cy += ydir;
            }

            if (target) {
                if (target.color === this.color) {
                    return {
                        valid: false,
                        message: 'Bishop cannot attack friendly piece.'
                    };
                } else {
                    return {
                        valid: true,
                        attack: true,
                        takes: target,
                        steps: [
                            {x: x, y: y, move: Piece.Moves.DIE},
                            {x: this.x, y: this.y, move: Piece.Moves.MOVE, to: {x: x, y: y}}
                        ]
                    };
                }
            }

            return {
                valid: true,
                attack: false,
                steps: [
                    {x: this.x, y: this.y, move: Piece.Moves.MOVE, to: {x: x, y: y}}
                ]
            };
        case Piece.Types.QUEEN:
            this.type = Piece.Types.ROOK;
            var r = this.moveSummary(x, y ,b);
            if (r.valid) {
                this.type = Piece.Types.QUEEN;
                return r;
            } else {
                this.type = Piece.Types.BISHOP;
                var r = this.moveSummary(x, y, b);
                this.type = Piece.Types.QUEEN;
                return r;
            }
        case Piece.Types.KING:
            // Castle move
            if (!this.moved && target && !target.moved && this.color === target.color && target.type === Piece.Types.ROOK) {
                // Ensure the path is empty
                var min = Math.min(this.x, target.x);
                var max = Math.max(this.x, target.x);
                for (var i = min + 1; i < max; i++) {
                    if (b[i][this.y]) {
                        return {
                            valid: false,
                            message: 'There must be an empty space between the king and rook to castle'
                        }
                    }
                }
                // TODO: Ensure no squares on the path are checked

                var dir = 1;
                if ((max - min) === 4)
                    dir = -1
                return {
                    valid: true,
                    attack: false,
                    castle: true,
                    steps: [
                        // Move King
                        {x: this.x, y: this.y, move: Piece.Moves.MOVE, to: {x: this.x + 2*dir, y: this.y}},
                        // Move Rook
                        {x: x, y: y, move: Piece.Moves.MOVE, to: {x: this.x + dir, y: y}}
                    ]
                };
            }


            var dx = Math.abs(x - this.x);
            var dy = Math.abs(y - this.y);

            if (dx > 1 || dy > 1) {
                return {
                    valid: false,
                    message: 'King can only move to an adjacent space'
                };
            }
            if (target) {
                if (target.color === this.color) {
                    return {
                        valid: false,
                        message: 'King cannot attack friendly piece.'
                    };
                } else {
                    return {
                        valid: true,
                        attack: true,
                        takes: target,
                        steps: [
                            {x: x, y: y, move: Piece.Moves.DIE},
                            {x: this.x, y: this.y, move: Piece.Moves.MOVE, to: {x: x, y: y}}
                        ]
                    };
                }
            }

            return {
                valid: true,
                attack: false,
                steps: [
                    {x: this.x, y: this.y, move: Piece.Moves.MOVE, to: {x: x, y: y}}
                ]
            };
        default:
            return {
                valid: false,
                message: 'Unknown piece type'
            };
    }
};
