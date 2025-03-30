const Express = require('express');
const Router = Express.Router();
const AsyncHandler = require('express-async-handler');
const Fse = require('fs-extra');
const Config = require('config');
const Path = require('path');
const Files = require('../utility/files');
const ThumbnailMaker = require('../utility/thumbnail-maker');
const Application = require('../controllers/application');
const Log = require('../utility/log');
const Passport = require('passport');
const DirectoryCache = require('../controllers/directory.cache.js');
const MetadataManager = require('../controllers/metadata.js');

const thumbnailRegEx = new RegExp(`\\.${Config.get('thumbnails.ext')}\\.${Config.get('thumbnails.routeSuffix')}$`);
const fullImageRegEx = new RegExp(`\\.${Config.get('images.routeSuffix')}$`);
const videoRegEx = new RegExp(`\\.${Config.get('video.routeSuffix')}$`);

const isAuthorized = (request, response, next) => {
    if (request.isAuthenticated()) { 
        return next();
    }
    // when not authenticated, return 401 and let client handle it
    response.status(401).json({ message: 'Unauthorized Message' });
}

Router.post('/login', Passport.authenticate('local'), (request, response, next) => {
    if (request.isAuthenticated()) {
        return response.status(200).json({}); // return 200 to indicate success, client will redirect
    }
    next();
});

Router.post('/logout', isAuthorized, AsyncHandler(async (req, res, next) => {
    req.logOut();
    req.session.destroy(function (err) {
        res.status(200).json({});
    })
}));

Router.post('/state', isAuthorized, AsyncHandler(async (req, res, next) => {

    let result = {
        log: Log.getLastLog()
    }

    res.json(result);
}));

Router.post('/processMedia', isAuthorized, AsyncHandler(async (req, res, next) => {
    
    Application.ManualStart();
    res.json();
}));

Router.post('/setThumbnail', isAuthorized, AsyncHandler(async (req, res, next) => {
    try {
        const spriteSheetPath = removeRouteSuffix(req.body.spriteSheetUrl, 'thumbnails');
        const thumbnailPath = removeRouteSuffix(req.body.thumbnailUrl, 'thumbnails');

        const thumbnailFile = await ThumbnailMaker.CropSpriteSheetToThumbnail(
            spriteSheetPath,
            thumbnailPath,
            req.body.coordinates
        );

        const content = await Fse.readFile(thumbnailFile);
        res.json(content.toString('base64'));
    } catch (err) {
        Log.CRITICAL(`❌ set thumbnail failed '${err}'`);
        next(err); // Pass to error middleware
    }
}));

Router.post('/upload', isAuthorized, AsyncHandler(async (req, res, next) => {
    const path = req.body.path || '';
    const uploadType = req.body.uploadType || '';

    if (!req.files || !req.files.file) {
        return res.status(400).json({ message: 'No files uploaded' });
    }

    const files = Array.isArray(req.files.file) ? req.files.file : [req.files.file];

    // ✅ Fire and forget: File uploads now trigger processing with a debounce delay
    Application.FileUploaded(files, path, uploadType)
        .catch(error => Log.CRITICAL(`Error in FileUploaded: ${error.message}`));

    res.json({ message: 'Files uploaded successfully and processing started' });
}));

Router.post('/removeFolderThumbnail', isAuthorized, AsyncHandler(async (req, res, next) => {
    
    const path = req.body.path;
    const result = await Application.removeFolderThumbnail(path);
    res.json({ result });
}));

Router.post('/delete', isAuthorized, AsyncHandler(async (req, res, next) => {
    
    const path = req.body.path;
    const name = req.body.name;
    const isFolder = req.body.isFolder;

    const hasFilesRemaining = await Application.MediaDelete(path, name, isFolder);
    
    if (isFolder) {
        DirectoryCache.invalidateCache(Path.join(path, name));    
    }
    DirectoryCache.invalidateCache(path);

    res.json(hasFilesRemaining); // when false, client will navigate away from current path
}));

Router.post('/newfolder', isAuthorized, AsyncHandler(async (req, res, next) => {
    
    const path = decodeURIComponent(req.body.path);
    const folderName = decodeURIComponent(req.body.name)

    const folderCreated = Application.CreateFolder(path, folderName);

    if (folderCreated) {
        DirectoryCache.invalidateCache(path); // ✅ Invalidate cache for the modified directory
    }

    res.json(folderCreated);
}));

