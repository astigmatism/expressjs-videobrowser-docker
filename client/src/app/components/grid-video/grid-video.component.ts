import { Component, ElementRef, EventEmitter, Input, OnInit, Output, ViewChild, HostListener } from '@angular/core';
import { HttpService } from 'src/app/services/http/http.service';
import { environment } from 'src/environments/environment';
import { IListingItem, IListingItemDeleteRequest } from 'src/models/listing-item';
import { ISetThumbnailData } from 'src/models/thumbnail';
import { IVideo, Video } from 'src/models/video';
import * as moment from 'moment';
import { WebsocketService } from 'src/app/services/web-sockets/web-sockets.service';
import { InputModalConfig } from 'src/models/input-model';

@Component({
    selector: 'app-grid-video',
    templateUrl: './grid-video.component.html',
    styleUrls: ['./grid-video.component.scss']
})
export class GridVideoComponent implements OnInit {

    @Input() listingItem!: IListingItem;
    @ViewChild('videoElement') videoElement!: ElementRef;
    @Output() onDeleteRequest = new EventEmitter<IListingItemDeleteRequest>();
    @Output() onRenameClickedRequest = new EventEmitter<InputModalConfig>();

    @HostListener('mouseleave')
    onMouseLeaveComponent(): void {
        setTimeout(() => {
            if (this.videoPlaying && !this.isFullScreen) {
                this.videoElement.nativeElement.pause();
                this.videoPlaying = false
            }
            if (this.scrubbingEnabledForThumbnail || this.scrubbingEnabledForPlay) {
                this.scrubbingEnabledForThumbnail = false;
                this.scrubbingEnabledForPlay = false;
                this.toggleScrubbing(false);
            }
        }, 1000)
    }

    @HostListener('wheel', ['$event'])
    onMouseWheel(event: WheelEvent) {
        event.preventDefault(); // Prevent default browser zooming

        const zoomFactor = event.deltaY > 0 ? -0.1 : 0.1;

        // Remove upper limit for zoom-in
        this.videoScale = Math.max(0.5, this.videoScale + zoomFactor); 

        this.applyZoom();
    }

    @HostListener('document:fullscreenchange')
    @HostListener('document:webkitfullscreenchange')
    @HostListener('document:mozfullscreenchange')
    @HostListener('document:MSFullscreenChange')
    onFullscreenChange(): void {
        const fullscreenElement =
            document.fullscreenElement ||
            (document as any).webkitFullscreenElement ||
            (document as any).mozFullScreenElement ||
            (document as any).msFullscreenElement;

        this.isFullScreen = !!fullscreenElement;

        if (!fullscreenElement) {
            this.videoScale = 1; // Reset zoom on exit
            this.applyZoom();
        }
    }

    @HostListener('window:keydown.f', ['$event'])
    onKeyDownF(event: KeyboardEvent): void {
        this.toggleFillScreen();
    }
    @HostListener('window:keydown.d', ['$event'])
    onKeyDownD(event: KeyboardEvent): void {
        if (this.fillScreen) {
            this.panPercent = Math.max(0, this.panPercent - 5);
        }
    }
    @HostListener('window:keydown.g', ['$event'])
    onKeyDownG(event: KeyboardEvent): void {
        if (this.fillScreen) {
            this.panPercent = Math.min(100, this.panPercent + 5)
        }
    }

    @HostListener('window:keydown.r', ['$event'])
    onKeyDownR(event: KeyboardEvent): void {
        if (this.fillScreen) {
            this.panVerticalPercent = Math.max(0, this.panVerticalPercent - 5);
        }
    }
    @HostListener('window:keydown.c', ['$event'])
    onKeyDownC(event: KeyboardEvent): void {
        if (this.fillScreen) {
            this.panVerticalPercent = Math.min(100, this.panVerticalPercent + 5);
        }
    }

