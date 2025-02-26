import { Component, Input, OnInit } from '@angular/core';
import { Message, MessageType } from 'src/models/websockets';
import { WebsocketService } from '../../services/web-sockets/web-sockets.service';

@Component({
    selector: 'app-footer',
    templateUrl: './footer.component.html',
    styleUrls: ['./footer.component.scss'],
    providers: [WebsocketService]
})
export class FooterComponent implements OnInit {

    @Input() initialMessage!: string;

    public message!: string;

    constructor(private webSocketService: WebsocketService) { 
        webSocketService.messages.subscribe((message: Message) => {
            if (message.command === MessageType.LOG) {
                this.message = message.content;
            }
        });
    }

    ngOnInit(): void {

        this.message = this.initialMessage;
    }

}
