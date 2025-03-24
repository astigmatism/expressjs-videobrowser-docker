//@ts-check
'use-strict';
const Readline = require('readline');
const Moment = require('moment');
const LogBroadcast = require('./log.broadcast');

module.exports = new (function() {
    let output;

    const prependTime = () => Moment().format('DD MM YYYY hh:mm:ss');

    this.getLastLog = () => output;

    const write = (label, msg) => {
        output = `${prependTime()}: ${label} ==> ${msg}`;
        console.log(output);
        LogBroadcast.broadcastLogToClients(output); // 🔥 Send to WebSocket clients
    };

    this.INFO = (msg) => write('INFO', msg);
    this.CRITICAL = (msg) => write('CRIT', msg);
    this.FILESYSTEM = (msg) => write('FILES', msg);
    this.VIDEO = (msg) => write('VIDEO', msg);
    this.IMAGE = (msg) => write('IMAGE', msg);
    this.THUMB = (msg) => write('THUMB', msg);

    this.HBJS = (msg) => {
        Readline.clearLine(process.stdout, 0); // 0 = clear entire line
        Readline.cursorTo(process.stdout, 0);
        process.stdout.write(msg);
        LogBroadcast.broadcastLogToClients(msg);
    };

    this.HBJS_END = (msg) => {
        console.log(` ${msg}`);
        LogBroadcast.broadcastLogToClients(msg);
    };
})();