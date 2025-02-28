import { Component, EventEmitter, Input, OnDestroy, OnInit, Output } from '@angular/core';
import { Subscription } from 'rxjs';
import { HttpEventType } from '@angular/common/http';
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
    private activeUploadSubscription: Subscription | null = null;

    uploading: boolean = false;
    uploadProgress: number = 0;
    totalBytes: number = 0;
    uploadedBytes: number = 0;
    currentFileIndex: number = 0;
    totalFiles: number = 0;
    uploadCancelled: boolean = false;
    files: File[] = [];

    constructor(private httpService: HttpService) {}

    ngOnInit(): void {}

    ngOnDestroy(): void {
        this.subscriptions.forEach((subscription: Subscription) => subscription.unsubscribe());
    }

    onBackgroundClick(event: MouseEvent): void {
        if (!this.uploading) {
            this.closeUploadRequest.emit(true);
        }
    }

    onDialogClick(event: MouseEvent): void {
        event.stopPropagation();
    }

    onFilesSelected(event: any): void {
        const fileList: FileList = event.target.files;
        if (fileList.length === 0) {
            this.closeUploadRequest.emit(true);
            return;
        }

        this.files = Array.from(fileList);
        this.onFileUpload.emit(this.files);

        this.uploading = true;
        this.uploadCancelled = false;
        this.currentFileIndex = 0;
        this.totalFiles = this.files.length;
        this.uploadProgress = 0;

        // Calculate total bytes for all files
        this.totalBytes = this.files.reduce((sum, file) => sum + file.size, 0);
        this.uploadedBytes = 0;

        console.log(`[${new Date().toISOString()}] 🚀 Starting upload process for ${this.totalFiles} files.`);
        this.uploadNextFile();
    }

    cancelUpload(): void {
        if (this.activeUploadSubscription) {
            this.activeUploadSubscription.unsubscribe();
            this.activeUploadSubscription = null;
        }

        console.log(`[${new Date().toISOString()}] ❌ Upload cancelled.`);
        this.uploading = false;
        this.uploadCancelled = true;
        this.uploadProgress = 0;
        this.uploadedBytes = 0;
        this.totalBytes = 0;
        this.closeUploadRequest.emit(true);
    }

    private uploadNextFile(): void {
        if (this.uploadCancelled || this.currentFileIndex >= this.files.length) {
            console.log(`[${new Date().toISOString()}] 🚨 Uploading finished or cancelled. Closing modal.`);
            this.uploading = false;
            this.closeUploadRequest.emit(true);
            return;
        }

        const currentFile = this.files[this.currentFileIndex];
        console.log(`[${new Date().toISOString()}] 📂 Starting upload for: ${currentFile.name}`);

        this.activeUploadSubscription = this.httpService.fileUpload([currentFile], this.path).subscribe({
            next: (event) => {
                if (this.uploadCancelled) {
                    console.log(`[${new Date().toISOString()}] ⚠️ Upload cancelled at file: ${currentFile.name}`);
                    return;
                }
                if (event.type === HttpEventType.UploadProgress) {
                    this.uploadProgress = Math.round(((this.uploadedBytes + event.loaded) / this.totalBytes) * 100);
                    console.log(`[${new Date().toISOString()}] 📊 Progress: ${this.uploadProgress}% for file: ${currentFile.name}`);
                } else if (event.type === HttpEventType.Response) {
                    console.log(`[${new Date().toISOString()}] ✅ Upload complete for: ${currentFile.name}`);
                    this.uploadedBytes += currentFile.size;
                    this.currentFileIndex++;

                    if (this.currentFileIndex >= this.files.length) {
                        console.log(`[${new Date().toISOString()}] 🎉 All files uploaded! Triggering refresh.`);
                        this.uploading = false;
                        this.closeUploadRequest.emit(true);
                        // this.refreshPage() // or this
                    } else {
                        this.uploadNextFile();
                    }
                }
            },
            error: (err) => {
                console.error(`[${new Date().toISOString()}] ❌ Upload failed for ${currentFile.name}:`, err);
                this.uploading = false;
                this.uploadProgress = 0;
                alert(`Upload failed for ${currentFile.name}. Please try again.`);
            }
        });

        this.subscriptions.push(this.activeUploadSubscription);
    }

    private refreshPage(): void {
        console.log(`[${new Date().toISOString()}] 🔄 Refreshing page.`);
        setTimeout(() => {
            window.location.reload();
        }, 500);
    }
}