import { Component, EventEmitter, Input, OnChanges, OnInit, Output, SimpleChanges } from '@angular/core';
import { HttpService } from 'src/app/services/http/http.service';
import { WebsocketService } from 'src/app/services/web-sockets/web-sockets.service';
import { environment } from 'src/environments/environment';
import { IListing } from 'src/models/listing';
import { IListingItemMoveRequest } from 'src/models/listing-item';
import { Path } from 'src/models/path';
import { Message, MessageType } from 'src/models/websockets';

@Component({
    selector: 'app-header',
    templateUrl: './header.component.html',
    styleUrls: ['./header.component.scss']
})
export class HeaderComponent implements OnInit, OnChanges {

    @Input() set path (listingPath: string) {
        this.paths = Path.buildPathsFromListing(listingPath);
    }
    @Input() sortOption: string | undefined;
    @Input() initialMessage!: string;
    @Output() onPathClicked = new EventEmitter<Path>();
    @Output() onLogoutClicked = new EventEmitter<Path>();
    @Output() onUploadClicked = new EventEmitter<Path>();
    @Output() onNewFolderClicked = new EventEmitter<Path>();
    @Output() onMoveRequest = new EventEmitter<IListingItemMoveRequest>();
    @Output() onSortChanged = new EventEmitter<string>();

    public paths: Path[] = [];
    public message!: string;
    public showUpload = environment.application.showUpload;
    public showNewFolder = environment.application.showNewFolder;
    public currentSortOption = 'name-asc'; // Default sort
    public showSettings = false;
    public showLogDialog = false;

    constructor(private webSocketService: WebsocketService, private httpService: HttpService) {
        webSocketService.messages$.subscribe((message: Message) => {
            if (message.command === MessageType.LOG) {
                this.message = message.content;
            }
        });
    }

    ngOnInit(): void {
        this.message = this.initialMessage;
        if (this.sortOption && this.sortOption !== 'name-asc') {
            this.currentSortOption = this.sortOption;
        }
    }

    ngOnChanges(changes: SimpleChanges): void {
        if (changes['sortOption'] && changes['sortOption'].currentValue && changes['sortOption'].currentValue !== 'name-asc') {
            this.currentSortOption = changes['sortOption'].currentValue;
        }
    }

    pathClicked(path: Path): void {
        this.onPathClicked.emit(path);
    }

    processFilesOnServer(): void {
        
        this.httpService.processFilesOnServer().subscribe(() => {

        });
    }

    logout(event: MouseEvent): void {
        this.onLogoutClicked.emit();
        event.stopPropagation();
    }

    upload(): void {
        this.onUploadClicked.emit();
    }
    
    newFolder(): void {
        this.onNewFolderClicked.emit();
    }

    toggleLogDialog(event: MouseEvent): void {
        this.showLogDialog = !this.showLogDialog;
        this.showSettings = false; // 🔹 Collapse the settings menu
        event.stopPropagation();   // Optional: prevents bubbling in some cases
    }

    toggleSettingsDropdown(): void {
        this.showSettings = !this.showSettings;
    }

    clearMetadata(event: MouseEvent): void {
        const confirmed = window.confirm('Are you sure? This clears ALL server metadata including view counts, et al. This action cannot be undone.');

        if (!confirmed) return;

        this.httpService.clearMetadataAndCache().subscribe({
            next: (response) => {
                console.log(response.message);
                // Optionally show a toast or confirmation message here
            },
            error: (err) => {
                console.error('❌ Failed to clear metadata and cache', err);
                // Show a user-friendly error message if needed
            }
        });
        event.stopPropagation();
    }

    onDragOver(event: DragEvent): void {
        event.preventDefault(); // Required to allow dropping
    }
    

    // 🔹 Handle item dropped onto folder
    onDrop(event: DragEvent, path: Path): void {
        event.preventDefault();
        
        const data = event.dataTransfer?.getData('application/json');
        if (!data) return;

        const droppedItem = JSON.parse(data);

        console.log(`📂 Item dropped onto path: ${path.url}`, droppedItem);

        const request: IListingItemMoveRequest = {
            sourcePath: droppedItem.logicalPath,
            destinationPath: path.url,
            name: droppedItem.fullname,
            isFolder: droppedItem.type === 'folder'
        };

        this.onMoveRequest.emit(request);
    }

    sortChanged(event: Event): void {
        const selectElement = event.target as HTMLSelectElement;
        this.currentSortOption = selectElement.value;
        this.onSortChanged.emit(this.currentSortOption);
    }
}
