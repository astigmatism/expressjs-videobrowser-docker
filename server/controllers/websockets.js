const Ws = require('ws');
const Log = require('../utility/log');
const LogBroadcast = require('../utility/log.broadcast');
const Config = require('config');
const MetadataManager = require('./metadata.js')
const DirectoryCache = require('../controllers/directory.cache.js')

module.exports = new (function() {
    const wsServer = new Ws.Server({ noServer: true });
    const mediaOutputRoot = Config.get('folders.outputFolder');

    this.ApplicationStart = (server) => {
        server.on('upgrade', (req, socket, head) => {
            wsServer.handleUpgrade(req, socket, head, (client) => {
                wsServer.emit('connection', client, req);
            });
        });

        wsServer.on('connection', socket => {
            socket.on('message', async message => {
                try {
                    const msg = JSON.parse(message.toString());
                    if (!msg.command || !msg.content) throw new Error("Invalid message structure");
                    Log.INFO(`🌐 WS received: ${msg.command}`);

                    switch (msg.command) {
                        case 'metadata-update':
                            await handleMetadataUpdate(msg.content, socket);
                            break;
                        default:
                            Log.INFO(`🔁 Unhandled command: ${msg.command}`);
                            break;
                    }
                } catch (err) {
                    Log.CRITICAL(`❌ Invalid WS message: ${err.message}`);
                }
            });
        });
    };

    this.ServerToClients = async (command, content) => {
        const data = JSON.stringify({ command, content });
        wsServer.clients.forEach((client) => {
            if (client.readyState === Ws.OPEN) {
                client.send(data);
            }
        });
    };
    
    // ✅ Register log send function
    LogBroadcast.registerSendFunction(this.ServerToClients);

    async function handleMetadataUpdate(content, socket) {
        const updates = Array.isArray(content) ? content : [content];
    
        for (const update of updates) {
            const { type, fullname, homePath, action, target, value } = update;
            const folderPath = require('path').join(mediaOutputRoot, homePath);
    
            try {
                if (action === 'increment') {
                    await MetadataManager.incrementMetric(folderPath, fullname, target);
                    Log.INFO(`🔼 Incremented '${target}' for ${fullname}`);
                } else if (action === 'set') {
                    await MetadataManager.updateItemMetadata(folderPath, fullname, { [target]: value });
                    Log.INFO(`📝 Set '${target}' = ${value} for ${fullname}`);
                } else {
                    throw new Error(`Unsupported action: ${action}`);
                }
    
                const updatedMetadata = MetadataManager.getMetadataForItem(folderPath, fullname);
                if (updatedMetadata) {
                    DirectoryCache.updateCachedItemMetadata(homePath, fullname, updatedMetadata);
                } else {
                    Log.CRITICAL(`⚠️ No updated metadata found for ${fullname} in ${homePath}`);
                }
            } catch (err) {
                Log.CRITICAL(`❌ Failed to update metadata for "${fullname}": ${err.message}`);
                socket.send(JSON.stringify({ status: 'error', error: err.message }));
                return; // Early exit on failure
            }
        }
    
        // ✅ If all succeeded
        socket.send(JSON.stringify({ status: 'ok', command: 'ACK', for: 'METADATA_UPDATE' }));
    }
})();