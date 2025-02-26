import { ISpriteSheetCoordinates } from "./spritesheet";

export interface IThumbnail {
    width: number,
    height: number,
    url: string,
}


export interface ISetThumbnailData {
    coordinates: ISpriteSheetCoordinates
    thumbnailUrl: string,
    spriteSheetUrl: string
}
