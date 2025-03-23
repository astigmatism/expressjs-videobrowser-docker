import { IMetadata } from "./metadata";

export interface IListingItem
{
    fullname: string
    name: string
    logicalPath: string
    metadata?: IMetadata;
}

export class ListingItem implements IListingItem {
    fullname: string = '';
    name: string = '';
    logicalPath: string = '';
    metadata?: IMetadata;
}

export interface IListingItemDeleteRequest
{
    name: string;
    isFolder: boolean;
}

export interface IListingItemMoveRequest
{
    sourcePath: string;
    destinationPath: string;
    name: string;
    isFolder: boolean;
}