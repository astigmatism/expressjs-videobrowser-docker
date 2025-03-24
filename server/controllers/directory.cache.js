const Fse = require('fs-extra');
const Config = require('config');
const Path = require('path');
const Files = require('../utility/files');
const ThumbnailMaker = require('../utility/thumbnail-maker');
const Log = require('../utility/log');
const MetadataManager = require('../controllers/metadata');
const metadata = require('../controllers/metadata');

class DirectoryCache {
    constructor() {
        this.cache = new Map();
    }

    clearAll() {
        this.cache.clear();
        Log.INFO('🧹 Directory cache fully cleared');
    }

    /**
     * Retrieves a directory listing from cache or generates a fresh one.
     * @param {string} path The directory path.
     */
    async getCachedDirectoryListing(path, sortOption = null) {
        path = path === '' ? '/' : path;
    
        const cached = this.cache.get(path);
    
        // If cache exists and sortOption matches (or no sort was provided), return it
        if (cached && (!sortOption || cached.sortOption === sortOption)) {
            Log.INFO(`🗂️ Serving cached directory listing for: ${path} with sort: ${cached.sortOption}`);
            return cached.listing;
        }
    
        // Sort changed or no cache yet: regenerate listing
        Log.INFO(`📂 Generating fresh directory listing for: ${path}${sortOption ? ` with sort: ${sortOption}` : ''}`);
        const listing = await this.generateDirectoryListing(path, sortOption);
    
        // Persist to cache (with current sort)
        this.cache.set(path, { listing, sortOption });
    
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
        } else {
            // Log.CRITICAL(`🗑️ Could not invalidate cache for: ${path}. It doesn't exist but should have?`);
        }
    }

    /**
     * Generates a fresh directory listing with metadata.
     * @param {string} path The directory path.
     */
    async generateDirectoryListing(path, sortOption = null) {

        const mediaRoot = Config.get('folders.outputFolder');
        const thumbnailRoot = Config.get('thumbnails.path');
        const thumbnailExt = Config.get('thumbnails.ext');
        const thumbnailRouteSuffix = Config.get('thumbnails.routeSuffix');
        const videoRouteSuffix = Config.get('video.routeSuffix');
        const imageRouteSuffix = Config.get('images.routeSuffix');


        const contents = await Fse.readdir(Path.join(mediaRoot, path));

        let result = {
            path,
            sortOption,
            folders: [],
            images: [],
            videos: []
        };

        const folderMetadata = await MetadataManager.initializeMetadataForDirectory(Path.join(mediaRoot, path), contents, sortOption);


        for await (const item of contents) {
            const logicalPath = Path.join(path, item);
            const filePath = Path.join(mediaRoot, logicalPath);
            const fileParsed = Path.parse(filePath);
            const isDirectory = await Files.IsDirectory(filePath);
            const itemMetadata = folderMetadata[item] || null;


            if (isDirectory) {
                result.folders.push({
                    fullname: fileParsed.base,
                    name: item,
                    path: filePath,
                    logicalPath: logicalPath,
                    homePath: path,
                    metadata: itemMetadata
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
                        homePath: path,
                        thumbnail: {
                            url: thumbnailUrl,
                            width: thumbnailSize ? thumbnailSize.width : 0,
                            height: thumbnailSize ? thumbnailSize.height : 0
                        },
                        metadata: itemMetadata
                    });
                }
                if (Files.IsVideoFile(filePath)) {
                    const videoUrl = Path.join(path, `${item}.${videoRouteSuffix}`);
                    const coordinates = await Files.GetThumbnailCoordinates(path, item);

                    let probe = itemMetadata?.probe;

                    if (this._needsProbe(probe)) {
                        try {
                            Log.INFO(`⚠️ Need to probe video ${filePath}. Please wait`)
                            const fetchedProbe = await ThumbnailMaker.ProbeStream(filePath);
                            probe = fetchedProbe;
    
                            if (itemMetadata) {
                                itemMetadata.probe = fetchedProbe;
                                await MetadataManager.updateItemMetadata(
                                    Path.join(mediaRoot, path),
                                    item,
                                    { probe: fetchedProbe }
                                );
                            }
                        } catch (err) {
                            Log.INFO(`⚠️ Failed to probe video ${filePath}: ${err.message}`);
                            probe = {
                                width: 0,
                                height: 0,
                                duration: 0,
                                display_aspect_ratio: ''
                            };
                        }
                    }
    
                    result.videos.push({
                        name: item,
                        fullname: fileParsed.base,
                        url: videoUrl,
                        path: filePath,
                        homePath: path,
                        logicalPath,
                        thumbnail: {
                            url: thumbnailUrl,
                            width: thumbnailSize?.width || 0,
                            height: thumbnailSize?.height || 0
                        },
                        spriteSheet: {
                            width: coordinates?.[0]?.width || 0,
                            height: coordinates?.[0]?.height || 0,
                            url: spriteSheetUrl,
                            coordinates
                        },
                        metadata: itemMetadata
                    });
                }
            }
        }

        if (sortOption != null) {
            result.folders = this._sortBy(result.folders, sortOption);
            result.images = this._sortBy(result.images, sortOption);
            result.videos = this._sortBy(result.videos, sortOption);
        }
        
        return result;
    }

    _needsProbe(probe) {
        if (!probe) {
            console.log('📍 Probe is missing entirely');
            return true;
        }
    
        if (typeof probe.width !== 'number') {
            console.log('📍 Probe is missing or has invalid width');
            return true;
        }
    
        if (typeof probe.height !== 'number') {
            console.log('📍 Probe is missing or has invalid height');
            return true;
        }
    
        if (typeof probe.duration !== 'string') {
            console.log('📍 Probe is missing or has invalid duration');
            return true;
        }
    
        if (typeof probe.display_aspect_ratio !== 'string') {
            console.log('📍 Probe is missing or has invalid display_aspect_ratio');
            return true;
        }
    
        return false;
    }

    _sortBy(items, sortOption) {
        const [key, direction] = sortOption.split('-'); // e.g., 'views-desc'
    
        return items.sort((a, b) => {
            const aMeta = a.metadata || {};
            const bMeta = b.metadata || {};
    
            let aVal, bVal;
    
            switch (key) {
                case 'views':
                case 'spice!':
                    aVal = aMeta[key] ?? 0;
                    bVal = bMeta[key] ?? 0;
                    break;
                case 'createdAt':
                case 'lastViewed':
                    aVal = new Date(aMeta[key] || 0).getTime();
                    bVal = new Date(bMeta[key] || 0).getTime();
                    break;
                case 'name':
                default:
                    aVal = a.name.toLowerCase();
                    bVal = b.name.toLowerCase();
                    break;
            }
    
            if (aVal < bVal) return direction === 'desc' ? 1 : -1;
            if (aVal > bVal) return direction === 'desc' ? -1 : 1;
            return 0;
        });
    }

    updateCachedItemMetadata(dirPath, fullname, updates) {
        dirPath = dirPath === '' ? '/' : dirPath;

        const cached = this.cache.get(dirPath);
        if (!cached) return;

        const { listing } = cached;
        const allItems = [...listing.folders, ...listing.images, ...listing.videos];

        const target = allItems.find(item => item.fullname === fullname);
        if (!target || !target.metadata) return;

        Object.assign(target.metadata, updates);
        Log.INFO(`⚡ Updated in-memory metadata for "${fullname}" in "${dirPath}"`);
    }

    refreshDirectoryCache(path) {
        path = path === '' ? '/' : path;
        if (this.cache.has(path)) {
            this.cache.delete(path);
            Log.INFO(`♻️ Refreshing directory cache for: ${path}`);
        }
    }
}

// Export a single instance of DirectoryCache to maintain global cache state
module.exports = new DirectoryCache();