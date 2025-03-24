import { IListingItem } from "./listing-item";
import { IMetadata } from "./metadata";

export interface IFolder extends IListingItem {
}

export class Folder implements IFolder {
    name: string;
    fullname: string;
    logicalPath: string;
    homePath: string;
    metadata?: IMetadata | undefined;

    constructor(folder: IFolder) {
        this.name = folder.name;
        this.fullname = folder.fullname;
        this.logicalPath = folder.logicalPath;
        this.homePath = folder.homePath;
        this.metadata = folder.metadata;
    }

    static isFolder(listingItem: IListingItem): boolean {
        return listingItem instanceof Folder;
    }
}