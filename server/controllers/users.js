//@ts-check
'use-strict';
const Config = require('config');
const Log = require('../utility/log');
const Cache = require('./cache');
const AsyncHandler = require('express-async-handler');
const _ = require('lodash');

module.exports = new (function() {

    //attach the user model with this middleware
    this.Middleware = AsyncHandler(async (req, res, next) => {

        const sessionId = req.sessionID;

        //first attempt from cache
        var user = await Cache.GetJson('user', sessionId);
        if (user) {
            req.user = user;
            return next();
        }

        //finally, create this user if not in cache or mongo
        await this.Create(sessionId);
        next();
    });


    this.Create = async (sessionId) => {

        await Cache.SetJson('users', 'sessionId', sessionId);

        Log.INFO('New User Created! ' + sessionId);
    };

    //a session is not a visit, but a client that has been active within 30 days
    this.OnSessionPrune = function() {
        
    };
});