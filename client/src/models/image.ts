import { IListingItem } from "./listing-item";
import { IMetadata } from "./metadata";
import { IThumbnail } from "./thumbnail";

export interface IImage extends IListingItem {
    thumbnail: IThumbnail
    url: string;
}

export class Image implements IImage {
    name: string;
    fullname: string;
    url: string;
    thumbnail: IThumbnail;
    logicalPath: string;
    homePath: string;
    metadata?: IMetadata | undefined;

    constructor(image: IImage) {
        this.name = image.name;
        this.fullname = image.fullname;
        this.url = image.url;
        this.thumbnail = image.thumbnail;
        this.logicalPath = image.logicalPath;
        this.homePath = image.homePath;
        this.metadata = image.metadata;
    }

    static isImage(listingItem: IListingItem): boolean {
        return listingItem instanceof Image;
    }
}