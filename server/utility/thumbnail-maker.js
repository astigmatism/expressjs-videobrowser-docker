//@ts-check
'use strict';
const Config = require('config');
const Fse = require('fs-extra');
const Path = require('path');
const Log = require('../utility/log');
const Ffprobe = require('ffprobe');
const ExtractFrames = require('ffmpeg-extract-frames');
const Spritesmith = require('spritesmith');
const gm = require('gm').subClass({ imageMagick: true });

const ffprobePath = process.env.FFPROBE_PATH || '/usr/bin/ffprobe';

module.exports = new (function () {
    const thumbnailOutputRoot = Config.get('thumbnails.path');
    const workingFolder = Config.get('folders.workingFolder');

    this.ProcessVideoFile = async (sourceMediaFile, sourceMediaFolder) => {
        const parsedSourceMediaFile = Path.parse(sourceMediaFile);

        const thumbnailFileName = `${parsedSourceMediaFile.base}.${Config.get('thumbnails.ext')}`;
        const spriteSheetFileName = `${parsedSourceMediaFile.base}.sheet.${Config.get('thumbnails.ext')}`;
        const thumbnailCoordinatesFileName = `${parsedSourceMediaFile.base}.json`;

        const thumbnailOutputFolder = Path.join(thumbnailOutputRoot, sourceMediaFolder);
        const thumbnailOutputFile = Path.join(thumbnailOutputFolder, thumbnailFileName);
        const spriteSheetOutputFile = Path.join(thumbnailOutputFolder, spriteSheetFileName);
        const spriteSheetCoordinatesOutputFile = Path.join(thumbnailOutputFolder, thumbnailCoordinatesFileName);

        if (await Fse.pathExists(thumbnailOutputFile) && await Fse.pathExists(spriteSheetOutputFile)) {
            Log.THUMB(`Thumbnail and spritesheet already exist for "${sourceMediaFile}"`);
            return;
        }

        try {
            await Fse.emptyDir(workingFolder);
            await Fse.ensureDir(thumbnailOutputFolder);

            const fileInfo = await this.ProbeStream(sourceMediaFile);
            await ExtractFrameForThumbnail(sourceMediaFile, fileInfo, thumbnailOutputFile);
            await ExtractFramesForSpriteSheet(sourceMediaFile, fileInfo);
            await ResizeExtractedFrames();
            await GenerateSpritesheet(spriteSheetOutputFile, spriteSheetCoordinatesOutputFile);

            await Fse.emptyDir(workingFolder);
        } catch (e) {
            Log.CRITICAL(`🚨 ProcessVideoFile failed: ${e.message}`);
            throw new Error(`ProcessVideoFile failed: ${e.message}`);
        }
    };

    this.ProcessImageFile = async (sourceMediaFile, sourceMediaFolder) => {
        const parsedSourceMediaFile = Path.parse(sourceMediaFile);
        const thumbnailFileName = `${parsedSourceMediaFile.base}.${Config.get('thumbnails.ext')}`;
        const thumbnailOutputFolder = Path.join(thumbnailOutputRoot, sourceMediaFolder);
        const thumbnailOutputFile = Path.join(thumbnailOutputFolder, thumbnailFileName);

        if (await Fse.pathExists(thumbnailOutputFile)) {
            Log.THUMB(`A thumbnail already exists for "${sourceMediaFile}"`);
            return thumbnailOutputFile;
        }

        Log.THUMB(`Generating a thumbnail for "${sourceMediaFile}"...`);
        await ResizeImageToThumbnail(sourceMediaFile, thumbnailOutputFile);
        return thumbnailOutputFile;
    };

    this.ProbeStream = async (filePath) => {
        try {
            const fileInfo = await Ffprobe(filePath, { path: ffprobePath });
            return fileInfo.streams?.[0] ?? null;
        } catch (e) {
            throw new Error(`Error probing video file: ${e.message}`);
        }
    };

    this.GetImageSize = async (sourceFile) => {
        return new Promise((resolve, reject) => {
            gm(sourceFile).identify((err, data) => {
                if (err || !data.size) return resolve(null);
                resolve({ width: data.size.width, height: data.size.height });
            });
        });
    };

    const ExtractFrameForThumbnail = async (sourceMediaFile, fileInfo, thumbnailOutputFile) => {
        const captureInMs = Math.floor(fileInfo.duration * 1000 * 0.5);

        Log.THUMB(`Extracting center frame for thumbnail from "${sourceMediaFile}"...`);

        await ExtractFrames({
            input: sourceMediaFile,
            output: thumbnailOutputFile,
            offsets: [captureInMs],
        });

        await ResizeImageToThumbnail(thumbnailOutputFile, thumbnailOutputFile);
    };

    const ExtractFramesForSpriteSheet = async (sourceMediaFile, fileInfo) => {
        const numberToCapture = Config.get("thumbnails.numberToCapture");
        const durationInMs = fileInfo.duration * 1000;
        const captureEveryInMs = durationInMs / numberToCapture;

        Log.THUMB(`Extracting ${numberToCapture} frames from "${sourceMediaFile}" for spritesheet...`);

        for (let i = 0; i < numberToCapture; i++) {
            const captureTime = Math.floor(captureEveryInMs * i);
            const frameOutput = Path.join(workingFolder, `frame-${i + 1}.jpg`);

            try {
                await ExtractFrames({
                    input: sourceMediaFile,
                    output: frameOutput,
                    offsets: [captureTime],
                });
            } catch (err) {
                Log.THUMB(`Failed extracting frame ${i + 1}: ${err.message}`);
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

    const ResizeImageToThumbnail = async (sourceFile, destinationFile) => {
        const maxWidth = Config.get('thumbnails.maxWidth');
        return new Promise((resolve, reject) => {
            gm(sourceFile)
                .resize(maxWidth)
                .noProfile() // Remove metadata for optimization
                .write(destinationFile, (err) => {
                    if (err) reject(new Error(`[ERROR] Failed to resize image: ${err.message}`));
                    else resolve(destinationFile);
                });
        });
    };

    const GenerateSpritesheet = async (spriteSheetOutputFile, spriteSheetCoordinatesOutputFile) => {
        Log.THUMB(`Generating spritesheet...`);

        const numberToCapture = Config.get('thumbnails.numberToCapture');
        let sprites = [];
        for (let i = 1; i <= numberToCapture; ++i) {
            sprites.push(Path.join(workingFolder, `frame-${i}.jpg`));
        }

        const result = await RunSpritesmith(sprites);
        const coordinates = Object.values(result.coordinates);
        await Fse.writeFile(spriteSheetOutputFile, result.image);
        await Fse.writeFile(spriteSheetCoordinatesOutputFile, JSON.stringify(coordinates));
    };

    const RunSpritesmith = async (sprites) => {
        return new Promise((resolve, reject) => {
            Spritesmith.run({ src: sprites }, (err, results) => {
                if (err) reject(new Error(err.message));
                else resolve(results);
            });
        });
    };
})();