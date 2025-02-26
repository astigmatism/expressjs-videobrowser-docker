import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { HttpService } from 'src/app/services/http/http.service';
import { WebsocketService } from 'src/app/services/web-sockets/web-sockets.service';
import { environment } from 'src/environments/environment';
import { IListing } from 'src/models/listing';
import { Path } from 'src/models/path';
import { Message, MessageType } from 'src/models/websockets';

@Component({
    selector: 'app-header',
    templateUrl: './header.component.html',
    styleUrls: ['./header.component.scss'],
    providers: [WebsocketService]
})
export class HeaderComponent implements OnInit {

    @Input() set path (listingPath: string) {
        this.paths = Path.buildPathsFromListing(listingPath);
    }
    @Input() initialMessage!: string;
    @Output() onPathClicked = new EventEmitter<Path>();
    @Output() onLogoutClicked = new EventEmitter<Path>();
    @Output() onUploadClicked = new EventEmitter<Path>();
    @Output() onNewFolderClicked = new EventEmitter<Path>();

    public paths: Path[] = [];
    public message!: string;
    public showUpload = environment.application.showUpload;
    public showNewFolder = environment.application.showNewFolder;

    constructor(private webSocketService: WebsocketService, private httpService: HttpService) { 
        webSocketService.messages.subscribe((message: Message) => {
            if (message.command === MessageType.LOG) {
                this.message = message.content;
            }
        });
    }

    ngOnInit(): void {
        this.message = this.initialMessage;
    }

    pathClicked(path: Path): void {
        this.onPathClicked.emit(path);
    }

    processFilesOnServer(): void {
        
        this.httpService.processFilesOnServer().subscribe(() => {

        });
    }

    logout(): void {
        this.onLogoutClicked.emit();
    }

    upload(): void {
        this.onUploadClicked.emit();
    }
    
    newFolder(): void {
        this.onNewFolderClicked.emit();
    }
}
