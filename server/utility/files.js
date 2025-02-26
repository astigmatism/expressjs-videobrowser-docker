//@ts-check
'use-strict';
const Config = require('config');
const Fse = require('fs-extra');
const Path = require('path');

module.exports = new (function() {

    const thumbnailOutputRoot = Config.get('thumbnails.path');
    const thumbnailExt = '.' + Config.get('thumbnails.ext');

    this.IsVideoFile = (filePath) => {
        return new RegExp(Config.get('fileTestPatterns.video'), 'i').test(filePath);        
    }

    this.IsImageFile = (filePath) => {
        return new RegExp(Config.get('fileTestPatterns.image'), 'i').test(filePath);
    }

    this.IsDirectory = async (filePath) => {
        const fileStat = await Fse.stat(filePath);
        return fileStat.isDirectory();
    }

    this.GetThumbnail = async (path, fileName) => {
        const thumbnailFile = Path.join(thumbnailOutputRoot, path, fileName + thumbnailExt);
        const contents = await Fse.readFile(thumbnailFile);
        if (contents) return contents.toString('base64');
        return null;
    }

    this.GetThumbnailCoordinates = async (path, fileName) => {
        const coordinatesFile = Path.join(thumbnailOutputRoot, path, fileName + '.json');
        try {
            const contents = await Fse.readJSON(coordinatesFile);
            return contents;
        } catch (e) {
            return null;
        }
    }
});