//@ts-check
'use-strict';
const Config = require('config');
const Watch = require('watch');
const Log = require('../utility/log');
const Fse = require('fs-extra');
const Path = require('path');
const Files = require('../utility/files');
const VideoConversion = require('../utility/video-conversion');
const ThumbnailMaker = require('../utility/thumbnail-maker');
const WebSocketService = require('./websockets');
const Extract = require('extract-zip');

module.exports = new (function() {

    const mediaInputRoot = Config.get('folders.inputFolder');
    const mediaOutputRoot = Config.get('folders.outputFolder');
    const thumbnailsRoot = Config.get('thumbnails.path');
    const workingFolder = Config.get('folders.workingFolder');
    const deleteFileWhenDone = Config.get('deleteSourceFilesAfterProcessing');

    let conversionProcessInProgress = false;
    let conversionProcessQueued = false;

    // public methods

    this.ApplicationStart = async function(callback) {

        //connect to redis
        // await Cache.Connect();

        //flush redis cache on start
        // await Cache.FlushDB();

        //clear working folder
        await Fse.emptyDir(workingFolder)

        try {
            
            await EnsureWorkingFoldersExist();
            
            // for testing only, the file upload process kicks off conversion
            /*
            Watch.watchTree(mediaInputRoot, {

                ignoreDotFiles: true,
                interval: 10
    
            }, async (f, cur, prev) => {
                
                Log.INFO(`Changes detected in media input folder \"${mediaInputRoot}\"`)
                await MediaInputFolderChangeDetected();
            });
            */
            
        }
        catch(err) {
            return Log.CRITICAL('Controllers.Application.ApplicationStart, Error in file system watch: ' + err);
        }
    };

    this.ManualStart = async () => {
        await MediaInputFolderChangeDetected();
    };

    // private methods

    const MediaInputFolderChangeDetected = async () => {
        if (conversionProcessInProgress) {
            conversionProcessQueued = true;
            Log.INFO(`Processing is already active. This request is queued.`);
            return;
        }
    
        conversionProcessInProgress = true;
    
        // Ensure files are fully written before processing
        await WaitForFilesToFinishWriting(mediaInputRoot);
        
        await ProcessFolder('');
        conversionProcessInProgress = false;
    
        // If changes detected during conversion, process them now
        if (conversionProcessQueued) {
            conversionProcessQueued = false;
            await MediaInputFolderChangeDetected();
        }
    };

    const WaitForFilesToFinishWriting = async (directory) => {
        const checkInterval = 1000; // Check every second
        const stableTime = 5000; // File must be stable for 5 seconds before proceeding
    
        let pendingFiles = new Map();
    
        while (true) {
            const files = await Fse.readdir(directory);
    
            for (const file of files) {
                const filePath = Path.join(directory, file);
                const stats = await Fse.stat(filePath).catch(() => null);
                
                if (!stats || stats.isDirectory()) continue; // Skip directories
                
                const lastSize = pendingFiles.get(filePath);
    
                if (lastSize !== undefined && lastSize === stats.size) {
                    if (Date.now() - pendingFiles.get(`${filePath}_timestamp`) > stableTime) {
                        pendingFiles.delete(filePath);
                        pendingFiles.delete(`${filePath}_timestamp`);
                    }
                } else {
                    pendingFiles.set(filePath, stats.size);
                    pendingFiles.set(`${filePath}_timestamp`, Date.now());
                }
            }
    
            if (pendingFiles.size === 0) break; // All files are stable
    
            await new Promise(resolve => setTimeout(resolve, checkInterval)); // Wait before checking again
        }
    
        Log.INFO(`All detected files have finished writing.`);
    };

    const ProcessFolder = async (currentFolder) => {

        Log.FILESYSTEM(`Processing the location "${currentFolder}"`);

        const folderContents = await Fse.readdir(Path.join(mediaInputRoot, currentFolder));

        for await (const item of folderContents) {
            
            // obtain details about this file or folder
            const itemPath = Path.join(mediaInputRoot, currentFolder, item);
            const isDirectory = await Files.IsDirectory(itemPath);

            // if a directory, process that location
            if (isDirectory) {
                await ProcessFolder(Path.join(currentFolder, item));
            }
            else {

                const parsedFile = Path.parse(itemPath);

                await Fse.ensureDir(Path.join(mediaOutputRoot, currentFolder));
                await Fse.ensureDir(Path.join(thumbnailsRoot, currentFolder));
                
                // is video file
                if (Files.IsVideoFile(itemPath)) {
                    const outputPath = await VideoConversion.ProcessFile(itemPath, currentFolder, parsedFile);
                    if (deleteFileWhenDone) await Fse.remove(itemPath);
                    await ThumbnailMaker.ProcessVideoFile(outputPath, currentFolder);
                    continue;
                }

                // is image file (just copy it straight over)
                if (Files.IsImageFile(itemPath)) {
                    Log.IMAGE(`Copying image file to output folder "${itemPath}"`);
                    await Fse.copyFile(itemPath, Path.join(mediaOutputRoot, currentFolder, parsedFile.base));
                    await ThumbnailMaker.ProcessImageFile(itemPath, currentFolder);
                    if (deleteFileWhenDone) await Fse.remove(itemPath);
                    continue;
                }
                Log.FILESYSTEM(`Not a video or image file "${itemPath}"`);
                if (deleteFileWhenDone) await Fse.remove(itemPath);
            }
        }
        Log.FILESYSTEM(`Finished processing all files and folders at the location "${currentFolder}"`)
    };

    const EnsureWorkingFoldersExist = async () => {

        const mediaInputFolder = await Fse.pathExists(mediaInputRoot);
        if (!mediaInputFolder) {
            throw new Error(`The folder "${mediaInputRoot}" does not seem to be present. Either create it or a symbolic link`);
        }
        await Fse.ensureDir(mediaOutputRoot);
        await Fse.ensureDir(thumbnailsRoot);
    }

    this.FileUploaded = async (files, path) => {
        const destinationFolder = Path.join(mediaInputRoot, path);
        await Fse.ensureDir(destinationFolder);
    
        for (const file of files) {
            const destinationFile = Path.join(destinationFolder, file.name);
            const parsedFile = Path.parse(destinationFile);
    
            Log.FILESYSTEM(`Writing file to input folder: ${destinationFile}`);
            await Fse.writeFile(destinationFile, file.data);
    
            if (parsedFile.ext === '.zip') {
                const zipExtractionFolder = Path.join(destinationFolder, parsedFile.name);
                const absoluteZipExtractionFolder = Path.resolve(zipExtractionFolder);
                await Fse.ensureDir(zipExtractionFolder);
    
                Log.FILESYSTEM(`New file is zip, extracting to: ${zipExtractionFolder}`);
                try {
                    await Extract(destinationFile, { dir: absoluteZipExtractionFolder });
                } catch (e) {
                    debugger
                }
            }
        }
    
        // ✅ Trigger processing after all files are uploaded
        Log.INFO(`All files uploaded. Starting processing.`);
        await MediaInputFolderChangeDetected();
    };

    this.CreateFolder = async(path, folderName) => {

        const inputFolder = Path.join(mediaInputRoot, path);
        const outputFolder = Path.join(mediaOutputRoot, path);
        const thumbnailFolder = Path.join(thumbnailsRoot, path);

        const newInputFolder = Path.join(inputFolder, folderName);
        const newOutputFolder = Path.join(outputFolder, folderName);
        const newThumbnailFolder = Path.join(thumbnailFolder, folderName);
        
        if (await Fse.pathExists(inputFolder) && await Fse.pathExists(outputFolder) && await Fse.pathExists(thumbnailFolder)) {
            await Fse.ensureDir(newInputFolder);
            await Fse.ensureDir(newOutputFolder);
            await Fse.ensureDir(newThumbnailFolder);
            Log.FILESYSTEM(`New Folder created in "${path}" called "${folderName}"`);
            return true;
        }
        return false;
    };

    this.MediaDelete = async (path, name, isFolder) => {

        // turns our, fs-extra works when the name is a folder or a file :P

        if (conversionProcessInProgress) {
            Log.FILESYSTEM(`Can't delete media while conversion process active. Try again later`);
            return true;
        }

        const outputFolder = Path.join(mediaOutputRoot, path);
        const inputFolder = Path.join(mediaInputRoot, path);
        const thumbnailFolder = Path.join(thumbnailsRoot, path);
        
        const inputFile = Path.join(inputFolder, name);
        const outputFile = Path.join(outputFolder, name);
        const thumbnailsFolder = Path.join(thumbnailFolder, name);  //this case only makes sense when deleting a folder
        const parsedFile = Path.parse(outputFile);

        const thumbnailFile = Path.join(thumbnailFolder, name + '.' + Config.get('thumbnails.ext'));
        const thumbnailManifest = Path.join(thumbnailFolder, name + '.json');
        const thumbnailSheet = Path.join(thumbnailFolder, name + '.sheet.' + Config.get('thumbnails.ext'))

        if (await Fse.pathExists(inputFile)) {
            await Fse.remove(inputFile);
            Log.FILESYSTEM(`File deleted: ${inputFile}`);
        }

        if (await Fse.pathExists(outputFile)) {
            await Fse.remove(outputFile);
            Log.FILESYSTEM(`File deleted: ${outputFile}`);
        }

        if (await Fse.pathExists(thumbnailsFolder)) {
            await Fse.remove(thumbnailsFolder);
            Log.FILESYSTEM(`File deleted: ${thumbnailsFolder}`);
        }

        if (await Fse.pathExists(thumbnailFile)) {
            await Fse.remove(thumbnailFile);
            Log.FILESYSTEM(`File deleted: ${thumbnailFile}`);
        }

        if (await Fse.pathExists(thumbnailManifest)) {
            await Fse.remove(thumbnailManifest);
            Log.FILESYSTEM(`File deleted: ${thumbnailManifest}`);
        }

        if (await Fse.pathExists(thumbnailSheet)) {
            await Fse.remove(thumbnailSheet);
            Log.FILESYSTEM(`File deleted: ${thumbnailSheet}`);
        }

        const isDirectoryEmpty = await Fse.readdirSync(outputFolder).length === 0;
        if (isDirectoryEmpty && path !== '') {
            await Fse.remove(outputFolder);
            await Fse.remove(inputFolder);
            await Fse.remove(thumbnailFolder);
            Log.FILESYSTEM(`Directory "${outputFolder}" is now empty, removing it.`);
            return false;
        }
        return true;
    };
});