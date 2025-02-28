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

const thumbnailRegEx = new RegExp('.*\.(' + Config.get('thumbnails.routeSuffix') + ')$');
const fullImageRegEx = new RegExp('.*\.(' + Config.get('images.routeSuffix') + ')$');
const videoRegEx = new RegExp('.*\.(' + Config.get('video.routeSuffix') + ')$');

const isAuthorized = (request, response, next) => {
    if (request.isAuthenticated()) { 
        return next();
    }
    // when not authenticated, return 401 and let client handle it
    response.status(401).json({ message: 'Unauthorized Message' });
}

Router.get('/test', (req, res) => {
    console.log('Received request at /test');
    return res.json({ message: "Test route is working!", timestamp: new Date().toISOString() });
});

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
    
    const spriteSheetPath = removeRouteSuffix(req.body.spriteSheetUrl, 'thumbnails');
    const thumbnailPath = removeRouteSuffix(req.body.thumbnailUrl, 'thumbnails');
    const thumbnailFile = await ThumbnailMaker.CropSpriteSheetToThumbnail(spriteSheetPath, thumbnailPath, req.body.coordinates);
    const content = await Fse.readFile(thumbnailFile);
    res.json(content.toString('base64'));
}));

Router.post('/upload', isAuthorized, AsyncHandler(async (req, res, next) => {
    const path = req.body.path || '';

    if (!req.files || !req.files.file) {
        return res.status(400).json({ message: 'No files uploaded' });
    }

    const files = Array.isArray(req.files.file) ? req.files.file : [req.files.file];

    // ✅ Fire and forget: File uploads now trigger processing with a debounce delay
    Application.FileUploaded(files, path)
        .catch(error => Log.CRITICAL(`Error in FileUploaded: ${error.message}`));

    res.json({ message: 'Files uploaded successfully and processing started' });
}));

Router.post('/delete', isAuthorized, AsyncHandler(async (req, res, next) => {
    
    const path = req.body.path;
    const name = req.body.name;
    const isFolder = req.body.isFolder;

    const hasFilesRemaining = await Application.MediaDelete(path, name, isFolder);
    res.json(hasFilesRemaining); // when false, client will navigate away from current path
}));

Router.post('/newfolder', isAuthorized, AsyncHandler(async (req, res, next) => {
    
    const path = req.body.path;
    const folderName = req.body.name;

    const folderCreated = Application.CreateFolder(path, folderName);

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

Router.get('*', isAuthorized, AsyncHandler(async (req, res, next) => {
    
    const mediaRoot = Config.get('folders.outputFolder');
    const thumbnailRoot = Config.get('thumbnails.path');
    const thumbnailExt = Config.get('thumbnails.ext');
    const thumbnailRouteSuffix = Config.get('thumbnails.routeSuffix');
    const videoRouteSuffix = Config.get('video.routeSuffix');
    const imageRouteSuffix = Config.get('images.routeSuffix');
    const path = req.params[0] == '/' ? '' : req.params[0]; //strip out the empty /


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

    res.json(result);
}));

const removeRouteSuffix = (path, classification) => {
    const regex = new RegExp('\.' + Config.get(classification + '.routeSuffix') + '$');
    return path.replace(regex,'');
}

module.exports = Router;
