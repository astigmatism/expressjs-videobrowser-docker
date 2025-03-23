import { Folder, IFolder } from "./folder";
import { IImage, Image } from "./image";
import { IVideo, Video } from "./video";

export interface IListing {
    path: string,
    sortOption?: string;
    videos: IVideo[],
    images: IImage[],
    folders: IFolder[],
}

export class Listing implements IListing {
    path: string = '';
    sortOption?: string;
    videos: IVideo[] = [];
    images: IImage[] = [];
    folders: IFolder[] = [];

    constructor(listing: IListing) {
        this.path = listing.path;
        this.sortOption = listing.sortOption ?? 'name-asc';
        for (const folder of listing.folders) {
            this.folders.push(new Folder(folder))
        }
        for (const video of listing.videos) {
            this.videos.push(new Video(video))
        }
        for (const image of listing.images) {
            this.images.push(new Image(image))
        }
    }
}