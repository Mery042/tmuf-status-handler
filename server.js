const WebSocket = require("ws").Server;
const { createServer } = require("https");

const httpsServer = createServer({
  cert: process.env.SERVER_CERT,
  key: process.env.SERVER_KEY,
});

httpsServer.listen(process.env.PORT || 3000);

const socket = new WebSocket({
    server: httpsServer
});


const clients = new Map();

let gbxremote = require('gbxremote');
//const {server_ip, login, password} = require('./config.json');
const Countdown = require('./countdown.js');

let TMUFserver = gbxremote.createClient(5000, process.env.server_ip);

let playlist = [];
let currentMapIndex = 0;

TMUFserver.on('connect', () => {
	TMUFserver.query('Authenticate', [process.env.login, process.env.password]);
    console.log('Successfully established a connection !');
	TMUFserver.query('EnableCallbacks', [true]);

    TMUFserver.query('GetChallengeList', [42, 0])
    .then(list => {
        playlist = list;
    })
    .catch(error => console.log(error));

    TMUFserver.query('GetCurrentChallengeIndex')
    .then(index => {
        currentMapIndex = index;
    })
    .catch(error => console.log(error));   
	
});


socket.on('connection', (ws) => {
    console.log("The client is connected");
    clients.set(ws);

    TMUFserver.query('GetCurrentChallengeIndex')
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

socket.on('close', (ws) => {
    console.log("The client wants to disconnect");
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
TMUFserver.on('TrackMania.StatusChanged', (params) => {

    let outbound = '';
    // If the server status changed to Running - Play
    if(params[0] === 4){
        //Start countdown
        Countdown.start();
        console.log(params);
        // Get the new index of playlist array
        TMUFserver.query('GetCurrentChallengeIndex')
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