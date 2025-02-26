import { Component, EventEmitter, Input, OnDestroy, OnInit, Output } from '@angular/core';
import { Subscription } from 'rxjs';
import { HttpService } from 'src/app/services/http/http.service';

@Component({
    selector: 'app-upload',
    templateUrl: './upload.component.html',
    styleUrls: ['./upload.component.scss']
})
export class UploadComponent implements OnInit, OnDestroy {

    @Input() path!: string;
    @Output() onFileUpload = new EventEmitter<File[]>();
    @Output() closeUploadRequest = new EventEmitter<boolean>();

    private subscriptions: Subscription[] = [];

    constructor(private httpService: HttpService) { }

    ngOnInit(): void { }

    ngOnDestroy(): void {
        this.subscriptions.forEach((subscription: Subscription) => subscription.unsubscribe());
    }

    onBackgroundClick(event: MouseEvent): void {
        this.closeUploadRequest.emit(true);
    }

    onDialogClick(event: MouseEvent): void {
        event.stopPropagation();
    }

    onFilesSelected(event: any): void {
        const files: FileList = event.target.files;
        if (files.length === 0) {
            this.closeUploadRequest.emit(true);
            return;
        }

        const fileArray = Array.from(files);
        this.onFileUpload.emit(fileArray);

        this.subscriptions.push(this.httpService.fileUpload(fileArray, this.path).subscribe(() => {
            location.reload();
        }));
    }
}