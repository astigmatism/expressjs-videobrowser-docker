//@ts-check
'use-strict';
const Log = require('../utility/log');
const RedisClient = require('../utility/redis-client');
const NodeCache = require( 'node-cache');

const ApplicationCache = new NodeCache();

//redis set already supports async/await. For get, I need to use the util
//const Util = require('util');
//const RedisGet = Util.promisify(RedisClient.get).bind(RedisClient);

/**
 *  Your data storage model with cache:
 * 
 *      lowest      MongoDB: docs (not used in this application. see pure-triple-triad ;)
 *      fast        Redis: caches mongo primarily, cache available to all processes
 *      fastest     Node-Cache: interal application cache available only to the process, no expiration
 */

module.exports = new (function() {

    //NODE-CACHE
    this.SetInternal = async (family, name, value) => {
        var result = await ApplicationCache.set(family + '_' + name, value);
        Log.CACHE('set: ' + family + ' -> ' + name);
    };

    this.GetInternal = async (family, name) => {
        var result = await ApplicationCache.get(family + '_' + name);
        Log.CACHE('get: ' + family + ' -> ' + name + ' (' + (result ? '*' : 'x') + ')'); //log hit or miss
        return result;
    };

    //REDIS

    this.Connect = async () => {
        await RedisClient.connect();
    }

    this.SetJsonSync = async (family, name, value) => {
        await RedisClient.set(family + '_' + name, JSON.stringify(value));
        Log.REDIS('set: ' + family + ' -> ' + name);
    };

    this.SetJson = (family, name, value) => {
        RedisClient.set(family + '_' + name, JSON.stringify(value));
        Log.REDIS('set: ' + family + ' -> ' + name);
    }

    this.SetJsonWithExpireSync = async (family, name, value, ttlInSeconds) => {
        await RedisClient.set(family + '_' + name, JSON.stringify(value), {
            'EX': ttlInSeconds
        });
        Log.REDIS('set: ' + family + ' -> ' + name + ' (expires in ' + ttlInSeconds /60 + ' min)');
    };

    this.SetJsonWithExpire = (family, name, value, ttlInSeconds) => {
        RedisClient.set(family + '_' + name, JSON.stringify(value), {
            'EX': ttlInSeconds
        });
        Log.REDIS('set: ' + family + ' -> ' + name + ' (expires in ' + ttlInSeconds /60 + ' min)');
    };
    
    this.GetJson = async (family, name) => {
        var result = await RedisClient.get(family + '_' + name);
        Log.REDIS('get: ' + family + ' -> ' + name + ' (' + (result ? '*' : 'x') + ')'); //log hit or miss
        return JSON.parse(result);
    };

    this.Remove = async (family, name) => {
        await RedisClient.del(family + '_' + name);
        Log.REDIS('del: ' + family + ' -> ' + name);
    };

    this.FlushDB = async () => {
        await RedisClient.flushAll();
        Log.REDIS('redis database flushed');
    };
});