import { IListingItem } from "./listing-item";

export interface IFolder extends IListingItem {
}

export class Folder implements IFolder {
    name: string;
    fullname: string;

    constructor(folder: IFolder) {
        this.name = folder.name;
        this.fullname = folder.fullname;
    }

    static isFolder(listingItem: IListingItem): boolean {
        return listingItem instanceof Folder;
    }
}