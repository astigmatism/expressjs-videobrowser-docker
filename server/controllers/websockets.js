//@ts-check
'use-strict';
const Config = require('config');
const Ws = require('ws');
const Log = require('../utility/log');

module.exports = new (function() {

    const wsServer = new Ws.Server({ noServer: true });

    this.ApplicationStart = (server) => {

        server.on('upgrade', (request, socket, head) => {
            wsServer.handleUpgrade(request, socket, head, socket => {
                wsServer.emit('connection', socket, request);
            });
        });

        wsServer.on('connection', socket => {
            socket.on('message', message => {
                try {
                    const messageString = message.toString();
                    const messageJson = JSON.parse(messageString);
                    Log.INFO(`Websocket incoming message: ${messageJson}`);
                } catch (e) {
                    Log.CRITICAL(`Incoming socket message was not in the expected format`);
                }
            });
        });
    }

    this.ServerToClients = async (command, content) => {

        let data = JSON.stringify({
            command: command,
            content: content
        });
        wsServer.clients.forEach((client) => {
            if (client.readyState === Ws.OPEN) {
                client.send(data, { binary: false });
            }
        });
    }
});
