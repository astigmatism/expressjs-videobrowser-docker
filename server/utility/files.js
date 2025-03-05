//@ts-check
'use-strict';
const Config = require('config');
const Fse = require('fs-extra');
const Path = require('path');
const fs = require('fs');

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

    this.moveFileChunked = async(src, dest, chunkSize = 64 * 1024 * 1024) => {
        try {
            const srcStat = await Fse.stat(src);
    
            if (srcStat.size <= chunkSize) {
                // ✅ Small file: Move it normally
                await Fse.move(src, dest, { overwrite: true });
                console.log(`✅ Moved file: ${src} → ${dest}`);
                return;
            }
    
            console.log(`🔄 Moving large file in chunks: ${src} → ${dest}`);
    
            // ❌ Node.js fails if a chunk exceeds 2GB, so use controlled chunking
            await new Promise((resolve, reject) => {
                const readStream = fs.createReadStream(src, { highWaterMark: chunkSize });
                const writeStream = fs.createWriteStream(dest);
    
                readStream.on('error', reject);
                writeStream.on('error', reject);
                writeStream.on('finish', async () => {
                    console.log(`✅ File copied successfully: ${dest}`);
                    await Fse.remove(src); // Delete original file
                    console.log(`🗑️ Deleted source file: ${src}`);
                    resolve(dest);
                });
    
                readStream.pipe(writeStream);
            });
    
        } catch (error) {
            console.error(`❌ Error moving file: ${error.message}`);
            throw error;
        }
    }

    this.writeFileChunked = async (destinationFile, fileData, chunkSize = 64 * 1024 * 1024) => {
        try {
    
            if (Buffer.isBuffer(fileData)) {
                // ✅ Buffer case: Write in chunks
                console.log(`🔄 Writing file in chunks: ${destinationFile}`);
    
                return new Promise((resolve, reject) => {
                    const writeStream = fs.createWriteStream(destinationFile);
                    writeStream.on('error', reject);
                    writeStream.on('finish', () => {
                        console.log(`✅ File written successfully: ${destinationFile}`);
                        resolve(destinationFile);
                    });
    
                    let offset = 0;
                    const totalSize = fileData.length;
    
                    function writeChunk() {
                        if (offset < totalSize) {
                            const nextChunk = fileData.slice(offset, offset + chunkSize);
                            offset += nextChunk.length;
    
                            if (!writeStream.write(nextChunk)) {
                                writeStream.once('drain', writeChunk);
                            } else {
                                setImmediate(writeChunk);
                            }
                        } else {
                            writeStream.end();
                        }
                    }
    
                    writeChunk();
                });
    
            } else {
                // ✅ Small file or string: Write normally
                await Fse.writeFile(destinationFile, fileData);
                console.log(`✅ File written successfully: ${destinationFile}`);
            }
    
        } catch (error) {
            console.error(`❌ Error writing file: ${error.message}`);
            throw error;
        }
    }
    
    this.writeFileSafe = async (destination, data) => {
        return new Promise((resolve, reject) => {
            const writeStream = fs.createWriteStream(destination);

            writeStream.on('error', (err) => {
                console.error(`❌ Error writing file: ${err.message}`);
                reject(err);
            });

            writeStream.on('finish', () => {
                console.log(`✅ Successfully written file: ${destination}`);
                resolve(destination);
            });

            // Write the data in chunks
            writeStream.write(data);
            writeStream.end();
        });
    }

    this.moveFileSafe = async (src, dest) => {
        try {
            const srcStat = await Fse.stat(src);
            const srcDrive = src.split(Path.sep)[0];
            const destDrive = dest.split(Path.sep)[0];
    
            if (srcDrive === destDrive) {
                // ✅ Same filesystem: Use fast rename
                await Fse.move(src, dest, { overwrite: true });
                console.log(`✅ Moved file: ${src} → ${dest}`);
            } else {
                // ❌ Different filesystems: Use streaming
                console.log(`🔄 Copying large file across filesystems: ${src} → ${dest}`);
    
                await new Promise((resolve, reject) => {
                    const readStream = fs.createReadStream(src);
                    const writeStream = fs.createWriteStream(dest);
    
                    readStream.on('error', reject);
                    writeStream.on('error', reject);
    
                    writeStream.on('finish', async () => {
                        console.log(`✅ File copied successfully: ${dest}`);
                        await Fse.remove(src); // Delete original file
                        console.log(`🗑️ Deleted source file: ${src}`);
                        resolve(dest);
                    });
    
                    readStream.pipe(writeStream); // Stream the file
                });
            }
        } catch (error) {
            console.error(`❌ Error moving file: ${error.message}`);
            throw error;
        }
    }
});