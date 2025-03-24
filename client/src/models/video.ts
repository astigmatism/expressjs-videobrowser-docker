import { IListingItem } from "./listing-item";
import { IMetadata, IProbe } from "./metadata";
import { ISpriteSheet } from "./spritesheet";
import { IThumbnail } from "./thumbnail";

export enum VideoResolutionClass {
    r240 = '240',
    r480 = '480',
    r720 = '720',
    r1080 = '1080',
    r2160 = '4k'
}

export interface IVideo extends IListingItem {
    thumbnail: IThumbnail;
    spriteSheet: ISpriteSheet;
    url: string;
    metadata?: IMetadata;

    // derived
    probe: IProbe;
    resolutionClass: VideoResolutionClass
}

export class Video implements IVideo {
    name: string;
    fullname: string;
    probe: IProbe;
    thumbnail: IThumbnail;
    spriteSheet: ISpriteSheet;
    homePath: string;
    url: string;
    metadata?: IMetadata;
    
    resolutionClass: VideoResolutionClass;
    logicalPath: string;

    constructor(video: IVideo) {
        this.name = video.name;
        this.fullname = video.fullname;
        this.thumbnail = video.thumbnail;
        this.spriteSheet = video.spriteSheet;
        this.url = video.url;
        this.logicalPath = video.logicalPath;
        this.metadata = video.metadata;
        this.homePath = video.homePath

        this.probe = video.metadata?.probe ?? {
            width: 0,
            height: 0,
            duration: 0,
            display_aspect_ratio: ''
        };

        this.resolutionClass = Video.getResolutionClass(this.probe.height);
    }

    static isVideo(listingItem: IListingItem): boolean {
        return listingItem instanceof Video;
    }

    static convertSecondsToTimeSignature(seconds: number): string {
        let m = Math.floor(seconds / 60);
        let s = Math.floor(seconds % 60); 
        return m + ':' + ((s < 10) ? '0' + s : s.toString());
    }

    static getResolutionClass(value: number): VideoResolutionClass {
        if (value >= 2160) return VideoResolutionClass.r2160;
        if (value >= 1080) return VideoResolutionClass.r1080;
        if (value >= 720) return VideoResolutionClass.r720;
        if (value >= 480) return VideoResolutionClass.r480;
        return VideoResolutionClass.r240;
    }
}
