import { Component, Input, OnChanges, OnInit, SimpleChanges, ChangeDetectorRef } from '@angular/core';
import { WebsocketService } from 'src/app/services/web-sockets/web-sockets.service';
import { Message, MessageType } from 'src/models/websockets';

@Component({
    selector: 'app-footer',
    templateUrl: './footer.component.html',
    styleUrls: ['./footer.component.scss']
})
export class FooterComponent implements OnInit {


    public showLogDialog = false;
    public isProcessing: boolean = false;
    public processingStage: string | null = null
    public processingQueue: string[] = [];
    public currentProcessingFile: string | null = null;
    public conversionPercent: number | null = null;
    public conversionETA: string | null = null;

    constructor(private webSocketService: WebsocketService, private cdRef: ChangeDetectorRef) {
        webSocketService.messages$.subscribe((message: Message) => {
            switch (message.command) {
        
                case MessageType.QUEUE_UPDATE:
                    console.log(message.content)
                    this.isProcessing = message.content.isProcessing;
                    this.processingStage = message.content.processingStage;
                    this.currentProcessingFile = message.content.currentProcessingFile;
                    this.processingQueue = message.content.queue || [];
                    this.persistSessionState();
                    break;
        
                case MessageType.CONVERSION_PROGRESS:
                    this.conversionPercent = message.content.percent === '' ? null : message.content.percent;
                    this.conversionETA = message.content.eta === '' ? null : message.content.eta;
                    this.persistSessionState();
                    break;
            }
            this.cdRef.detectChanges();
        });
    }

    private persistSessionState(): void {
        sessionStorage.setItem('processingState', JSON.stringify({
            isProcessing: this.isProcessing,
            processingStage: this.processingStage,
            currentProcessingFile: this.currentProcessingFile,
            processingQueue: this.processingQueue,
            conversionPercent: this.conversionPercent,
            conversionETA: this.conversionETA
        }));
    }

    ngOnInit(): void {
        const saved = sessionStorage.getItem('processingState');
        if (saved) {
            try {
                const state = JSON.parse(saved);
                this.isProcessing = state.isProcessing;
                this.processingStage = state.processingStage;
                this.currentProcessingFile = state.currentProcessingFile;
                this.processingQueue = state.processingQueue || [];
                this.conversionPercent = state.conversionPercent;
                this.conversionETA = state.conversionETA;
            } catch (e) {
                console.warn('Failed to parse processing state from sessionStorage', e);
            }
        }
    }

    toggleLogDialog(event: MouseEvent): void {
        this.showLogDialog = !this.showLogDialog;
        event.stopPropagation();   // Optional: prevents bubbling in some cases
    }

    get currentProcessingFileTooltip(): string {
        const filename = this.currentProcessingFile ?? 'Processing...';
        const percent = this.conversionPercent?.toFixed(1) ?? '0.0';
        const eta = this.conversionETA ?? 'unknown';

        let tooltip = `${filename}\n${percent}% complete — ETA: ${eta}`;

        if (this.processingQueue.length > 0) {
            tooltip += `\n\nQueued Items:\n- ` + this.processingQueue.join('\n- ');
        }

        return tooltip;
    }

    public get formattedConversionETA(): string | null {
        if (!this.conversionETA) return null;
    
        const match = this.conversionETA.match(/(?:(\d+)h)?(?:(\d+)m)?(?:(\d+)s)?/);
        if (!match) return this.conversionETA;
    
        const hours = String(match[1] ?? '0').padStart(2, '0');
        const minutes = String(match[2] ?? '0').padStart(2, '0');
        const seconds = String(match[3] ?? '0').padStart(2, '0');
    
        return `${hours}:${minutes}:${seconds}`;
    }

    public get hasProgressingQueue(): boolean {
        return this.processingQueue.length > 0;
    }

}