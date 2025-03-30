import { AfterViewInit, Component, EventEmitter, HostListener, OnInit, Output, ChangeDetectorRef } from '@angular/core';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { HttpService } from 'src/app/services/http/http.service';
import { WebsocketService } from 'src/app/services/web-sockets/web-sockets.service';
import { environment } from 'src/environments/environment';
import { IFolder } from 'src/models/folder';
import { IImage, Image as xImage } from 'src/models/image';
import { IListing, Listing } from 'src/models/listing';
import { IListingItemDeleteRequest, IListingItemMoveRequest } from 'src/models/listing-item';
import { Path } from 'src/models/path';
import { ServerState } from 'src/models/server';
import { UploadType, IUploadAction } from 'src/models/uploads';

@Component({
    selector: 'app-browser',
    templateUrl: './browser.component.html',
    styleUrls: ['./browser.component.scss']
})
export class BrowserComponent implements OnInit, AfterViewInit {
    
    @HostListener('window:keydown.escape', ['$event'])
    KeyDownEscape(event: KeyboardEvent) {
        this.logout();
    }

    public listing!: IListing;
    public movedItem: IListingItemMoveRequest | null = null;
    private currentPath!: string;
    private subscriptions: Subscription[] = [];
    public imageToOpenGallery!: IImage;
    public galleryActive = false;
    public uploadDialogActive = false;
    public uploadAction: IUploadAction = { type: UploadType.MEDIA}
    public newFolderDialogActive = false;
    public initialServerState!: ServerState;
    public showFooter = false;
    public currentSort: string | undefined = undefined

    constructor(private httpService: HttpService, private router: Router, private cdr: ChangeDetectorRef, private websocketService: WebsocketService) { };

    ngOnInit(): void {
        this.currentPath = window.location.pathname;
        this.showFooter = environment.application.showFooter;
    }

    ngAfterViewInit(): void {
        this.subscriptions.push(this.httpService.getServerState().subscribe((serverState: ServerState) => {
            this.initialServerState = serverState;
            this.fetchListing(this.currentPath);
        }));
    }

    ngOnDestroy(): void {
        for (const subscription of this.subscriptions) {
            subscription.unsubscribe();
        }
    }

    private fetchListing(path: string): void {
        this.subscriptions.push(
            this.httpService.getListing(path, this.currentSort).subscribe(
                (listing: IListing) => {
                    setTimeout(() => {
                        this.listing = new Listing(listing);
    
                        // ✅ Pull sort from the server response if present
                        this.currentSort = this.listing.sortOption ?? 'name-asc';
                        this.cdr.detectChanges();
                    });
                },
                (error) => {
                    console.error(`❌ Failed to fetch listing for path "${path}"`, error);
                    // You can also display a UI message or toast here
                }
            )
        );
    }

    folderClicked(folder: IFolder): void {
        this.websocketService.sendMetadataUpdate([{
            action: 'increment',
            target: 'views',
            type: 'folder',
            fullname: folder.fullname,
            homePath: this.currentPath
        },{
            action: 'set',
            target: 'lastViewed',
            value: new Date().toISOString(),
            type: 'folder',
            fullname: folder.fullname,
            homePath: this.currentPath
        }]);
        
        const currentHref = location.href + (location.href.charAt(location.href.length - 1) === '/' ? '' : '/');
        let encodedFolderName = encodeURIComponent(folder.name)
        // Manually encode additional problematic characters
        encodedFolderName = encodedFolderName
            .replace(/\(/g, '%28') // Encode (
            .replace(/\)/g, '%29') // Encode )
            .replace(/!/g, '%21')  // Encode !
            .replace(/~/g, '%7E')  // Encode ~
            .replace(/\*/g, '%2A') // Encode *
            .replace(/'/g, '%27')  // Encode '
            .replace(/"/g, '%22')  // Encode "
            .replace(/;/g, '%3B')  // Encode ;
            .replace(/:/g, '%3A')  // Encode :
            .replace(/@/g, '%40')  // Encode @
            .replace(/&/g, '%26')  // Encode &
            .replace(/=/g, '%3D')  // Encode =
            .replace(/\+/g, '%2B') // Encode +
            .replace(/\$/g, '%24') // Encode $
            .replace(/,/g, '%2C')  // Encode ,
            .replace(/\?/g, '%3F') // Encode ?
            .replace(/#/g, '%23')  // Encode #
            .replace(/\[/g, '%5B') // Encode [
            .replace(/\]/g, '%5D') // Encode ]
            .replace(/ /g, '%20'); // Encode spaces (encodeURIComponent already does this, but keeping it for safety)

        location.href = currentHref + encodedFolderName;
    }

    imageClicked(image: IImage): void {
        this.imageToOpenGallery = image;
        this.galleryActive = true;
    }

    onGalleryClose(): void {
        this.galleryActive = false;
    }

    pathClicked(path: Path): void {
        location.href = path.url;
    }

    logout(): void {        
        const sub = this.httpService.logout().subscribe(() => {
            sub.unsubscribe();
            this.router.navigate(['login']);
        });
    }

    upload(upload: IUploadAction): void {
        if (upload.path != null) {
            upload.path = this.listing.path + (this.listing.path === '/' ? '' : '/') + upload.path
        } else {
            upload.path = this.listing.path
        }
        this.uploadAction = upload
        this.uploadDialogActive = true;
    }

    onUploadClose(): void {
        this.uploadDialogActive = false;
    }

    newFolder(): void {
        this.newFolderDialogActive = true;
    }

    onNewFolderClose(): void {
        this.newFolderDialogActive = false;
    }

    onNewFolderRequest(name: string): void {
        this.newFolderDialogActive = false;
        const sub = this.httpService.newFolder(this.currentPath, name).subscribe(() => {
            sub.unsubscribe();
            location.reload();
        });
    }

    onDeleteRequest(request: IListingItemDeleteRequest): void {
        if (confirm('Are you sure you want to delete this?')) {
            this.subscriptions.push(this.httpService.mediaDelete(this.listing.path, request).subscribe((folderHasFiles: boolean) => {
                if (folderHasFiles) {
                    location.reload(); //refresh
                } else {
                    location.href = '/';
                }
            }));
        }
    }

    onMoveRequest(request: IListingItemMoveRequest): void {
        console.log(`📤 Sending move request for ${request.name} from ${request.sourcePath} to ${request.destinationPath}`);
        
        this.subscriptions.push(this.httpService.moveResource(this.listing.path, request).subscribe({
            next: () => {
                console.log(`✅ Move successful: ${request.name}`);
                this.movedItem = request;  // 🔥 This will notify GridComponent
            },
            error: (err) => {
                console.error(`❌ Move failed for ${request.name}:`, err);
            }
        }));
    }

    handleSortChanged(newSort: string): void {
        this.currentSort = newSort;
        this.fetchListing(this.currentPath);
    }
}
