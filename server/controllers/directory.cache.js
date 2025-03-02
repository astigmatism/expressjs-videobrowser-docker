const Fse = require('fs-extra');
const Config = require('config');
const Path = require('path');
const Files = require('../utility/files');
const ThumbnailMaker = require('../utility/thumbnail-maker');
const Log = require('../utility/log');

class DirectoryCache {
    constructor() {
        this.cache = new Map();
    }

    /**
     * Retrieves a directory listing from cache or generates a fresh one.
     * @param {string} path The directory path.
     */
    async getCachedDirectoryListing(path) {

        path = path === '' ? '/' : path;

        if (this.cache.has(path)) {
            Log.INFO(`🗂️ Serving cached directory listing for: ${path}`);
            return this.cache.get(path);
        }

        Log.INFO(`📂 Generating fresh directory listing for: ${path}`);
        const listing = await this.generateDirectoryListing(path);
        this.cache.set(path, listing);
        return listing;
    }

    /**
     * Invalidates cache for a specific path.
     * Should be called when a directory is modified (new file, move, delete).
     * @param {string} path The directory path to invalidate.
     */
    invalidateCache(path) {
        path = path === '' ? '/' : path;
        if (this.cache.has(path)) {
            Log.INFO(`🗑️ Invalidating cache for: ${path}`);
            this.cache.delete(path);
        }
    }

    /**
     * Generates a fresh directory listing with metadata.
     * @param {string} path The directory path.
     */
    async generateDirectoryListing(path) {

        const mediaRoot = Config.get('folders.outputFolder');
        const thumbnailRoot = Config.get('thumbnails.path');
        const thumbnailExt = Config.get('thumbnails.ext');
        const thumbnailRouteSuffix = Config.get('thumbnails.routeSuffix');
        const videoRouteSuffix = Config.get('video.routeSuffix');
        const imageRouteSuffix = Config.get('images.routeSuffix');


        const contents = await Fse.readdir(Path.join(mediaRoot, path));

        let result = {
            path: path,
            folders: [],
            images: [],
            videos: []
        };


        for await (const item of contents) {
            const logicalPath = Path.join(path, item);
            const filePath = Path.join(mediaRoot, logicalPath);
            const fileParsed = Path.parse(filePath);
            const isDirectory = await Files.IsDirectory(filePath);



            if (isDirectory) {
                result.folders.push({
                    fullname: fileParsed.base,
                    name: item,
                    path: filePath,
                    logicalPath: logicalPath
                });
            }
            else {

                const thumbnailPath = Path.join(path, `${item}.${thumbnailExt}`);
                const thumbnailUrl = Path.join(path, `${item}.${thumbnailExt}.${thumbnailRouteSuffix}`);
                const imageUrl = Path.join(path, `${item}.${imageRouteSuffix}`);
                const spriteSheetUrl = Path.join(path, `${item}.sheet.${thumbnailExt}.${thumbnailRouteSuffix}`);
                const thumbnailSize = await ThumbnailMaker.GetImageSize(Path.join(thumbnailRoot, thumbnailPath));
                
                if (Files.IsImageFile(filePath)) {
                    result.images.push({
                        name: fileParsed.name,
                        fullname: fileParsed.base,
                        url: imageUrl,
                        path: filePath,
                        logicalPath: logicalPath,
                        thumbnail: {
                            url: thumbnailUrl,
                            width: thumbnailSize ? thumbnailSize.width : 0,
                            height: thumbnailSize ? thumbnailSize.height : 0
                        }
                    });
                }
                if (Files.IsVideoFile(filePath)) {

                    const videoUrl = Path.join(path, `${item}.${videoRouteSuffix}`)
                    const coordinates = await Files.GetThumbnailCoordinates(path, item);
                    const probe = await ThumbnailMaker.ProbeStream(filePath);

                    result.videos.push({
                        name: item,
                        fullname: fileParsed.base,
                        url: videoUrl,
                        probe: probe,
                        path: filePath,
                        logicalPath: logicalPath,
                        thumbnail: {
                            url: thumbnailUrl,
                            width: thumbnailSize ? thumbnailSize.width : 0,
                            height: thumbnailSize ? thumbnailSize.height : 0
                        },
                        spriteSheet: {
                            width: coordinates ? coordinates[0].width : 0,
                            height: coordinates ? coordinates[0].height : 0,
                            url: spriteSheetUrl,
                            coordinates: coordinates
                        },
                    });
                }
            }
        }

        return result;
    }
}

// Export a single instance of DirectoryCache to maintain global cache state
module.exports = new DirectoryCache();