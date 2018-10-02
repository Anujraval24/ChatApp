// Requiring Modules
var express = require('express');
var app = express();
var server = require('http').createServer(app);
var io = require('socket.io').listen(server);
var moment = require('moment');
const emojify = require('node-emojify');
const emoji = emojify('node is :fire:');
const urlMetadata = require('url-metadata');
const getUrls = require('get-urls-to-array');

console.log(emoji);

users = [];
connections = [];

server.listen(process.env.PORT || 4000);
server.listen(function () {
    console.info('Server listening on port ' + this.address().port);
});

app.use(express.static(__dirname));

app.get('/', function (req, res) {
    res.sendFile(__dirname + '/index.html');
});

///users api
app.get('/users', function (req, res) {
    res.send(users);
});

app.post('/get_meta',function(req,res){
    oembed(req.body.data, function(error, result) {
        if (error)
            res.json({"error" : true,"link" :req.body.data});
        else
            res.json(result);
    });
});



// //Connection with socket 
io.sockets.on('connection', function (socket) {
    connections.push(socket);
    console.log('Connected: %s sockets Connected', connections.length);

    //Disconnection with socket
    socket.on('disconnnection', function (socket) {
       
        users.splice(users.indexOf(socket.users), 1);
        updateUsernames();
        connections.splice(connections.indexOf(socket), 1);
    });

    //Send Message 
    socket.on('send message', function (data) {
        let urls = getUrls(data);

        //console.log(urls);

        io.sockets.emit('new message', {
            msg: data,
            type: "text",
            user: socket.username,
            time: moment().format('lll')
        });

        if(urls.length > 0 ){
            urls.map(function(url){
            urlMetadata(url).then(
                function (metadata) { // success handler
                    io.sockets.emit('new message', {
                        msg: metadata,
                        type: "link",
                        user: socket.username,
                        time: moment().format('lll')
                    });
                },
                function (error) { // failure handler
                    console.log(error)
                });
            });
        }

    });
    //typing event 
    socket.on('typing', function (data) {
        io.sockets.emit('typing', {
            message: data.message,
            user: data.user
        });
    });

    //New Users
    socket.on('new user', function (message, callback) {
        callback(true);
        socket.username = message;
        users.push(socket.username);
        updateUsernames();

    });
    //updataing usernames
    function updateUsernames() {
        io.sockets.emit('get users', users);
    }

    // console.log('Login Time: ', moment().format('lll'));
});
