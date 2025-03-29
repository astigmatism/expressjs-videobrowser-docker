import { Injectable } from "@angular/core";
import { Observable, Observer, Subject } from 'rxjs';
import { AnonymousSubject } from 'rxjs/internal/Subject';
import { environment } from "src/environments/environment";
import { Message, MessageType, MetadataUpdatePayload } from "src/models/websockets";

const webSocketServerUrl = environment.apis.wsServer;

@Injectable({ providedIn: 'root' })
export class WebsocketService {
    private subject: AnonymousSubject<Message>;
    public messages$ = new Subject<Message>();

    private logMessages: string[] = [];
    private logStream$ = new Subject<string[]>();

    constructor() {
        const savedLogs = sessionStorage.getItem('serverLogs');
        if (savedLogs) {
            this.logMessages = JSON.parse(savedLogs);
            this.logStream$.next([...this.logMessages]);
        }
    
        this.subject = this.create(webSocketServerUrl);
    
        this.subject.subscribe({
            next: (msg: Message) => {
                console.log('🌐 Incoming WebSocket message:', msg);

                if (msg.command === MessageType.LOG && typeof msg.content === 'string') {
                    this.appendLogMessage(msg.content);
                }
    
                this.messages$.next(msg);
            },
            error: (err: unknown) => {
                console.error('WebSocket error:', err);
            },
            complete: () => {
                console.warn('WebSocket closed');
            }
        });
    }

    private create(url: string): AnonymousSubject<Message> {
        const ws = new WebSocket(url);

        const observable = new Observable<Message>((observer: Observer<Message>) => {
            ws.onmessage = (event: MessageEvent) => {
                try {
                    const data: Message = JSON.parse(event.data);
                    observer.next(data);
                } catch (err: unknown) {
                    console.error('❌ Failed to parse incoming WS message:', err);
                }
            };

            ws.onerror = (err: Event) => observer.error(err);
            ws.onclose = () => observer.complete();

            return () => ws.close();
        });

        const observer = {
            next: (data: Message) => {
                if (ws.readyState === WebSocket.OPEN) {
                    console.log('📤 Sent to WebSocket:', data);
                    ws.send(JSON.stringify(data));
                } else {
                    console.warn("⚠️ WebSocket not open. Message not sent:", data);
                }
            },
            error: () => {},
            complete: () => {}
        };

        return new AnonymousSubject<Message>(observer, observable);
    }

    public sendMetadataUpdate(payloads: MetadataUpdatePayload[]): void {
        const message: Message<MetadataUpdatePayload[]> = {
            source: 'client',
            command: MessageType.METADATA_UPDATE,
            content: payloads
        };
    
        this.subject.next(message);
    }

    public getLogs(): Observable<string[]> {
        return this.logStream$.asObservable();
    }

    private appendLogMessage(newLog: string): void {
        this.logMessages.unshift(newLog);
    
        if (this.logMessages.length > 500) {
            this.logMessages.pop();
        }
    
        // Save to sessionStorage
        sessionStorage.setItem('serverLogs', JSON.stringify(this.logMessages));
    
        // Emit a new copy
        this.logStream$.next([...this.logMessages]);
    }
}