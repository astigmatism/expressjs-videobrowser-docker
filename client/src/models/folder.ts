import { IListingItem } from "./listing-item";
import { IMetadata } from "./metadata";
import { IThumbnail } from "./thumbnail";

export interface IFolder extends IListingItem {
    embeddedThumbnail?: string;
}

export class Folder implements IFolder {
    name: string;
    fullname: string;
    logicalPath: string;
    homePath: string;
    metadata?: IMetadata | undefined;
    embeddedThumbnail?: string;

    constructor(folder: IFolder) {
        this.name = folder.name;
        this.fullname = folder.fullname;
        this.logicalPath = folder.logicalPath;
        this.homePath = folder.homePath;
        this.metadata = folder.metadata;
        this.embeddedThumbnail = folder.embeddedThumbnail;
    }

    static isFolder(listingItem: IListingItem): boolean {
        return listingItem instanceof Folder;
    }
}