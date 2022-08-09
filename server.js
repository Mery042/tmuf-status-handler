const WebSocket = require('ws');
const wsserver = new WebSocket.Server({ port: 7071 });
const clients = new Map();

let gbxremote = require('gbxremote');
//const {server_ip, login, password} = require('./config.json');
const Countdown = require('./countdown.js');

let server = gbxremote.createClient(5000, process.env.server_ip);

let playlist = [];
let currentMapIndex = 0;

server.on('connect', () => {
	server.query('Authenticate', [process.env.login, process.env.password]);
    console.log('Successfully established a connection !');
	server.query('EnableCallbacks', [true]);

    server.query('GetChallengeList', [42, 0])
    .then(list => {
        playlist = list;
    })
    .catch(error => console.log(error));

    server.query('GetCurrentChallengeIndex')
    .then(index => {
        currentMapIndex = index;
    })
    .catch(error => console.log(error));   
	
});


wsserver.on('connection', (ws) => {
    clients.set(ws);

    server.query('GetCurrentChallengeIndex')
    .then(index => {
        currentMapIndex = index;
        let timeLeft  = Countdown.getTotal();
        outbound = JSON.stringify({
            "type": "init",
            "playlist": playlist,
            "index": currentMapIndex,
            "timeLeft": timeLeft
        });
        ws.send(outbound);
    })
    .catch(error => console.log(error));
});

wsserver.on('close', (ws) => {
    ws.close();
      
    process.nextTick(() => {
          if ([ws.OPEN, ws.CLOSING].includes(ws.readyState)) {
            // Socket still hangs, hard close
            ws.terminate();
          }
    });

    clients.delete(ws);
});

// If the server status changed
server.on('TrackMania.StatusChanged', (params) => {

    let outbound = '';
    // If the server status changed to Running - Play
    if(params[0] === 4){
        //Start countdown
        Countdown.start();
        console.log(params);
        // Get the new index of playlist array
        server.query('GetCurrentChallengeIndex')
        .then(index => {
            currentMapIndex = index;
            // Build the message
            outbound = JSON.stringify({
                "type": "start",
                "index": currentMapIndex
            });
            // Send the message to all clients
            [...clients.keys()].forEach((client) => {
                client.send(outbound);
            });
        })
        .catch(error => console.log(error));
    }
    // If the server status changed to Running - Finish
    else if(params[0] === 5){
        //Stop countdown
        Countdown.stop();
        console.log(params);
        // Build the message
        outbound = JSON.stringify({
            "type": "stop"
        });
        // Send the message to all clients
        [...clients.keys()].forEach((client) => {
            client.send(outbound);
        });
    }

});