export interface ISpriteSheet {
    width: number,
    height: number,
    url: string,
    coordinates: ISpriteSheetCoordinates[]
}

export interface ISpriteSheetCoordinates {
    x: number;
    y: number;
    width: number;
    height: number;
}