//@ts-check
'use-strict';
const Config = require('config');
const Fse = require('fs-extra');
const Path = require('path');
const { exec } = require('child_process');
const Log = require('../utility/log');
const Hbjs = require('handbrake-js');

module.exports = new (function() {

    const mediaOutputRoot = Config.get('folders.outputFolder');
    const mediaWorkingRoot = Config.get('folders.workingFolder');
    const deleteFileWhenDone = Config.get('deleteSourceFilesAfterProcessing');

    this.ProcessFile = async (sourceMediaFile, sourceMediaLocation, parsedFile) => {
        const convertedFileName = `${parsedFile.name}.${Config.get('video.convertedExt')}`;
        const tempConvertedFile = Path.join(mediaWorkingRoot, sourceMediaLocation, convertedFileName);
        const finalConvertedFile = Path.join(mediaOutputRoot, sourceMediaLocation, convertedFileName);

        const convertedFileExists = await Fse.pathExists(finalConvertedFile);
        const tempFileExists = await Fse.pathExists(tempConvertedFile);

        if (convertedFileExists) {
            Log.VIDEO(`The file "${parsedFile.base}" has already been converted.`);
            return finalConvertedFile;
        }

        if (tempFileExists) {
            Log.VIDEO(`Removing incomplete conversion for "${parsedFile.base}" and retrying.`);
            await Fse.remove(tempConvertedFile);
        }

        // Move original file to working directory with a unique name
        await Fse.ensureDir(Path.join(mediaWorkingRoot, sourceMediaLocation));
        const uniqueInputFileName = `${parsedFile.name}-working${parsedFile.ext}`;
        const tempSourceFile = Path.join(mediaWorkingRoot, sourceMediaLocation, uniqueInputFileName);
        await Fse.move(sourceMediaFile, tempSourceFile, { overwrite: true });

        Log.VIDEO(`Now converting the file "${tempSourceFile}"...`);

        await HandbrakeConversion(tempSourceFile, tempConvertedFile);

        // Move fully converted file to output folder
        await Fse.ensureDir(Path.join(mediaOutputRoot, sourceMediaLocation));
        await Fse.move(tempConvertedFile, finalConvertedFile, { overwrite: true });

        if (deleteFileWhenDone) {
            await Fse.remove(tempSourceFile);
        }

        return finalConvertedFile;
    };

    const HandbrakeConversion = async (sourceFile, destinationFile) => {

        const handbrakeParameters = Config.get('video.handbrakeParamters');
        let encodingOptions = {};
        let progressMarker = -1;

        encodingOptions['input'] = sourceFile;
        encodingOptions['output'] = destinationFile;
        for (const property in handbrakeParameters) {
            encodingOptions[property] = handbrakeParameters[property];
        }

        await RunHandbrake(sourceFile, encodingOptions)
    }

    const HandbrakeConversionUpscale = async (sourceFile, destinationFile) => {

        const handbrakeParameters = Config.get('video.handbrakeParamters');
        let encodingOptions = {};
        let progressMarker = -1;

        encodingOptions['input'] = sourceFile;
        encodingOptions['output'] = destinationFile;
        for (const property in handbrakeParameters) {
            encodingOptions[property] = handbrakeParameters[property];
        }

        await RunHandbrake(sourceFile, encodingOptions)
    }

    const RunHandbrake = async (sourceFile, encodingOptions) => {
        return new Promise(function (resolve, reject) {

            // @ts-ignore
            Hbjs.spawn(encodingOptions)
                .on('error', (err) => {
                    Log.CRITICAL(err);
                })
                .on('progress', (progress) => {
                    Log.HBJS(`${progress.percentComplete.toFixed(2)}%, ETA: ${progress.eta}, ${sourceFile}`);
                })
                .on('complete', () => {
                    Log.HBJS_END(`complete!`);
                    resolve(sourceFile);
                })
        });
    }

    const RunHandbrakeUpscale = async (sourceFile) => {

        const options = "ffmpeg -i input.mp4 -vf scale=2560:1440:flags=lanczos output.mp4"
    }
});