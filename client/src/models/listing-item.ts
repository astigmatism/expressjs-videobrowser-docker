export interface IListingItem
{
    fullname: string
    name: string
    logicalPath: string
}

export class ListingItem implements IListingItem {
    fullname: string = '';
    name: string = '';
    logicalPath: string = '';
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