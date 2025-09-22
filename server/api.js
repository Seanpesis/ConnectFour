let mysql = require('mysql2');

let connParams = {
    host: "localhost",
    user: "root",
    password: "Sp@2025!!lipaz",
    database: "my_db",
    connectionLimit: 1,
    queueLimit: 1
};

let pool = mysql.createPool(connParams);

let games = new Map(); 
let gameCounter = 1; 

function generateGameCode() {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
}

function checkWin(board, row, col, player) {
    let directions = [
        [0, 1], 
        [1, 0], 
        [1, 1],  
        [1, -1]   
    ];

    for (let [dx, dy] of directions) {
        let count = 1;
        for (let i = 1; i < 4; i++) {
            let newRow = row + i * dx;
            let newCol = col + i * dy;
            if (newRow >= 0 && newRow < 6 && newCol >= 0 && newCol < 7 && 
                board[newRow][newCol] === player) {
                count++;
            } else {
                break;
            }
        }
        for (let i = 1; i < 4; i++) {
            let newRow = row - i * dx;
            let newCol = col - i * dy;
            if (newRow >= 0 && newRow < 6 && newCol >= 0 && newCol < 7 && 
                board[newRow][newCol] === player) {
                count++;
            } else {
                break;
            }
        }
        if (count >= 4) {
            return true;
        }
    }
    return false;
}

function login(req, res, q) {
    if (req.method != "POST") {
        res.writeHead(400);
        res.end();
        return;
    }

    let body = '';
    req.on('data', (chunk) => {
        body += chunk;
    });
    req.on('end', () => {
        let bodyAsObject = JSON.parse(body);
        let username = bodyAsObject["username"];
        let password = bodyAsObject["password"];
        
        if (!username || !password) {
            res.writeHead(400);
            res.end();
            return;
        }

        pool.getConnection((err, conn) => {
            if (err) {
                res.writeHead(500);
                res.end();
                return;
            }
            conn.query("SELECT username FROM users WHERE username=? AND password=?", [username, password], (err, result) => {
                conn.release();
                if (err) {
                    res.writeHead(500);
                    res.end();
                    return;
                }
                if (result.length == 0) {
                    res.writeHead(401);
                    res.end();
                    return;
                }
                res.writeHead(200, {"Content-Type": "application/json"});
                res.end(JSON.stringify({success: true, message: "התחברות הצליחה"}));
            });
        });
    });
}

function createGame(req, res, q) {
    if (req.method != "POST") {
        res.writeHead(400);
        res.end();
        return;
    }

    let body = '';
    req.on('data', (chunk) => {
        body += chunk;
    });
    req.on('end', () => {
        let bodyAsObject = JSON.parse(body);
        let username = bodyAsObject["username"];
        
        if (!username) {
            res.writeHead(400);
            res.end();
            return;
        }

        let gameCode = generateGameCode();
        let board = Array(6).fill().map(() => Array(7).fill(''));
        
        let game = {
            id: gameCounter++,
            code: gameCode,
            board: board,
            players: [username],
            currentPlayer: 0,
            status: 'waiting',
            winner: null
        };
        
        games.set(gameCode, game);
        
        res.writeHead(200, {"Content-Type": "application/json"});
        res.end(JSON.stringify({success: true, gameCode: gameCode, message: "משחק נוצר בהצלחה"}));
    });
}

function joinGame(req, res, q) {
    if (req.method != "POST") {
        res.writeHead(400);
        res.end();
        return;
    }

    let body = '';
    req.on('data', (chunk) => {
        body += chunk;
    });
    req.on('end', () => {
        let bodyAsObject = JSON.parse(body);
        let gameCode = bodyAsObject["gameCode"];
        let username = bodyAsObject["username"];
        
        if (!gameCode || !username) {
            res.writeHead(400);
            res.end();
            return;
        }

        let game = games.get(gameCode);
        if (!game) {
            res.writeHead(404);
            res.end();
            return;
        }
        
        if (game.players.length >= 2) {
            res.writeHead(400);
            res.end();
            return;
        }
        
        game.players.push(username);
        game.status = 'playing';
        
        res.writeHead(200, {"Content-Type": "application/json"});
        res.end(JSON.stringify({success: true, message: "הצטרפת למשחק בהצלחה"}));
    });
}

function makeMove(req, res, q) {
    if (req.method != "POST") {
        res.writeHead(400);
        res.end();
        return;
    }

    let body = '';
    req.on('data', (chunk) => {
        body += chunk;
    });
    req.on('end', () => {
        let bodyAsObject = JSON.parse(body);
        let gameCode = bodyAsObject["gameCode"];
        let username = bodyAsObject["username"];
        let column = parseInt(bodyAsObject["column"]);
        
        if (!gameCode || !username || isNaN(column)) {
            res.writeHead(400);
            res.end();
            return;
        }

        let game = games.get(gameCode);
        if (!game) {
            res.writeHead(404);
            res.end();
            return;
        }
        
        if (game.status != 'playing') {
            res.writeHead(400);
            res.end();
            return;
        }
        
        let playerIndex = game.players.indexOf(username);
        if (playerIndex != game.currentPlayer) {
            res.writeHead(400);
            res.end();
            return;
        }
        
        let row = -1;
        for (let i = 5; i >= 0; i--) {
            if (game.board[i][column] === '') {
                row = i;
                break;
            }
        }
        
        if (row == -1) {
            res.writeHead(400);
            res.end();
            return;
        }
        
        let player = playerIndex == 0 ? 'X' : 'O';
        game.board[row][column] = player;
        
        if (checkWin(game.board, row, column, player)) {
            game.status = 'finished';
            game.winner = username;
        } else {
            game.currentPlayer = (game.currentPlayer + 1) % 2;
        }
        
        res.writeHead(200, {"Content-Type": "application/json"});
        res.end(JSON.stringify({
            success: true,
            board: game.board,
            currentPlayer: game.currentPlayer,
            status: game.status,
            winner: game.winner
        }));
    });
}

function getGame(req, res, q) {
    if (req.method != "GET") {
        res.writeHead(400);
        res.end();
        return;
    }

    let gameCode = q["code"];
    if (!gameCode) {
        res.writeHead(400);
        res.end();
        return;
    }

    let game = games.get(gameCode);
    if (!game) {
        res.writeHead(404);
        res.end();
        return;
    }
    
    res.writeHead(200, {"Content-Type": "application/json"});
    res.end(JSON.stringify({
        success: true,
        game: {
            board: game.board,
            players: game.players,
            currentPlayer: game.currentPlayer,
            status: game.status,
            winner: game.winner
        }
    }));
}

function cancelGame(req, res, q) {
    if (req.method != "GET") {
        res.writeHead(400);
        res.end();
        return;
    }

    let gameCode = q["code"];
    if (!gameCode) {
        res.writeHead(400);
        res.end();
        return;
    }

    let game = games.get(gameCode);
    if (!game) {
        res.writeHead(404);
        res.end();
        return;
    }
    
    games.delete(gameCode);
    
    res.writeHead(200, {"Content-Type": "application/json"});
    res.end(JSON.stringify({success: true, message: "משחק בוטל בהצלחה"}));
}

exports.login = login;
exports.createGame = createGame;
exports.joinGame = joinGame;
exports.makeMove = makeMove;
exports.getGame = getGame;
exports.cancelGame = cancelGame;