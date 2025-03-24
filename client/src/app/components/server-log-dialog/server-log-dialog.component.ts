import { Component, OnDestroy, OnInit, ElementRef, Renderer2, HostListener, Output, EventEmitter } from '@angular/core';
import { WebsocketService } from 'src/app/services/web-sockets/web-sockets.service';
import { Subscription } from 'rxjs';

@Component({
    selector: 'app-server-log-dialog',
    templateUrl: './server-log-dialog.component.html',
    styleUrls: ['./server-log-dialog.component.scss']
})
export class ServerLogDialogComponent implements OnInit, OnDestroy {
    public logs: string[] = [];
    private sub!: Subscription;

    @Output() close = new EventEmitter<void>();

    private isDragging = false;
    private offsetX = 0;
    private offsetY = 0;

    constructor(private webSocketService: WebsocketService, private el: ElementRef, private renderer: Renderer2) {}

    ngOnInit(): void {
        this.sub = this.webSocketService.getLogs().subscribe((logArray) => {
            this.logs = logArray.slice().reverse(); // newest first
        });

        const savedLogs = sessionStorage.getItem('serverLogs');
        if (savedLogs) {
            this.logs = JSON.parse(savedLogs).slice().reverse();
        }

        // Center on load
        const native = this.el.nativeElement.querySelector('.log-dialog');
        if (native) {
            this.renderer.setStyle(native, 'top', '50%');
            this.renderer.setStyle(native, 'left', '50%');
            this.renderer.setStyle(native, 'transform', 'translate(-50%, -50%)');
        }
    }

    ngOnDestroy(): void {
        this.sub.unsubscribe();
    }

    closeDialog(): void {
        this.close.emit();
    }

    onDragStart(event: MouseEvent) {
        this.isDragging = true;
        this.offsetX = event.clientX;
        this.offsetY = event.clientY;
    }

    @HostListener('document:mousemove', ['$event'])
    onDragMove(event: MouseEvent) {
        if (!this.isDragging) return;

        const dialog = this.el.nativeElement.querySelector('.log-dialog');
        if (!dialog) return;

        const rect = dialog.getBoundingClientRect();
        const dx = event.clientX - this.offsetX;
        const dy = event.clientY - this.offsetY;

        this.offsetX = event.clientX;
        this.offsetY = event.clientY;

        this.renderer.setStyle(dialog, 'top', `${rect.top + dy}px`);
        this.renderer.setStyle(dialog, 'left', `${rect.left + dx}px`);
        this.renderer.setStyle(dialog, 'transform', 'none');
    }

    @HostListener('document:mouseup')
    onDragEnd() {
        this.isDragging = false;
    }
}