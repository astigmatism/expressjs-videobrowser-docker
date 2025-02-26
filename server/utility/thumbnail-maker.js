//@ts-check
'use strict';
const Config = require('config');
const Fse = require('fs-extra');
const Path = require('path');
const Log = require('../utility/log');
const Ffprobe = require('ffprobe');
const FfprobeStatic = require('ffprobe-static');
const ExtractFrames = require('ffmpeg-extract-frames');
const Spritesmith = require('spritesmith');
const sharp = require('sharp');

const ffprobePath = process.env.FFPROBE_PATH || '/usr/bin/ffprobe';

module.exports = new (function () {

    const thumbnailOutputRoot = Config.get('thumbnails.path');
    const workingFolder = Config.get('folders.workingFolder');

    this.ProcessVideoFile = async (sourceMediaFile, sourceMediaFolder) => {
        const parsedSourceMediaFile = Path.parse(sourceMediaFile);

        // Define output file paths
        const thumbnailFileName = `${parsedSourceMediaFile.base}.${Config.get('thumbnails.ext')}`;
        const spriteSheetFileName = `${parsedSourceMediaFile.base}.sheet.${Config.get('thumbnails.ext')}`;
        const thumbnailCoordinatesFileName = `${parsedSourceMediaFile.base}.json`;

        const thumbnailOutputFolder = Path.join(thumbnailOutputRoot, sourceMediaFolder);
        const thumbnailOutputFile = Path.join(thumbnailOutputFolder, thumbnailFileName);
        const spriteSheetOutputFile = Path.join(thumbnailOutputFolder, spriteSheetFileName);
        const spriteSheetCoordinatesOutputFile = Path.join(thumbnailOutputFolder, thumbnailCoordinatesFileName);

        const thumbnailFileExists = await Fse.pathExists(thumbnailOutputFile);
        const spriteSheetFileExists = await Fse.pathExists(spriteSheetOutputFile);

        if (thumbnailFileExists && spriteSheetFileExists) {
            Log.THUMB(`Thumbnail and spritesheet already exist for "${sourceMediaFile}"`);
            return;
        }

        try {
            await Fse.emptyDir(workingFolder); // Clear working folder
            await Fse.ensureDir(thumbnailOutputFolder);

            const fileInfo = await this.ProbeStream(sourceMediaFile);
            await ExtractFrameForThumbnail(sourceMediaFile, fileInfo, thumbnailOutputFile);
            await ExtractFramesForSpriteSheet(sourceMediaFile, fileInfo, spriteSheetFileName);
            await ResizeExtractedFrames();
            await GenerateSpritesheet(spriteSheetFileName, spriteSheetOutputFile, spriteSheetCoordinatesOutputFile);

            await Fse.emptyDir(workingFolder); // Clean up
        } catch (e) {
            console.error(`[ERROR] ProcessVideoFile failed for: ${sourceMediaFile}`);
            console.error(`Error: ${e.message}`);
            console.error(`Stack Trace: ${e.stack}`);
            throw new Error(`ProcessVideoFile failed: ${e.message}`);
        }
    };

    this.ProcessImageFile = async (sourceMediaFile, sourceMediaFolder) => {
        const parsedSourceMediaFile = Path.parse(sourceMediaFile);
        const thumbnailFileName = `${parsedSourceMediaFile.base}.${Config.get('thumbnails.ext')}`;
        const thumbnailOutputFolder = Path.join(thumbnailOutputRoot, sourceMediaFolder);
        const thumbnailOutputFile = Path.join(thumbnailOutputFolder, thumbnailFileName);

        const thumbnailFileExists = await Fse.pathExists(thumbnailOutputFile);
        if (thumbnailFileExists) {
            Log.THUMB(`A thumbnail already exists for "${sourceMediaFile}"`);
            return thumbnailOutputFile;
        }

        Log.THUMB(`Generating a thumbnail for "${sourceMediaFile}"...`);
        await ResizeImageToThumbnail(sourceMediaFile, thumbnailOutputFile);
    };

    this.ProbeStream = async (filePath) => {
        try {
            const fileInfo = await Ffprobe(filePath, { path: ffprobePath });
            if (fileInfo.streams && fileInfo.streams.length > 0) {
                return fileInfo.streams[0];
            }
        } catch (e) {
            throw new Error(`Error probing video file: ${e.message}`);
        }
    };

    this.GetImageSize = async (sourceFile) => {
        try {
            const metadata = await sharp(sourceFile).metadata();
            return { width: metadata.width, height: metadata.height };
        } catch (err) {
            return null; // Return null if metadata extraction fails
        }
    };

    this.CropSpriteSheetToThumbnail = async (spriteSheetFileUrl, thumbnailUrl, coordinates) => {
        const thumbnailRoot = Config.get('thumbnails.path');
        const spriteSheetFile = Path.join(thumbnailRoot, spriteSheetFileUrl);
        const thumbnailFile = Path.join(thumbnailRoot, thumbnailUrl);

        await sharp(spriteSheetFile)
            .extract({
                left: coordinates.x,
                top: coordinates.y,
                width: coordinates.width,
                height: coordinates.height,
            })
            .toFile(thumbnailFile);
        return thumbnailFile;
    };

    const ExtractFrameForThumbnail = async (sourceMediaFile, fileInfo, thumbnailOutputFile) => {
        const durationInMs = fileInfo.duration * 1000;
        const captureInMs = Math.floor(durationInMs * 0.5);

        Log.THUMB(`Extracting center frame for thumbnail from "${sourceMediaFile}"...`);

        await ExtractFrames({
            input: sourceMediaFile,
            output: thumbnailOutputFile,
            offsets: [captureInMs],
            ffmpegOptions: ["-threads", "1", "-preset", "ultrafast"], // Reduce CPU/memory load
        });

        await ResizeImageToThumbnail(thumbnailOutputFile, thumbnailOutputFile);
    };

    const ExtractFramesForSpriteSheet = async (sourceMediaFile, fileInfo, spriteSheetFileName) => {
    const numberToCapture = Config.get("thumbnails.numberToCapture");
    const durationInMs = fileInfo.duration * 1000;
    const captureEveryInMs = durationInMs / numberToCapture;

    Log.THUMB(`Extracting ${numberToCapture} frames from "${sourceMediaFile}" for spritesheet...`);

    // Sequential extraction to avoid resource overload
    for (let i = 0; i < numberToCapture; i++) {
        const captureTime = Math.floor(captureEveryInMs * i);
        const frameOutput = Path.join(workingFolder, `frame-${i + 1}-${spriteSheetFileName}`);

        // Log.THUMB(`Extracting frame at ${captureTime} ms -> ${frameOutput}`);

        try {
            await ExtractFrames({
                input: sourceMediaFile,
                output: frameOutput,
                offsets: [captureTime],
                ffmpegOptions: ["-threads", "1", "-preset", "ultrafast"], // Reduce CPU/memory load
            });
        } catch (err) {
            Log.THUMB(`Failed extracting frame ${i + 1}: ${err.message}`);
            throw err;
        }
    }
};

    const ResizeExtractedFrames = async () => {
        Log.THUMB(`Resizing extracted frames to thumbnail constraints...`);

        const files = await Fse.readdir(workingFolder);
        for (const file of files) {
            const fileName = Path.join(workingFolder, file);
            await ResizeImageToThumbnail(fileName, fileName);
        }
    };

    const GenerateSpritesheet = async (spriteSheetFileName, spriteSheetOutputFile, spriteSheetCoordinatesOutputFile) => {
        Log.THUMB(`Generating spritesheet for "${spriteSheetFileName}"...`);

        const numberToCapture = Config.get('thumbnails.numberToCapture');
        let sprites = [];
        for (let i = 1; i <= numberToCapture; ++i) {
            sprites.push(Path.join(workingFolder, `frame-${i}-${spriteSheetFileName}`));
        }

        const result = await RunSpritesmith(sprites);
        const coordinates = GenerateMeaningfulCoordinates(result.coordinates);
        await Fse.writeFile(spriteSheetOutputFile, result.image);
        await Fse.writeFile(spriteSheetCoordinatesOutputFile, JSON.stringify(coordinates));
    };

    const RunSpritesmith = async (sprites) => {
        return new Promise((resolve, reject) => {
            Spritesmith.run({ src: sprites }, (err, results) => {
                if (err) return reject(err);
                resolve(results);
            });
        });
    };

    const GenerateMeaningfulCoordinates = (source) => {
        return Object.values(source);
    };

    const ResizeImageToThumbnail = async (sourceFile, destinationFile) => {
        const maxWidth = Config.get('thumbnails.maxWidth');
        const tempFile = sourceFile === destinationFile ? `${destinationFile}.tmp` : destinationFile;
    
        try {
            await sharp(sourceFile)
                .resize({ width: maxWidth })
                .toFile(tempFile); // Save to temp file if needed
    
            if (tempFile !== destinationFile) {
                await Fse.move(tempFile, destinationFile, { overwrite: true });
            }
        } catch (err) {
            console.error(`[ERROR] Failed to resize image: ${err.message}`);
            throw err;
        }
    };
})();