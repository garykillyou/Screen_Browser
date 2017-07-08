// 變數 ipaddress 值為IP位置
var ipaddress = process.env.OPENSHIFT_NODEJS_IP || "127.0.0.1";

// 變數 port 值為監聽埠
var port = process.env.OPENSHIFT_NODEJS_PORT || 8080;

// 要求node.js給予API支持
var express = require('express');
var app = express();
var http = require('http');

// 開啟伺服器
var server = http.createServer(app);

// 設定伺服器首頁
app.get('/', function (request, response) {
    response.sendFile(__dirname + '/index.html');
});

// 允許使用絕對位置
app.use(express.static(__dirname));

// 聊天室人數變數
usercount = 0;

roomName = [];

// 要求node.js給予API支持並且監聽伺服器
var io = require('socket.io').listen(server);

// io開始處理前端傳來的資訊 單引號內的代號是固定的
io.sockets.on('connection', function (socket) {

    // socket處理前端代號為add user
    socket.on('add user', function (name) {

        // 儲存客戶端名稱
        socket.username = name;
        usercount = usercount + 1;
        var count;
        count = usercount;

        // 紀錄
        console.log('A user connected');

        // 推播代號為add user訊息給所有客戶端
        io.sockets.emit('add user', socket.username, count);
    });

    // socket處理前端代號為chat message
    socket.on('chat message', function (msg) {

        // 紀錄
        console.log('message: ' + msg);
        // 推播代號為chat message訊息給所有客戶端
        io.sockets.emit('chat message', socket.username, msg);
    });

    // socket處裡客戶端離線函式 代號是固定的 就是知道客戶端離線
    socket.on('disconnect', function () {

        usercount = usercount - 1;
        var count;
        count = usercount;

        var i = roomName.indexOf(socket.room);

        if (i != -1 && socket.roomType === "PC") {
            roomName.splice(i, 1);
        }

        if (i != -1 && socket.roomType === "already mobile") {
            io.sockets.to(socket.room).emit('player lose', socket.playerNo);
        }

        socket.leave(socket.room);

        // 紀錄
        console.log('A user disconnected');

        // 推播代號為disconnect訊息給所有客戶端
        io.sockets.emit('disconnected', socket.username, count);

        io.sockets.emit('give key2', roomName.length);
    });

    // 伺服器接受電腦開房間的號碼
    socket.on('give key', function (keyName) {

        socket.room = keyName.toString();
        socket.join(socket.room);
        socket.roomType = "PC";
        roomName.push(socket.room);
        console.log(socket.room);
        io.sockets.to(socket.room).emit('give key', socket.room);
        io.sockets.emit('give key2', roomName.length);

    });

    // 確認手機輸入的房間是否存在
    socket.on('ensure key', function (keyName) {

        var name = keyName.toString();

        if (roomName.lastIndexOf(name) != -1) {
            socket.room = name;
            socket.join(socket.room);
            socket.roomType = "wait mobile";
            io.sockets.to(socket.room).emit('wait to ready', name);
        } else {
            socket.join("WrongKey");
            io.sockets.to("WrongKey").emit("Wrong Key", "你確定KEY正確嗎?");
            socket.leave("WrongKey");
            console.log("NOT A OK KEY");
        }
    });

    // 允許手機加入房間
    socket.on('agree ready', function (usercounts) {

        io.sockets.to(socket.room).emit('ensure ready', "大家都進來吧!", usercounts);
        console.log("Agree Ready");
    });

    // 最後確認已加入的手機
    socket.on('end ready', function (playerNo) {

        socket.roomType = "already mobile";
        socket.playerNo = playerNo;
        console.log("End Ready");
    });

    // 通知手機用戶滿了
    socket.on('full', function () {

        io.sockets.to(socket.room).emit("Tell Full Room");
        console.log("Tell FullRoom");
    });

    // 最後確認通知房間人數已滿
    socket.on("End FullRoom", function () {

        socket.leave(socket.room);
        socket.join("FullRoom");
        socket.leave("FullRoom");
        console.log("End FullRoom");
    });

    socket.on("start game1", function (keyName) {
        socket.room = keyName;
        socket.join(socket.room);
        socket.roomType = "game1 room";
        io.sockets.to(socket.room).emit('change to game1');
    });

    socket.on("phone enter game01", function (keyName, userNo) {
        socket.room = keyName;
        socket.join(socket.room);
        socket.roomType = "phone game1 room";
        socket.playNo = userNo;
    });

    socket.on("phone let game01 run", function () {
        io.sockets.to(socket.room).emit('run run run', socket.playNo);
    });

    socket.on("game01 is over", function (userNo) {
        io.sockets.to(socket.room).emit("take a rest", userNo);
    });

    socket.on("time to play", function (keyName, userNo) {
        socket.room = keyName;
        socket.join(socket.room);
        socket.playNo = userNo;
    });

});

// 伺服器監聽
server.listen(port, ipaddress);