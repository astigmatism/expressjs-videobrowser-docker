const Fse = require('fs-extra');
const Config = require('config');
const Path = require('path');
const Log = require('../utility/log');

const METADATA_FILENAME = '.metadata.json';

class MetadataManager {
    constructor() {
        this.cache = new Map(); // In-memory cache per folder
    }

    async loadMetadata(folderPath) {
        const metadataPath = Path.join(folderPath, METADATA_FILENAME);
        let metadata = {};
    
        if (await Fse.pathExists(metadataPath)) {
            metadata = await Fse.readJson(metadataPath).catch(() => ({}));
        }
    
        this.cache.set(folderPath, metadata);
        return metadata;
    }

    async _createDefaultMetadataItem(filePath) {
        try {
            const stats = await Fse.stat(filePath);
            return {
                createdAt: stats.birthtime.toISOString(),  // actual creation date
                lastViewed: null,
                views: 0,
                spice: 0,
                tags: []
            };
        } catch (err) {
            Log.CRITICAL(`❌ Failed to stat file for metadata: ${filePath}`, err);
            // Fallback to current timestamp if stat fails
            return {
                createdAt: new Date().toISOString(),
                lastViewed: null,
                views: 0,
                spice: 0,
                tags: []
            };
        }
    }

    async initializeMetadataForDirectory(folderPath, itemNames, currentSortOption = 'name-asc') {
        const metadata = await this.loadMetadata(folderPath);
        let updated = false;
    
        // Ensure _meta section exists
        if (!metadata._meta) {
            metadata._meta = {};
            updated = true;
        }
    
        // If sortOption changed or missing, update it
        if (metadata._meta.sortOption !== currentSortOption) {
            metadata._meta.sortOption = currentSortOption;
            updated = true;
        }
    
        const now = new Date().toISOString();
        const itemSet = new Set(itemNames);
        itemSet.delete('.metadata.json');
    
        // Prune stale entries
        for (const existingItem of Object.keys(metadata)) {
            if (existingItem === '_meta') continue;
            if (!itemSet.has(existingItem)) {
                delete metadata[existingItem];
                updated = true;
            }
        }
    
        // Add new items
        for (const item of itemSet) {
            if (!metadata[item]) {
                const itemPath = Path.join(folderPath, item);
                metadata[item] = await this._createDefaultMetadataItem(itemPath);
                updated = true;
            }
        }
    
        if (updated) {
            this.cache.set(folderPath, metadata);
            await this.saveMetadata(folderPath);
        }
    
        return metadata;
    }

    async saveMetadata(folderPath) {
        const metadata = this.cache.get(folderPath);
        if (!metadata) return;

        const metadataPath = Path.join(folderPath, METADATA_FILENAME);
        await Fse.writeJson(metadataPath, metadata, { spaces: 2 });
    }

    async updateItemMetadata(folderPath, itemName, updates = {}) {
        const metadata = await this.loadMetadata(folderPath);
        const existing = metadata[itemName] || {
            createdAt: new Date().toISOString()
        };
    
        const updated = {
            ...existing,
            ...updates
        };
    
        metadata[itemName] = updated;
        this.cache.set(folderPath, metadata);
        await this.saveMetadata(folderPath);
    }

    async incrementMetric(folderPath, itemName, field) {
        const metadata = await this.loadMetadata(folderPath);
        const entry = metadata[itemName] || {
            createdAt: new Date().toISOString(),
        };
    
        entry[field] = (entry[field] || 0) + 1;
    
        metadata[itemName] = entry;
        this.cache.set(folderPath, metadata);
        await this.saveMetadata(folderPath);
    }

    getMetadataForItem(folderPath, itemName) {
        const metadata = this.cache.get(folderPath) || {};
        return metadata[itemName] || null;
    }
    
    async setTags(folderPath, itemName, tags = []) {
        const metadata = await this.loadMetadata(folderPath);
        const entry = metadata[itemName] || this._createDefaultMetadataItem();
    
        entry.tags = Array.from(new Set(tags)); // ensure uniqueness
        metadata[itemName] = entry;
    
        this.cache.set(folderPath, metadata);
        await this.saveMetadata(folderPath);
    }

    async addTag(folderPath, itemName, tag) {
        const metadata = await this.loadMetadata(folderPath);
        const entry = metadata[itemName] || this._createDefaultMetadataItem();
    
        if (!entry.tags.includes(tag)) {
            entry.tags.push(tag);
        }
    
        metadata[itemName] = entry;
        this.cache.set(folderPath, metadata);
        await this.saveMetadata(folderPath);
    }

    async removeTag(folderPath, itemName, tag) {
        const metadata = await this.loadMetadata(folderPath);
        const entry = metadata[itemName] || this._createDefaultMetadataItem();
    
        entry.tags = entry.tags.filter(t => t !== tag);
    
        metadata[itemName] = entry;
        this.cache.set(folderPath, metadata);
        await this.saveMetadata(folderPath);
    }

    async findItemsByTag(mediaRoot, tag) {
        const matchingItems = [];
    
        const walk = async (folder) => {
            const metadataPath = Path.join(folder, METADATA_FILENAME);
            if (await Fse.pathExists(metadataPath)) {
                const metadata = await Fse.readJson(metadataPath);
                for (const [item, meta] of Object.entries(metadata)) {
                    if (Array.isArray(meta.tags) && meta.tags.includes(tag)) {
                        matchingItems.push({
                            folder,
                            item,
                            metadata: meta
                        });
                    }
                }
            }
    
            const entries = await Fse.readdir(folder);
            for (const entry of entries) {
                const entryPath = Path.join(folder, entry);
                if ((await Fse.stat(entryPath)).isDirectory()) {
                    await walk(entryPath);
                }
            }
        };
    
        await walk(mediaRoot);
        return matchingItems;
    }

    async deleteAllMetadataFiles(rootPath) {
        const deleted = [];
    
        const walk = async (folder) => {
            const entries = await Fse.readdir(folder);
            for (const entry of entries) {
                const entryPath = Path.join(folder, entry);
                const stat = await Fse.stat(entryPath);
                if (stat.isDirectory()) {
                    await walk(entryPath);
                } else if (entry === METADATA_FILENAME) {
                    await Fse.remove(entryPath);
                    deleted.push(entryPath);
                    Log.INFO(`🗑️ Deleted metadata file: ${entryPath}`);
                }
            }
        };
    
        await walk(rootPath);
        this.cache.clear();
        return deleted;
    }
}

module.exports = new MetadataManager();