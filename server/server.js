let http = require('http');
let url = require('url');
let api = require('./api');
let fs = require('fs');

let extensions = {
    '.html': 'text/html',
    '.jpeg': 'image/jpeg',
    '.jpg': 'image/jpeg',
    '.css': 'text/css',
    '.js': 'text/javascript',
    '.png': 'image/png'
};

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

pool.getConnection((err, conn) => {
    if (err) {
        console.log("error connecting to database: " + err);
        return;
    }
    console.log("Connected to database successfully");
    
    conn.query("SELECT username,password FROM users", [], (err, result) => {
        if (err) {
            conn.destroy();
            console.log("error executing query: " + err);
            return;
        }
        console.log("Users in database:", result);
        conn.release();
    });
});

http.createServer((req, res) => {
    if (req.method == "OPTIONS") {
        res.writeHead(204);
        res.end();
        return;
    }
    
    let parsedUrl = url.parse(req.url, true);
    let q = parsedUrl.query;
    let path = parsedUrl.pathname;
    
    if (path.startsWith("/api/")) {
        path = path.substring(5);
        if (path == "login") {
            api.login(req, res, q);
        } else if (path == "create-game") {
            api.createGame(req, res, q);
        } else if (path == "join-game") {
            api.joinGame(req, res, q);
        } else if (path == "make-move") {
            api.makeMove(req, res, q);
        } else if (path == "get-game") {
            api.getGame(req, res, q);
        } else if (path == "cancel-game") {
            api.cancelGame(req, res, q);
        } else {
            res.writeHead(400);
            res.end();
        }
    } else {
        if (path == "/") path = "/index.html";
        let indexOfDot = path.indexOf(".");
        if (indexOfDot == -1) {
            res.writeHead(400);
            res.end();
            return;
        }
        let extension = path.substring(path.indexOf("."));
        if (!extensions.hasOwnProperty(extension)) {
            res.writeHead(400);
            res.end();
            return;
        }
        fs.readFile('../client' + path, (err, data) => {
            if (err) {
                res.writeHead(404);
                res.end();
                return;
            }
            res.writeHead(200, { 'Content-Type': extensions[extension] });
            res.end(data);
        });
    }
}).listen(3000, () => {
    console.log("now Sean's server is listening on port 3000...");
});