import { Component, Input, OnInit, HostListener, EventEmitter, Output } from '@angular/core';
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
    
    @HostListener('window:keydown.q', ['$event'])
    KeyDownKeyQ(event: KeyboardEvent) {
        this.closeGallery();
    }
    
    @HostListener('window:keydown.arrowleft', ['$event'])
    KeyDownArrowLeft(event: KeyboardEvent) {
        this.previousImage();
        event.stopPropagation();
    }
    
    @HostListener('window:keydown.arrowright', ['$event'])
    KeyDownArrowRight(event: KeyboardEvent) {
        this.nextImage();
        event.stopPropagation();
    }

    @HostListener('window:keydown.arrowup', ['$event'])
    KeyDownArrowUp(event: KeyboardEvent) {
        this.showControls();
        this.slideShowIntervalInMilliseconds -= 500;
        if (this.slideShowActive) {
            this.stopSlideShow();
            this.startSlideShow();
        }
        event.stopPropagation();
    }
    
    @HostListener('window:keydown.arrowdown', ['$event'])
    KeyDownArrowDown(event: KeyboardEvent) {
        this.showControls();
        this.slideShowIntervalInMilliseconds += 500;
        if (this.slideShowActive) {
            this.stopSlideShow();
            this.startSlideShow();
        }
        event.stopPropagation();
    }

    @HostListener('window:keydown.space', ['$event'])
    Space(event: KeyboardEvent) {
        this.toggleSlideShow();
        event.stopPropagation();
    }

    @HostListener('mousewheel', ['$event'])
    Mousewheel(event: WheelEvent) {
        event.preventDefault();
        this.imageScale += (event.deltaY > 0) ? -0.1 : 0.1;
        // console.log(this.imageScale);
    }

    @HostListener('mousedown', ['$event'])
    Mousedown(event: MouseEvent) {
        this.mouseMovementX = 0;
        this.mouseMovementY = 0;
        this.isMouseDown = true;
    }

    @HostListener('mouseup', ['$event'])
    Mouseup(event: MouseEvent) {
        this.isMouseDown = false;
    }

    @HostListener('mousemove', ['$event'])
    Mousemove(event: MouseEvent) {
        
        this.showControls();
        
        if (this.isMouseDown) {

            const x = event.screenX;
            const y = event.screenY;

            if (this.mouseMovementX === 0 && this.mouseMovementY === 0) {
                this.mouseMovementX = x;
                this.mouseMovementY = y;
                return;
            }

            // lateral movement
            if (x > this.mouseMovementX) { // mouse moved right
                this.imagePositionPercentageX += this.imageScale;
            }
            else if (x < this.mouseMovementX) { // mouse moved left
                this.imagePositionPercentageX -= this.imageScale;
            }

            // long movement
            if (y > this.mouseMovementY) { // mouse moved down
                this.imagePositionPercentageY += this.imageScale;
            }
            else if (y < this.mouseMovementY) { //mouse moved up
                this.imagePositionPercentageY -= this.imageScale;
            }

            this.mouseMovementX = x;
            this.mouseMovementY = y;
        }
    }

    public imageScale = 1;
    public currentImageIndex = 0;
    public imageUrl!: string;  
    public imagePositionPercentageX = 50;
    public imagePositionPercentageY = 50;
    public slideShowActive = false;
    public slideShowIntervalInMilliseconds = 3000;
    public hideControls = false;
    public showImageLegend = environment.application.showImageLegend;

    private isMouseDown = false;
    private mouseMovementX = 0;
    private mouseMovementY = 0;
    private slideShowInterval!: ReturnType<typeof setInterval>;
    private countdownTimerToHideControls!: ReturnType<typeof setTimeout>;
    private countdownToHideControlsInMilliseconds = 3000;

    constructor() { }

    ngOnInit(): void {

    }

    previousImage(): void {
        this.currentImageIndex--;
        if (this.currentImageIndex < 0) {
            this.currentImageIndex = this.images.length -1;
        }
        this.setGalleryImage();
    }

    nextImage(): void {
        this.currentImageIndex++;
        if (this.currentImageIndex >= this.images.length) {
            this.currentImageIndex = 0;
        }
        this.setGalleryImage();
    }

    closeGallery(): void {
        clearInterval(this.slideShowInterval);
        clearTimeout(this.countdownTimerToHideControls);
        this.closeGalleryRequest.emit();
    }

    setGalleryImage(): void {
        this.imageScale = 1;
        this.imagePositionPercentageX = 50;
        this.imagePositionPercentageY = 50;
        this.imageUrl = environment.apis.httpServer + '/' + this.images[this.currentImageIndex].url;
    }

    toggleSlideShow(): void {
        if (this.slideShowActive) {
            this.stopSlideShow();
        } else {
            this.startSlideShow();
        }
    }

    stopSlideShow(): void {
        this.slideShowActive = false;
        clearInterval(this.slideShowInterval);
    }

    startSlideShow(): void {
        this.slideShowActive = true;
        this.slideShowInterval = setInterval(() => {
            this.nextImage();
        }, this.slideShowIntervalInMilliseconds);
    }

    showControls(): void {
        clearTimeout(this.countdownTimerToHideControls);
        this.hideControls = false;
        this.countdownTimerToHideControls = setTimeout(() => {
            this.hideControls = true;
        }, this.countdownToHideControlsInMilliseconds);
    }

    navigationLeftClicked(): void {
        this.showControls();
        this.previousImage();
    }

    navigationRightClicked(): void {
        this.showControls();
        this.nextImage();
    }
}
