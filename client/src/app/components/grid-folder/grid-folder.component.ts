import { Component, Input, OnInit, Output } from '@angular/core';
import { IFolder } from 'src/models/folder';
import { EventEmitter } from '@angular/core';
import { IListingItem, IListingItemDeleteRequest } from 'src/models/listing-item';
import { environment } from 'src/environments/environment';

@Component({
    selector: 'app-grid-folder',
    templateUrl: './grid-folder.component.html',
    styleUrls: ['./grid-folder.component.scss']
})
export class GridFolderComponent implements OnInit {

    @Input() listingItem!: IListingItem;
    @Output() onFolderClick = new EventEmitter<IFolder>();
    @Output() onDeleteRequest = new EventEmitter<IListingItemDeleteRequest>();

    public folder!: IFolder;
    public mouseOver = false;
    public canDelete = environment.application.canDelete;

    constructor() { }

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
}
