import { AfterViewInit, Component, HostListener, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { HttpService } from 'src/app/services/http/http.service';
import { environment } from 'src/environments/environment';
import { IFolder } from 'src/models/folder';
import { IImage, Image as xImage } from 'src/models/image';
import { IListing, Listing } from 'src/models/listing';
import { IListingItemDeleteRequest } from 'src/models/listing-item';
import { Path } from 'src/models/path';
import { ServerState } from 'src/models/server';

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
    private currentPath!: string;
    private subscriptions: Subscription[] = [];
    public imageToOpenGallery!: IImage;
    public galleryActive = false;
    public uploadDialogActive = false;
    public newFolderDialogActive = false;
    public initialServerState!: ServerState;
    public showFooter = false;

    constructor(private httpService: HttpService, private router: Router) { };

    ngOnInit(): void {
        this.currentPath = this.router.url;
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
        this.subscriptions.push(this.httpService.getListing(path).subscribe((listing: IListing) => {
            this.listing = new Listing(listing);
        }));
    }

    folderClicked(folder: IFolder): void {
        const currentHref = location.href + (location.href.charAt(location.href.length - 1) === '/' ? '' : '/');
        location.href = currentHref + encodeURIComponent(folder.name);
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

    upload(): void {
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
}
