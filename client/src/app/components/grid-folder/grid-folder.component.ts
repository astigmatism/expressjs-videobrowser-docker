import { Component, Input, OnInit, Output, EventEmitter } from '@angular/core';
import { IFolder } from 'src/models/folder';
import { IListingItem, IListingItemDeleteRequest, IListingItemMoveRequest } from 'src/models/listing-item';
import { environment } from 'src/environments/environment';
import { HttpService } from 'src/app/services/http/http.service';
import * as moment from 'moment';
import { Path } from 'src/models/path';
import { IUploadAction, UploadType } from 'src/models/uploads';
import { InputModalConfig } from 'src/models/input-model';

@Component({
    selector: 'app-grid-folder',
    templateUrl: './grid-folder.component.html',
    styleUrls: ['./grid-folder.component.scss']
})
export class GridFolderComponent implements OnInit {

    @Input() listingItem!: IListingItem;
    @Output() onUploadClicked = new EventEmitter<IUploadAction>();
    @Output() onFolderClick = new EventEmitter<IFolder>();
    @Output() onDeleteRequest = new EventEmitter<IListingItemDeleteRequest>();
    @Output() onMoveRequest = new EventEmitter<IListingItemMoveRequest>();
    @Output() onRenameClickedRequest = new EventEmitter<InputModalConfig>();

    public folder!: IFolder;
    public mouseOver = false;
    public canDelete = environment.application.canDelete;
    public showMetadata = false;

    constructor(private httpService: HttpService) { }

    ngOnInit(): void {
        this.folder = this.listingItem as IFolder;
    }

    folderClicked(folder: IFolder): void {
        this.onFolderClick.emit(folder);
    }

    deleteRequest(event: MouseEvent): void {
        if (!this.canDelete) return;
        const request: IListingItemDeleteRequest = {
            name: this.folder.name,
            isFolder: true
        }
        this.onDeleteRequest.emit(request);
        event.stopPropagation();
    }

    // 🔹 Handle drag start (set transfer data)
    onDragStart(event: DragEvent): void {
        event.dataTransfer?.setData('application/json', JSON.stringify({ 
            type: 'folder',
            fullname: this.folder.fullname,
            logicalPath: this.folder.logicalPath
        }));
        console.log(`📦 Dragging folder: ${this.folder.name}`);
    }

    // 🔹 Allow dropping (prevent default behavior)
    onDragOver(event: DragEvent): void {
        event.preventDefault();
    }

    // 🔹 Highlight drop target when an item enters
    onDragEnter(event: DragEvent): void {
        event.preventDefault();
        (event.target as HTMLElement).classList.add('droppable');
    }

    // 🔹 Remove highlight when an item leaves
    onDragLeave(event: DragEvent): void {
        (event.target as HTMLElement).classList.remove('droppable');
    }

    // 🔹 Handle item dropped onto folder
    onDrop(event: DragEvent): void {
        event.preventDefault();
        
        const data = event.dataTransfer?.getData('application/json');
        if (!data) return;

        const droppedItem = JSON.parse(data);
        
        // ✅ Prevent dropping onto itself
        if (droppedItem.fullname === this.folder.fullname) {
            console.log(`🚫 Cannot move folder "${droppedItem.fullname}" into itself.`);
            return;
        }

        console.log(`📂 Item dropped onto folder: ${this.folder.fullname}`, droppedItem);

        const request: IListingItemMoveRequest = {
            sourcePath: droppedItem.logicalPath,
            destinationPath: this.folder.logicalPath,
            name: droppedItem.fullname,
            isFolder: droppedItem.type === 'folder'
        };

        this.onMoveRequest.emit(request);
    }

    getCreatedAgo(): string {
        return moment(this.folder.metadata?.createdAt).fromNow(); // e.g., "12 days ago"
    }
    
    getLastOpenedAgo(): string {
        return moment(this.folder.metadata?.lastViewed).fromNow();
    }

    upload(event: MouseEvent): void {
        this.onUploadClicked.emit({
            path: this.folder.name,
            type: UploadType.FOLDER_THUMBMAIL
        });
        event.stopPropagation();
    }

    removeIcon(event: MouseEvent): void {
        const sub = this.httpService.removeFolderThumbnail(this.folder.logicalPath).subscribe(() => {
            sub.unsubscribe();
            location.reload();
        });
        event.stopPropagation();
    }

    onRenameClick(event: MouseEvent): void {
        this.onRenameClickedRequest.emit({
            label: 'New Name',
            placeholder: '',
            buttonLabel: 'Rename',
            emoji: '📁',
            onSubmit: (value: string) => {
                const sub = this.httpService.renameResource(this.folder.logicalPath, value).subscribe(() => {
                    sub.unsubscribe();
                    location.reload();
                });
            }
        });
    }
}