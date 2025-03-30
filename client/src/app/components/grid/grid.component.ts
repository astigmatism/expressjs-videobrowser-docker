import { AfterViewInit, Component, ElementRef, EventEmitter, Input, OnInit, Output, ViewChild, SimpleChanges, OnChanges } from '@angular/core';
import { environment } from 'src/environments/environment';
import { Folder, IFolder } from 'src/models/folder';
import { IListing } from 'src/models/listing';
import { IListingItem, IListingItemDeleteRequest, IListingItemMoveRequest, ListingItem } from 'src/models/listing-item';
import { Video } from 'src/models/video';
import { IImage, Image } from 'src/models/image';
import { Subscription } from 'rxjs';
import { OnDestroy } from '@angular/core';
import { IUploadAction, UploadType } from 'src/models/uploads';

@Component({
    selector: 'app-grid',
    templateUrl: './grid.component.html',
    styleUrls: ['./grid.component.scss']
})
export class GridComponent implements OnInit, AfterViewInit, OnDestroy, OnChanges {

    @Input() listing!: IListing;
    @Input() movedItem: IListingItemMoveRequest | null = null;
    @Output() onFolderClick = new EventEmitter<IFolder>();
    @Output() onImageClick = new EventEmitter<IImage>();
    @Output() onDeleteRequest = new EventEmitter<IListingItemDeleteRequest>();
    @Output() onMoveRequest = new EventEmitter<IListingItemMoveRequest>();
    @Output() onMoveCompleted = new EventEmitter<IListingItemMoveRequest>();
    @Output() onUploadClicked = new EventEmitter<IUploadAction>();
    @ViewChild('container') container!: ElementRef;
    
    public columns = 0;
    public bucketedListingItems: Array<ListingItem[]> = [];
    private subscriptions: Array<Subscription> = [];

    constructor() { }
    
    ngOnDestroy(): void {
        this.subscriptions.forEach((subscription: Subscription) => { subscription.unsubscribe(); })
    }

    ngOnInit(): void {
    }

    ngAfterViewInit(): void {
        
        const viewportWidth = this.container.nativeElement.clientWidth;
        this.columns = Math.floor(viewportWidth / environment.grid.gridItemWidthWithMargin);
        this.buildListitemBuckets();
    }

    ngOnChanges(changes: SimpleChanges): void {
        if (changes['listing'] && changes['listing'].currentValue) {
            this.buildListitemBuckets();
        }
    
        if (changes['movedItem'] && this.movedItem) {
            console.log(`🗑 Removing moved item from grid: ${this.movedItem.name}`);
    
            this.listing.folders = this.listing.folders.filter(folder => folder.name !== this.movedItem!.name);
            this.listing.images = this.listing.images.filter(image => image.name !== this.movedItem!.name);
            this.listing.videos = this.listing.videos.filter(video => video.name !== this.movedItem!.name);
    
            this.onMoveCompleted.emit(this.movedItem);
            this.buildListitemBuckets();
        }
    }

    folderClicked(folder: IFolder): void {
        this.onFolderClick.emit(folder);
    }

    imageClicked(image: IImage): void {
        this.onImageClick.emit(image);
    }

    deleteRequest(request: IListingItemDeleteRequest): void {
        this.onDeleteRequest.emit(request);
    }

    moveRequest(request: IListingItemMoveRequest): void {
        this.onMoveRequest.emit(request);
    }

    isFolderListing(listingItem: IListingItem): boolean {
        if (listingItem instanceof Folder) return true;
        return false;
    }

    isVideoListing(listingItem: IListingItem): boolean {
        if (listingItem instanceof Video) return true;
        return false;
    }

    isImageListing(listingItem: IListingItem): boolean {
        if (listingItem instanceof Image) return true;
        return false;
    }

    uploadClicked(folderThumbnai: IUploadAction): void {
        this.onUploadClicked.emit(folderThumbnai);
    }

    buildListitemBuckets(): void {
        if (this.columns === 0) {
            // We haven't yet measured container width in ngAfterViewInit
            return;
        }
    
        let currentBucket = 0;
    
        // Properly reset all buckets
        this.bucketedListingItems = Array.from({ length: this.columns }, () => []);
    
        // folders first (MacOS Finder like)
        for (const folder of this.listing.folders) {
            this.bucketedListingItems[currentBucket++ % this.columns].push(folder as ListingItem);
        }
    
        // video and images mixed
        const videoAndImagesListings = (this.listing.videos as ListingItem[]).concat(this.listing.images as ListingItem[]);
        for (const item of videoAndImagesListings) {
            this.bucketedListingItems[currentBucket++ % this.columns].push(item);
        }
    }
}
