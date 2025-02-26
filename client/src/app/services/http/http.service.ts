import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from 'src/environments/environment';
import { IListing } from 'src/models/listing';
import { Observable } from 'rxjs';
import { ISetThumbnailData } from 'src/models/thumbnail';
import { IListingItemDeleteRequest } from 'src/models/listing-item';

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

    getListing(path: string) {
        return this.httpClient.get<IListing>(environment.apis.httpServer + path);
    }

    setThumbnailFromSpriteSheetFrame(data: ISetThumbnailData): Observable<string> {
        return this.httpClient.post<string>(this.httpServer + environment.apis.thumbnails.set, data);
    }

    processFilesOnServer(): Observable<any> {
        return this.httpClient.post<string>(this.httpServer + environment.apis.application.processMedia, {});
    }

    fixedEncodeURIComponent(str: string): string {
        return encodeURIComponent(str).replace(/[!'()*]/g, function(c) {
            return '%' + c.charCodeAt(0).toString(16).toUpperCase();
        });
    }

    fileUpload(files: File[], path: string): Observable<any> {
        const formData = new FormData();

        files.forEach(file => {
            formData.append('file', file);  // Make sure key is 'file' instead of 'files[]'
        });
    
        formData.append('path', path);
    
        return this.httpClient.post<string>(this.httpServer + environment.apis.uploads, formData);
    }

    mediaDelete(path: string, request: IListingItemDeleteRequest): Observable<any> {
        return this.httpClient.post<string>(this.httpServer + environment.apis.deleteMedia, {
            'path': path,
            'name': request.name,
            'isFolder': request.isFolder
        });
    }

    newFolder(path: string, name: string): Observable<any> {
        return this.httpClient.post<string>(this.httpServer + environment.apis.newFolder, {
            'path': path,
            'name': name
        });
    }
}
