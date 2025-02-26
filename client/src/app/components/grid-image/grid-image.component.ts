import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { HttpService } from 'src/app/services/http/http.service';
import { environment } from 'src/environments/environment';
import { IImage } from 'src/models/image';
import { IListingItem, IListingItemDeleteRequest } from 'src/models/listing-item';

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

    constructor(private httpService: HttpService) { }

    ngOnInit(): void {
        this.image = this.listingItem as IImage;
        this.thumbnailUrl = environment.apis.httpServer + '/' + encodeURIComponent(this.image.thumbnail.url);
    }

    onMouseOver(event: MouseEvent): void {
        this.mouseOver = true;
        this.maxHeight = 1000; // abitarily large
    }

    onMouseOut(event: MouseEvent): void {
        this.mouseOver = false;
        this.maxHeight = environment.grid.previewMaxHeight
    }

    onClick(event: MouseEvent): void {
        this.onImageClick.emit(this.image);
    }

    deleteRequest(event: MouseEvent): void {
        if (!this.canDelete) return;
        const request: IListingItemDeleteRequest = {
            name: this.image.fullname,
            isFolder: false
        }
        this.onDeleteRequest.emit(request);
        event.stopPropagation();
    }
}
