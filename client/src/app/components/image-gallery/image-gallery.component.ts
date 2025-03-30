import { Component, Input, OnInit, HostListener, EventEmitter, Output, ElementRef, ViewChild } from '@angular/core';
import { WebsocketService } from 'src/app/services/web-sockets/web-sockets.service';
import { environment } from 'src/environments/environment';
import { IImage } from 'src/models/image';

@Component({
    selector: 'app-image-gallery',
    templateUrl: './image-gallery.component.html',
    styleUrls: ['./image-gallery.component.scss']
})
export class ImageGalleryComponent implements OnInit {
    @Input() path!: string;
    @Input() images!: IImage[];
    @Input() set showImage(image: IImage) {
        this.currentImageIndex = this.images.findIndex((item: IImage) => item.name === image.name);
        this.setGalleryImage();
    }
    @Output() closeGalleryRequest = new EventEmitter<void>();

    @ViewChild('imageContainer', { static: false }) imageContainer!: ElementRef;

    @HostListener('window:keydown.q', ['$event']) KeyDownKeyQ(event: KeyboardEvent) { this.closeGallery(); }
    @HostListener('window:keydown.arrowleft', ['$event']) KeyDownArrowLeft(event: KeyboardEvent) { this.previousImage(); event.stopPropagation(); }
    @HostListener('window:keydown.arrowright', ['$event']) KeyDownArrowRight(event: KeyboardEvent) { this.nextImage(); event.stopPropagation(); }
    @HostListener('window:keydown.space', ['$event']) Space(event: KeyboardEvent) { this.toggleSlideShow(); event.stopPropagation(); }
    @HostListener('window:keydown.arrowup', ['$event'])
    KeyDownArrowUp(event: KeyboardEvent) {
        this.showControls(); // Keep controls visible
        this.slideShowIntervalInMilliseconds = Math.max(500, this.slideShowIntervalInMilliseconds - 500); // Lower bound

        if (this.slideShowActive) {
            this.stopSlideShow();
            this.startSlideShow();
        }
        event.stopPropagation();
    }

    @HostListener('window:keydown.arrowdown', ['$event'])
    KeyDownArrowDown(event: KeyboardEvent) {
        this.showControls(); // Keep controls visible
        this.slideShowIntervalInMilliseconds = Math.min(10000, this.slideShowIntervalInMilliseconds + 500); // Upper bound

        if (this.slideShowActive) {
            this.stopSlideShow();
            this.startSlideShow();
        }
        event.stopPropagation();
    }

    @HostListener('wheel', ['$event']) onMouseWheel(event: WheelEvent) {
        event.preventDefault();
        this.adjustZoom(event.deltaY);
    }

    @HostListener('mousedown', ['$event']) onMouseDown(event: MouseEvent) {
        this.isDragging = true;
        this.lastMouseX = event.clientX;
        this.lastMouseY = event.clientY;
    }

    @HostListener('mouseup') onMouseUp() { this.isDragging = false; }

    @HostListener('mousemove', ['$event']) onMouseMove(event: MouseEvent) {
        if (this.isDragging) {
            const deltaX = event.clientX - this.lastMouseX;
            const deltaY = event.clientY - this.lastMouseY;

            this.imagePositionX += deltaX / this.imageScale;  // Adjust based on zoom level
            this.imagePositionY += deltaY / this.imageScale;

            this.lastMouseX = event.clientX;
            this.lastMouseY = event.clientY;
        }
        else {
            this.showControls();
        }
    }

    @HostListener('window:keydown.f', ['$event']) toggleFitFill(event: KeyboardEvent) {
        event.preventDefault();
        this.isFillMode = !this.isFillMode;
        this.updateImageDisplay();
    }

    public imageScale = 1;
    public minZoom = 0.5;
    public maxZoom = 3;
    public currentImageIndex = 0;
    public imageUrl!: string;
    public imagePositionX = 0;
    public imagePositionY = 0;
    public slideShowActive = false;
    public slideShowIntervalInMilliseconds = 3000;
    public hideControls = false;
    public showImageLegend = environment.application.showImageLegend;

    private isDragging = false;
    private lastMouseX = 0;
    private lastMouseY = 0;
    private slideShowInterval!: ReturnType<typeof setInterval>;
    private countdownTimerToHideControls!: ReturnType<typeof setTimeout>;
    private countdownToHideControlsInMilliseconds = 2000;
    public isFillMode = false;

    constructor(private websocketService: WebsocketService) { }

    ngOnInit(): void { }

    previousImage(): void {
        this.currentImageIndex = (this.currentImageIndex - 1 + this.images.length) % this.images.length;
        this.setGalleryImage();
    }

    nextImage(): void {
        this.currentImageIndex = (this.currentImageIndex + 1) % this.images.length;
        this.setGalleryImage();
    }

    closeGallery(): void {
        clearInterval(this.slideShowInterval);
        clearTimeout(this.countdownTimerToHideControls);
        this.closeGalleryRequest.emit();
    }

    setGalleryImage(): void {
        const image = this.images[this.currentImageIndex]
        this.imageScale = 1;
        this.imagePositionX = 0;
        this.imagePositionY = 0;
        this.imageUrl = environment.apis.httpServer + '/' + image.url;
        this.updateImageDisplay();

        this.websocketService.sendMetadataUpdate([{
            action: 'increment',
            target: 'views',
            type: 'image',
            fullname: image.fullname,
            homePath: image.homePath
        },{
            action: 'set',
            target: 'lastViewed',
            value: new Date().toISOString(),
            type: 'image',
            fullname: image.fullname,
            homePath: image.homePath
        }]);
        if (image.metadata) {
            image.metadata.views = (image.metadata.views ?? 0) + 1;
        }
        if (image.metadata) {
            image.metadata.lastViewed = new Date().toISOString();
        }
    }

    toggleSlideShow(): void {
        this.slideShowActive ? this.stopSlideShow() : this.startSlideShow();
    }

    stopSlideShow(): void {
        this.slideShowActive = false;
        clearInterval(this.slideShowInterval);
    }

    startSlideShow(): void {
        this.slideShowActive = true;
        this.slideShowInterval = setInterval(() => { this.nextImage(); }, this.slideShowIntervalInMilliseconds);
    }

    adjustZoom(delta: number): void {
        const zoomFactor = delta > 0 ? -0.1 : 0.1;
        const newScale = this.imageScale + zoomFactor;
        
        if (newScale >= this.minZoom && newScale <= this.maxZoom) {
            this.imageScale = newScale;
        }
    }

    updateImageDisplay(): void {
        const container = this.imageContainer?.nativeElement;
        if (container) {
            container.classList.toggle('fill-mode', this.isFillMode);
        }
    }

    showControls(): void {
        clearTimeout(this.countdownTimerToHideControls); // Reset the timer
        this.hideControls = false; // Show controls immediately
    
        this.countdownTimerToHideControls = setTimeout(() => {
            this.hideControls = true; // Hide controls after the timeout
        }, this.countdownToHideControlsInMilliseconds);
    }
}