    public video!: IVideo;
    public previewImageUrl!: string;
    public videoUrl!: string;
    public backgroundPositionX = 0;
    public backgroundPositionY = 0;
    public maxHeight = environment.grid.previewMaxHeight;
    public duration!: string;
    public videoCaption!: string;
    public mouseOver = false;
    public canDelete = environment.application.canDelete;

    public scrubbingEnabledForThumbnail = false;
    public scrubbingEnabledForPlay = false;
    public videoPlaying = false;

    private spriteSheetFrames: number = 0;
    private spriteSheetFrameRatio!: number;
    private startVideoAtTime = 0;
    private timeToFrameRatio!: number;
    public isFullScreen = !!document.fullscreenElement;
    public fillScreen = false;
    public videoScale = 1;
    public showMetadata = false;
    public panPercent = 50;           // horizontal panning (left-right)
    public panVerticalPercent = 50;   // vertical panning (top-bottom)

    private hoverTimer: any;
    private spriteSequenceTimer: any;
    private currentSpriteFrame = 0;
    public spritePreviewIntervalMs = 500; // Adjustable delay between frames
    public longHoverDelayMs = 1200;       // Time before playback starts
    private originalBackgroundPositionX = 0;
    private originalBackgroundPositionY = 0;

    constructor(private httpService: HttpService, private websocketService: WebsocketService) { }

    ngOnInit(): void {

        this.video = this.listingItem as IVideo;
        this.previewImageUrl = environment.apis.httpServer + '/' + this.httpService.fixedEncodeURIComponent(this.video.thumbnail.url);
        this.videoUrl = environment.apis.httpServer + '/' + this.httpService.fixedEncodeURIComponent(this.video.url);
        
        if (this.video.spriteSheet.coordinates) {
            this.spriteSheetFrames = this.video.spriteSheet.coordinates.length;
        }

        this.spriteSheetFrameRatio = this.spriteSheetFrames / this.video.spriteSheet.width;
        this.duration = Video.convertSecondsToTimeSignature(this.video.probe.duration);
        this.timeToFrameRatio = this.video.probe.duration / this.spriteSheetFrames;
    }

    onKeyDown(event: KeyboardEvent): void {
        let video = this.videoElement.nativeElement;
        switch(event.key) {
            case 'ArrowDown':
                video.playbackRate = (video.playbackRate - environment.video.playbackRateIncrement).toFixed(2);
                this.videoCaption = `x ${video.playbackRate}`;
                break;
            case 'ArrowUp':
                video.playbackRate = (video.playbackRate  + environment.video.playbackRateIncrement).toFixed(2);
                this.videoCaption = `x ${video.playbackRate}`;
                break;
            case 'ArrowLeft':
            case 'ArrowRight':
                this.videoCaption = video.currentTime;
                break;
        }
    }

    onPreviewClick(event: MouseEvent): void {

        //3 possibilities
        const el: HTMLVideoElement = this.videoElement.nativeElement;

        if (this.scrubbingEnabledForThumbnail) {
            this.toggleScrubbing(false);
            this.saveThumbnailFrame();
            this.scrubbingEnabledForThumbnail = false;
            return;
        }

        if (this.scrubbingEnabledForPlay) {
            this.toggleScrubbing(false);
            el.currentTime = this.startVideoAtTime;
            this.scrubbingEnabledForPlay = false;
        }
        else {
            el.currentTime = 0;
        }
        this.videoPlaying = true;
        el.muted = environment.video.startMuted;
        el.autoplay = true;
        if (el.paused) {
            
            var playPromise = el.play();

            console.log('playPromise', playPromise)

            if (playPromise !== undefined) {
                playPromise.then((_:any) => {
                    // playback started!
                })
                .catch((error:Error) => {
                    // Auto-play was prevented
                    // Show paused UI.
                    console.log('HTML video.play promise: ' + error);
                });
            }
        }
        el.focus();

        this.websocketService.sendMetadataUpdate([{
            action: 'increment',
            target: 'views',
            type: 'video',
            fullname: this.video.fullname,
            homePath: this.video.homePath
        },{
            action: 'set',
            target: 'lastViewed',
            value: new Date().toISOString(),
            type: 'video',
            fullname: this.video.fullname,
            homePath: this.video.homePath
        }]);
        if (this.video.metadata) {
            this.video.metadata.views = (this.video.metadata.views ?? 0) + 1;
        }
        if (this.video.metadata) {
            this.video.metadata.lastViewed = new Date().toISOString();
        }
    }

