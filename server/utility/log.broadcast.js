let sendFn = null;

module.exports = {
    registerSendFunction(fn) {
        sendFn = fn;
    },
    broadcastLogToClients(message) {
        if (typeof sendFn === 'function') {
            sendFn('log', message);
        }
    }
};