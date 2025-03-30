import { Path } from "./path";

export enum UploadType {
    MEDIA = 'media',
    FOLDER_THUMBMAIL = 'folderThumb'
}

export interface IUploadAction {
    path?: string,
    type: UploadType
}