    onBadgeClick(event: MouseEvent): void {
        this.scrubbingEnabledForThumbnail = true;
        this.toggleScrubbing(true);
        event.stopPropagation();
    }

    onSpiceClick(event: MouseEvent): void {
        this.websocketService.sendMetadataUpdate([{
            action: 'increment',
            target: 'spice',
            type: 'video',
            fullname: this.video.fullname,
            homePath: this.video.homePath
        }]);
        if (this.video.metadata) {
            this.video.metadata.spice = (this.video.metadata.spice ?? 0) + 1;
        }
        event.stopPropagation();
    }

    onFooterClick(event: MouseEvent): void {
        
        // pause if playing
        if (this.videoPlaying) {
            this.videoElement.nativeElement.pause();
            this.videoPlaying = false;
            return;
        }

        if (this.scrubbingEnabledForThumbnail) {
            this.toggleScrubbing(false);
            this.scrubbingEnabledForThumbnail = false;
            return;
        }

        if (this.scrubbingEnabledForPlay) {
            this.toggleScrubbing(false);
            this.scrubbingEnabledForPlay = false;
            return;
        }

        this.scrubbingEnabledForPlay = true;
        this.toggleScrubbing(true);
    }

    onRenameClick(event: MouseEvent): void {
        console.log('video', this.video)
        this.onRenameClickedRequest.emit({
            label: 'New Name',
            defaultValue: this.video.name,
            buttonLabel: 'Rename',
            emoji: '✏️',
            onSubmit: (value: string) => {
                const sub = this.httpService.renameResource(this.video.logicalPath, value).subscribe(() => {
                    sub.unsubscribe();
                    location.reload();
                });
            }
        });
    }

    onMouseMove(event: MouseEvent): void {
        if (!this.scrubbingEnabledForThumbnail && !this.scrubbingEnabledForPlay) return;
        const position = event.offsetX;
        const getFrame = Math.floor(position * this.spriteSheetFrameRatio);
        const newCoordinates = this.video.spriteSheet.coordinates[getFrame];
        if  (newCoordinates) {
            this.backgroundPositionX = newCoordinates.x;
            this.backgroundPositionY = newCoordinates.y;
        }
        this.startVideoAtTime = getFrame * this.timeToFrameRatio;
    }

    onMouseOver(event: MouseEvent): void {
        if (this.scrubbingEnabledForThumbnail) return;
        if (this.scrubbingEnabledForPlay) return;
        this.mouseOver = true;

        // Only start long-hover sequence if we're over the preview image
        const target = event.target as HTMLElement;
        if (target.classList.contains('preview')) {
            this.hoverTimer = setTimeout(() => {
                // this.startSpriteSequence();
                this.scrubbingEnabledForPlay = true;
                this.toggleScrubbing(true);
            }, this.longHoverDelayMs);
        }
    }

    onMouseOut(event: MouseEvent): void {
        this.mouseOver = false;
        clearTimeout(this.hoverTimer);
        // this.stopSpriteSequence();
    }

    canShowDeleteIcon(): boolean {
        return this.mouseOver && !this.scrubbingEnabledForThumbnail && !this.scrubbingEnabledForPlay;
    }

    deleteRequest(event: MouseEvent): void {
        if (!this.canDelete) return;
        
        const request: IListingItemDeleteRequest = {
            name: this.video.fullname,
            isFolder: false
        }
        this.onDeleteRequest.emit(request);
        event.stopPropagation();
    }

