//@ts-check
'use-strict';
const Readline = require('readline');
const WebSocketService = require('../controllers/websockets');
const Moment = require('moment');

module.exports = new (function() {

    let output;

    this.getLastLog = () => {
        return output;
    }

    const prependTime = () => {
        return Moment().format('DD MM YYYY hh:mm:ss');
    }

    this.INFO = (message) => {
        output = prependTime() + ': INFO  ==> ' + message;
        console.log(output);
        WebSocketService.ServerToClients('log', output);
    };

    this.CRITICAL = (message) => {
        output = prependTime() + ': CRIT  ==> ' + message;
        console.log(output);
        WebSocketService.ServerToClients('log', output);
    };

    this.REDIS = (message) => {
        console.log('REDIS ==> ' + message);
    };

    this.CACHE = (message) => {
        console.log('CACHE ==> ' + message);
    };

    this.FILESYSTEM = (message) => {
        output = prependTime() + ': FILES ==> ' + message;
        console.log(output);
        WebSocketService.ServerToClients('log', output);
    };

    this.VIDEO = (message) => {
        output = prependTime() + ': VIDEO ==> ' + message;
        console.log(output);
        WebSocketService.ServerToClients('log', output);
    };

    this.IMAGE = (message) => {
        output = prependTime() + ': IMAGE ==> ' + message;
        console.log(output);
        WebSocketService.ServerToClients('log', output);
    };

    this.THUMB = (message) => {
        output = prependTime() + ': THUMB ==> ' + message;
        console.log(output);
        WebSocketService.ServerToClients('log', output);
    };

    this.HBJS = (message) => {
        // this log type rewrites the final line. no colors sadly
        // @ts-ignore
        Readline.clearLine(process.stdout);
        Readline.cursorTo(process.stdout, 0);
        process.stdout.write(message);
        WebSocketService.ServerToClients('log', message);
    }

    this.HBJS_END = (message) => {
        console.log(` ${message}`);
        WebSocketService.ServerToClients('log', message);
    }
});