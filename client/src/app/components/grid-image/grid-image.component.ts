import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { HttpService } from 'src/app/services/http/http.service';
import { environment } from 'src/environments/environment';
import { IImage } from 'src/models/image';
import { IListingItem, IListingItemDeleteRequest } from 'src/models/listing-item';
import * as moment from 'moment';
import { WebsocketService } from 'src/app/services/web-sockets/web-sockets.service';

@Component({
    selector: 'app-grid-image',
    templateUrl: './grid-image.component.html',
    styleUrls: ['./grid-image.component.scss']
})
export class GridImageComponent implements OnInit {

    @Input() listingItem!: IListingItem;
    @Output() onImageClick = new EventEmitter<IImage>();
    @Output() onDeleteRequest = new EventEmitter<IListingItemDeleteRequest>();

    public image!: IImage;
    public thumbnailUrl!: string;
    public maxHeight = environment.grid.previewMaxHeight;
    public mouseOver = false;
    public canDelete = environment.application.canDelete;
    public showMetadata = false;

    constructor(private httpService: HttpService, private websocketService: WebsocketService) { }

    ngOnInit(): void {
        this.image = this.listingItem as IImage;
        this.thumbnailUrl = environment.apis.httpServer + '/' + encodeURIComponent(this.image.thumbnail.url);
    }

    onMouseOver(event: MouseEvent): void {
        this.mouseOver = true;
        this.maxHeight = 1000; // arbitrarily large
    }

    onMouseOut(event: MouseEvent): void {
        this.mouseOver = false;
        this.maxHeight = environment.grid.previewMaxHeight;
    }

    onClick(event: MouseEvent): void {
        this.onImageClick.emit(this.image);
    }

    deleteRequest(event: MouseEvent): void {
        if (!this.canDelete) return;
        const request: IListingItemDeleteRequest = {
            name: this.image.fullname,
            isFolder: false
        };
        this.onDeleteRequest.emit(request);
        event.stopPropagation();
    }

    onDragStart(event: DragEvent): void {
        if (event.dataTransfer) {
            event.dataTransfer.setData('application/json', JSON.stringify({
                type: 'image',
                fullname: this.image.fullname,
                logicalPath: this.image.logicalPath
            }));
        }
        console.log(`📦 Drag started: ${this.image.name}`);
    }

    onSpiceClick(event: MouseEvent): void {
        this.websocketService.sendMetadataUpdate([{
            action: 'increment',
            target: 'spice',
            type: 'image',
            fullname: this.image.fullname,
            homePath: this.image.homePath
        }]);
        if (this.image.metadata) {
            this.image.metadata.spice = (this.image.metadata.spice ?? 0) + 1;
        }
        event.stopPropagation();
    }

    getCreatedAgo(): string {
        return moment(this.image.metadata?.createdAt).fromNow(); // e.g., "12 days ago"
    }
    
    getLastOpenedAgo(): string {
        return moment(this.image.metadata?.lastViewed).fromNow();
    }
}