    private saveThumbnailFrame() {
        let setThumbnailData: ISetThumbnailData = {
            coordinates: {
                height: this.video.thumbnail.height,
                width: this.video.thumbnail.width,
                x: this.backgroundPositionX,
                y: this.backgroundPositionY
            },
            thumbnailUrl: this.video.thumbnail.url,
            spriteSheetUrl: this.video.spriteSheet.url
            
        };
        const sub = this.httpService.setThumbnailFromSpriteSheetFrame(setThumbnailData).subscribe((imageDataUri: string) => {
            this.previewImageUrl = `data:image/png;base64,${imageDataUri}`;
            sub.unsubscribe();
        });
    }

    private toggleScrubbing(turnOnScrubbing: boolean) {
        if (turnOnScrubbing) {

            this.previewImageUrl = environment.apis.httpServer + '/' + this.httpService.fixedEncodeURIComponent(this.video.spriteSheet.url);
            this.maxHeight = 1000; // arbitrary large to show tall content
        }
        else {
            this.previewImageUrl = environment.apis.httpServer + '/' + this.httpService.fixedEncodeURIComponent(this.video.thumbnail.url);
            this.maxHeight = environment.grid.previewMaxHeight;   
        }
    }

    onDragStart(event: DragEvent): void {
        if (event.dataTransfer) {
            event.dataTransfer.setData('application/json', JSON.stringify({
                type: 'video',
                fullname: this.video.fullname,
                logicalPath: this.video.logicalPath
            }));
        }
        console.log(`📦 Drag started: ${this.video.name}`);
    }

    toggleFillScreen(): void {
        this.fillScreen = !this.fillScreen;
    }

    applyZoom(): void {
        if (this.videoElement && this.videoElement.nativeElement) {
            this.videoElement.nativeElement.style.transform = `scale(${this.videoScale})`;
            this.videoElement.nativeElement.style.transformOrigin = "center center";
        }
    }

    getCreatedAgo(): string {
        return moment(this.video.metadata?.createdAt).fromNow(); // e.g., "12 days ago"
    }
    
    getLastOpenedAgo(): string {
        return moment(this.video.metadata?.lastViewed).fromNow();
    }

    private startSpriteSequence(): void {
        if (!this.video.spriteSheet.coordinates?.length) return;
    
        // Save the original position so we can restore it later
        this.originalBackgroundPositionX = this.backgroundPositionX;
        this.originalBackgroundPositionY = this.backgroundPositionY;
    
        // Switch to sprite sheet image if not already scrubbing
        if (!this.scrubbingEnabledForThumbnail && !this.scrubbingEnabledForPlay) {
            this.previewImageUrl = environment.apis.httpServer + '/' + this.httpService.fixedEncodeURIComponent(this.video.spriteSheet.url);
            this.maxHeight = 1000;
        }
    
        this.spriteSequenceTimer = setInterval(() => {
            const frame = this.video.spriteSheet.coordinates[this.currentSpriteFrame];
            if (frame) {
                this.backgroundPositionX = frame.x;
                this.backgroundPositionY = frame.y;
            }
            this.currentSpriteFrame = (this.currentSpriteFrame + 1) % this.video.spriteSheet.coordinates.length;
        }, this.spritePreviewIntervalMs);
    }
    
    private stopSpriteSequence(): void {
        clearInterval(this.spriteSequenceTimer);
        this.currentSpriteFrame = 0;
    
        // Restore the original preview position
        this.backgroundPositionX = this.originalBackgroundPositionX;
        this.backgroundPositionY = this.originalBackgroundPositionY;
    
        // Optional: restore the previewImageUrl and maxHeight if needed
        if (!this.scrubbingEnabledForThumbnail && !this.scrubbingEnabledForPlay) {
            this.previewImageUrl = environment.apis.httpServer + '/' + this.httpService.fixedEncodeURIComponent(this.video.thumbnail.url);
            this.maxHeight = environment.grid.previewMaxHeight;
        }
    }
}
