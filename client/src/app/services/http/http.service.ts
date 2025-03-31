import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from 'src/environments/environment';
import { IListing } from 'src/models/listing';
import { Observable } from 'rxjs';
import { ISetThumbnailData } from 'src/models/thumbnail';
import { IListingItemDeleteRequest, IListingItemMoveRequest } from 'src/models/listing-item';
import { UploadType } from 'src/models/uploads';

@Injectable({
    providedIn: 'root'
})
export class HttpService {

    private httpServer = environment.apis.httpServer;

    constructor(private httpClient: HttpClient) { }

    login(password: string): Observable<any> {
        return this.httpClient.post<string>(this.httpServer + environment.apis.application.login, {
            'username': '_',
            'password': password
        });
    }

    logout(): Observable<any> {
        return this.httpClient.post<string>(this.httpServer + environment.apis.application.logout, {});
    }

    getServerState(): Observable<any> {
        return this.httpClient.post<string>(this.httpServer + environment.apis.application.state, {});
    }

    getListing(path: string, sort?: string) {
        let url = `${environment.apis.httpServer}${path}`;
    
        if (sort) {
            const encodedSort = encodeURIComponent(sort);
            url += `?sort=${encodedSort}`;
        }
    
        return this.httpClient.get<IListing>(url);
    }

    setThumbnailFromSpriteSheetFrame(data: ISetThumbnailData): Observable<string> {
        return this.httpClient.post<string>(this.httpServer + environment.apis.thumbnails.set, data);
    }

    processFilesOnServer(): Observable<any> {
        return this.httpClient.post<string>(this.httpServer + environment.apis.application.processMedia, {});
    }

    clearMetadataAndCache() {
        const url = `${environment.apis.httpServer}/clear-metadata`;
        return this.httpClient.post<{ message: string }>(url, {});
    }

    fixedEncodeURIComponent(str: string): string {
        return encodeURIComponent(str).replace(/[!'()*]/g, function(c) {
            return '%' + c.charCodeAt(0).toString(16).toUpperCase();
        });
    }

    fileUpload(files: File[], path: string, uploadType: UploadType): Observable<any> {
        const formData = new FormData();
    
        files.forEach(file => {
            formData.append('file', file);
        });
    
        formData.append('path', path);
        formData.append('uploadType', uploadType);
    
        return this.httpClient.post<string>(this.httpServer + environment.apis.uploads, formData, {
            observe: 'events',       // 🔥 Enables progress updates
            reportProgress: true     // 🔥 Tells Angular to track upload progress
        });
    }

    mediaDelete(path: string, request: IListingItemDeleteRequest): Observable<any> {
        return this.httpClient.post<string>(this.httpServer + environment.apis.deleteMedia, {
            'path': path,
            'name': request.name,
            'isFolder': request.isFolder
        });
    }

    removeFolderThumbnail(path: string): Observable<any> {
        return this.httpClient.post<string>(this.httpServer + environment.apis.thumbnails.removeFolder, {
            'path': path
        });
    }

    newFolder(path: string, name: string): Observable<any> {
        return this.httpClient.post<string>(this.httpServer + environment.apis.newFolder, {
            'path': path,
            'name': name
        });
    }

    renameResource(path: string, newName: string): Observable<any> {
        return this.httpClient.post<string>(this.httpServer + environment.apis.renameResource, {
            'path': path,
            'newName': newName
        });
    }

    /**
     * 🔥 Move a resource (folder, image, or video) to a new location.
     * @param droppedItem The dragged resource containing details (`name`, `path`, `type`).
     * @param destinationFolder The target folder where the resource should be moved.
     * @returns Observable for tracking request.
     */
    moveResource(path: string, request: IListingItemMoveRequest): Observable<any> {
        const requestPayload = {
            operatingPath: path, // Original path of the resource
            sourcePath: request.sourcePath,
            destinationPath: request.destinationPath,
            name: request.name,
            isFolder: request.isFolder
        };
        console.log(`[${new Date().toISOString()}] 🚀 Sending move request to server:`, requestPayload);

        return this.httpClient.post<string>(this.httpServer + environment.apis.moveResource, requestPayload);
    }
}
