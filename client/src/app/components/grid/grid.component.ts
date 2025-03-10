import { AfterViewInit, Component, ElementRef, EventEmitter, Input, OnInit, Output, ViewChild } from '@angular/core';
import { environment } from 'src/environments/environment';
import { Folder, IFolder } from 'src/models/folder';
import { IListing } from 'src/models/listing';
import { IListingItem, IListingItemDeleteRequest, IListingItemMoveRequest, ListingItem } from 'src/models/listing-item';
import { Video } from 'src/models/video';
import { IImage, Image } from 'src/models/image';
import { Subscription } from 'rxjs';
import { OnDestroy } from '@angular/core';

@Component({
    selector: 'app-grid',
    templateUrl: './grid.component.html',
    styleUrls: ['./grid.component.scss']
})
export class GridComponent implements OnInit, AfterViewInit, OnDestroy {

    @Input() listing!: IListing;
    @Input() movedItem: IListingItemMoveRequest | null = null;
    @Output() onFolderClick = new EventEmitter<IFolder>();
    @Output() onImageClick = new EventEmitter<IImage>();
    @Output() onDeleteRequest = new EventEmitter<IListingItemDeleteRequest>();
    @Output() onMoveRequest = new EventEmitter<IListingItemMoveRequest>();
    @Output() onMoveCompleted = new EventEmitter<IListingItemMoveRequest>();
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

    ngOnChanges(): void {
        if (this.movedItem) {
            console.log(`🗑 Removing moved item from grid: ${this.movedItem.name}`);
    
            // Remove from folders
            this.listing.folders = this.listing.folders.filter(folder => folder.name !== this.movedItem!.name);
    
            // Remove from images
            this.listing.images = this.listing.images.filter(image => image.name !== this.movedItem!.name);
    
            // Remove from videos
            this.listing.videos = this.listing.videos.filter(video => video.name !== this.movedItem!.name);
    
            // Emit event to notify parent component
            this.onMoveCompleted.emit(this.movedItem);
    
            // Rebuild grid
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

    buildListitemBuckets(): void {

        let currentBucket = 0;

        for (let i = 0; i < this.columns; ++i) {
            this.bucketedListingItems[i] = [];
        }

        // folders first (MacOS Finder like)
        let i = 0;
        for (i; i < this.listing.folders.length; ++i) {
            this.bucketedListingItems[currentBucket++ % this.columns].push(this.listing.folders[i] as ListingItem);
        }
        
        // video and images mixed
        let videoAndImagesListings = (this.listing.videos as ListingItem[]).concat(this.listing.images as ListingItem[]);
        for (i = 0; i < videoAndImagesListings.length; ++i) {
            this.bucketedListingItems[currentBucket++ % this.columns].push(videoAndImagesListings[i]);
        }
    }
}