Router.post('/move', isAuthorized, AsyncHandler(async (req, res, next) => {
    const { sourcePath, name, destinationPath, isFolder, operatingPath } = req.body;

    // Logging request details
    Log.INFO(`🚀 Move request received: Moving ${name} (is folder? '${isFolder}') from '${sourcePath}' to '${destinationPath}' at the location ${operatingPath}`);

    try {
        // ✅ Call application controller to handle move logic
        const moveSuccess = await Application.MoveResource(sourcePath, destinationPath, operatingPath, name, isFolder);

        if (moveSuccess) {
            Log.FILESYSTEM(`✅ Successfully moved '${name}' to '${destinationPath}'`);
            DirectoryCache.invalidateCache(operatingPath); // ✅ Invalidate source directory cache
            DirectoryCache.invalidateCache(destinationPath); // ✅ Invalidate destination directory cache
            res.json({ message: `Successfully moved '${name}' to '${destinationPath}'` });
        } else {
            Log.CRITICAL(`❌ Move operation failed for '${name}'`);
            res.status(500).json({ message: `Failed to move '${name}'. Check server logs.` });
        }
    } catch (error) {
        Log.CRITICAL(`🔥 Error moving resource '${name}': ${error.message}`);
        res.status(500).json({ message: `Error moving '${name}'`, error: error.message });
    }
}));

Router.get(fullImageRegEx, isAuthorized, AsyncHandler(async (req, res, next) => {
    const mediaOutputRoot = Config.get('folders.outputFolder');
    const path = removeRouteSuffix(req.path, 'images');
    const imageFile = await Fse.readFile(Path.join(mediaOutputRoot, decodeURIComponent(path)));
	res.send(imageFile);
}));

Router.get(thumbnailRegEx, isAuthorized, AsyncHandler(async (req, res, next) => {

    const thumbnailRoot = Config.get('thumbnails.path');
    const path = removeRouteSuffix(req.path, 'thumbnails');
    const thumb = await Fse.readFile(Path.join(thumbnailRoot, decodeURIComponent(path)));
	res.send(thumb);
}));

Router.get(videoRegEx, isAuthorized, AsyncHandler(async (req, res, next) => {

    // not my work but rather a helpful article here: https://blog.logrocket.com/build-video-streaming-server-node/    
    
    const mediaRoot = Config.get('folders.outputFolder');
    const path = removeRouteSuffix(req.path, 'video');
    const videoPath = Path.join(mediaRoot, decodeURIComponent(path));

    const range = req.headers.range;
    if (!range) {
        return res.status(400).send("Requires Range header");
    }

    const videoSize = Fse.statSync(videoPath).size;
    
    //Safari range header has start and end, vs. Chrome has just start
   let parts = range.split('=')[1];
   let start = Number(parts.split('-')[0]);
    let end = Number(parts.split('-')[1]);

   //For Chrome
   if (!end) {
        const CHUNK_SIZE = 10 ** 6
        end = Math.min(start + CHUNK_SIZE, videoSize - 1)
    }    

    // const CHUNK_SIZE = 10 ** 6;
    // const start = Number(range.replace(/\D/g, ""));
    // const end = Math.min(start + CHUNK_SIZE, videoSize - 1);

    const contentLength = end - start + 1;
    const headers = {
        "Content-Range": `bytes ${start}-${end}/${videoSize}`,
        "Accept-Ranges": "bytes",
        "Content-Length": contentLength,
        "Content-Type": "video/mp4",
    };
    res.writeHead(206, headers);
    const videoStream = Fse.createReadStream(videoPath, { start, end });
    videoStream.pipe(res);
}));

Router.post('/clear-metadata', isAuthorized, AsyncHandler(async (req, res, next) => {
    const mediaRoot = Config.get('folders.outputFolder');

    const deletedMetadataFiles = await MetadataManager.deleteAllMetadataFiles(mediaRoot);
    DirectoryCache.clearAll();

    res.json({
        message: '✅ Metadata and cache cleared.',
        deletedMetadataFiles,
        total: deletedMetadataFiles.length
    });
}));

Router.get('*', AsyncHandler(async (req, res, next) => {
    const path = req.params[0] === '/' ? '' : req.params[0]; // Normalize path
    const sortOption = req.query.sort || null;
    const result = await DirectoryCache.getCachedDirectoryListing(path, sortOption);
    res.json(result);
}));

const removeRouteSuffix = (path, classification) => {
    const regex = new RegExp('\.' + Config.get(classification + '.routeSuffix') + '$');
    return path.replace(regex,'');
}

module.exports = Router;
