import { IListingItem } from "./listing-item";

export interface IFolder extends IListingItem {
}

export class Folder implements IFolder {
    name: string;
    fullname: string;
    logicalPath: string;

    constructor(folder: IFolder) {
        this.name = folder.name;
        this.fullname = folder.fullname;
        this.logicalPath = folder.logicalPath;
    }

    static isFolder(listingItem: IListingItem): boolean {
        return listingItem instanceof Folder;
    }
}