export interface IProbe {
    width: number,
    height: number,
    display_aspect_ratio: string,
    duration: number
}

export interface IMetadata {
    createdAt: string;
    lastViewed: string | null;
    views: number;
    favorite: number;
    special: number;
    tags: string[];
    probe?: IProbe; // Optional, only for videos
}