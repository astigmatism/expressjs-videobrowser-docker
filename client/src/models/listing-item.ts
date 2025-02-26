export interface IListingItem
{
    fullname: string
    name: string
}

export class ListingItem implements IListingItem {
    fullname: string = '';
    name: string = '';
}

export interface IListingItemDeleteRequest
{
    name: string;
    isFolder: boolean;
}