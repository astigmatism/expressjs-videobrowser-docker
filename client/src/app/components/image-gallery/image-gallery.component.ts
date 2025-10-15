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
        if (!image) return;
        // If images not ready yet, try on next tick
        if (!this.images?.length) {
            queueMicrotask(() => {
            if (!this.images?.length) return; // still not ready
            this.currentImageIndex = Math.max(0, this.images.findIndex(i => i.name === image.name));
            this.setGalleryImage();
            });
            return;
        }
        this.saveCurrentViewState();
        const idx = this.images.findIndex(i => i.name === image.name);
        this.currentImageIndex = idx >= 0 ? idx : 0;
        this.setGalleryImage();
    }
    @Output() closeGalleryRequest = new EventEmitter<void>();

    @ViewChild('imageContainer', { static: false }) imageContainer!: ElementRef<HTMLElement>;

    // ===== Keyboard / Mouse bindings =====
    @HostListener('window:keydown.q', ['$event']) KeyDownKeyQ(event: KeyboardEvent) { this.closeGallery(); }
    @HostListener('window:keydown.arrowleft', ['$event']) KeyDownArrowLeft(event: KeyboardEvent) { this.previousImage(); event.stopPropagation(); }
    @HostListener('window:keydown.arrowright', ['$event']) KeyDownArrowRight(event: KeyboardEvent) { this.nextImage(); event.stopPropagation(); }
    @HostListener('window:keydown.space', ['$event']) Space(event: KeyboardEvent) { this.toggleSlideShow(); event.stopPropagation(); }
    @HostListener('window:keydown.arrowup', ['$event'])
    KeyDownArrowUp(event: KeyboardEvent) {
        this.showControls();
        this.slideShowIntervalInMilliseconds = Math.max(500, this.slideShowIntervalInMilliseconds - 500);
        if (this.slideShowActive) { this.stopSlideShow(); this.startSlideShow(); }
        event.stopPropagation();
    }
    @HostListener('window:keydown.arrowdown', ['$event'])
    KeyDownArrowDown(event: KeyboardEvent) {
        this.showControls();
        this.slideShowIntervalInMilliseconds = Math.min(10000, this.slideShowIntervalInMilliseconds + 500);
        if (this.slideShowActive) { this.stopSlideShow(); this.startSlideShow(); }
        event.stopPropagation();
    }

    @HostListener('wheel', ['$event']) onMouseWheel(event: WheelEvent) {
        event.preventDefault();
        this.adjustZoom(event.deltaY);
        // Persist view after zooming so navigation restores it
        this.saveCurrentViewState();
    }

    @HostListener('mousedown', ['$event']) onMouseDown(event: MouseEvent) {
        this.isDragging = true;
        this.lastMouseX = event.clientX;
        this.lastMouseY = event.clientY;
    }
    @HostListener('mouseup') onMouseUp() {
        this.isDragging = false;
        // Persist after a drag interaction
        this.saveCurrentViewState();
    }

    @HostListener('mousemove', ['$event']) onMouseMove(event: MouseEvent) {
        if (this.isDragging) {
            const deltaX = event.clientX - this.lastMouseX;
            const deltaY = event.clientY - this.lastMouseY;

            const z = this.effectiveScale || 1; // keep pan speed consistent
            this.panX += deltaX / z;
            this.panY += deltaY / z;

            this.lastMouseX = event.clientX;
            this.lastMouseY = event.clientY;
        } else {
            this.showControls();
        }
    }

    @HostListener('window:keydown.f', ['$event'])
    toggleFitFill(event: KeyboardEvent) {
        event.preventDefault();
        // Save current mode's state for this image before toggling
        this.saveCurrentViewState();

        this.isFillMode = !this.isFillMode;

        // Cosmetic class toggle (keeps your existing styling hook)
        const container = this.imageContainer?.nativeElement;
        if (container) {
            container.classList.toggle('fill-mode', this.isFillMode);
        }

        // Reset zoom/pan and recompute baseline so the image "fits/fills" cleanly
        this.snapViewToModeBaseline();

        // Note: We intentionally do NOT restore a saved state for the new mode here,
        // because you wanted F to clear to the baseline. If you ever want to restore
        // last-used per-mode state on F, call this.restoreViewStateForCurrent() here
        // instead of snapViewToModeBaseline().
    }

    @HostListener('window:resize') onResize() {
        this.measureContainer();
        this.computeBaseScale();
    }

    // ===== Public state =====
    public currentImageIndex = 0;
    public imageUrl!: string;

    public slideShowActive = false;
    public slideShowIntervalInMilliseconds = 3000;
    public hideControls = false;
    public showImageLegend = environment.application.showImageLegend;
    public isFillMode = false;

    // Zoom/Pan using background-size/background-position
    public minZoom = 0.5;   // user zoom lower bound (relative to base)
    public maxZoom = 3;     // user zoom upper bound (relative to base)

    public panX = 0; // CSS px from center
    public panY = 0;

    // Styles for template
    public get bgSize(): string {
        if (!this.imgW || !this.imgH) return 'auto';
        const w = Math.max(1, Math.round(this.imgW * this.effectiveScale));
        const h = Math.max(1, Math.round(this.imgH * this.effectiveScale));
        return `${w}px ${h}px`;
    }
    public get bgPosition(): string {
        return `calc(50% + ${this.panX}px) calc(50% + ${this.panY}px)`;
    }

    // ===== Private impl state =====
    private isDragging = false;
    private lastMouseX = 0;
    private lastMouseY = 0;
    private slideShowInterval!: ReturnType<typeof setInterval>;
    private countdownTimerToHideControls!: ReturnType<typeof setTimeout>;
    private countdownToHideControlsInMilliseconds = 2000;

    private imgW = 0;
    private imgH = 0;
    private cw = 0;
    private ch = 0;

    private baseScale = 1;   // fit/fill baseline
    private userScale = 1;   // user zoom multiplier
    private get effectiveScale() { return this.baseScale * this.userScale; }

    // ===== Session-scoped per-image, per-mode view state =====
    // Using 'sessionStorage' so it vanishes when the tab/session ends
    private storageKey = 'imageGallery:viewState:v1';
    private viewStateByKey = new Map<string, { fit?: ViewState; fill?: ViewState }>();

    constructor(private websocketService: WebsocketService) { }

    ngOnInit(): void {
        this.loadStateFromSession();
    }

    // ===== Navigation =====
    previousImage(): void {
        if (!this.images?.length) return;
        this.saveCurrentViewState();
        this.currentImageIndex = (this.currentImageIndex - 1 + this.images.length) % this.images.length;
        this.setGalleryImage();
    }

    nextImage(): void {
        if (!this.images?.length) return;
        this.saveCurrentViewState();
        this.currentImageIndex = (this.currentImageIndex + 1) % this.images.length;
        this.setGalleryImage();
    }

    public get bgImage(): string {
    // Encode to keep spaces and specials safe; wrap in quotes for CSS
    return this.imageUrl ? `url("${encodeURI(this.imageUrl)}")` : 'none';
    }

    private preloadNextImages(): void {
        if (!this.images?.length) return;
        const preloadCount = 2;
        for (let i = 1; i <= preloadCount; i++) {
            const index = (this.currentImageIndex + i) % this.images.length;
            const nextImage = this.images[index];
            const url = environment.apis.httpServer + '/' + nextImage.url;
            const img = new Image();
            img.src = url;
        }
    }

    // ===== Open/Close =====
    closeGallery(): void {
        clearInterval(this.slideShowInterval);
        clearTimeout(this.countdownTimerToHideControls);

        // NEW: clear all persisted view state when exiting gallery (Q or X)
        this.clearAllViewState();

        this.closeGalleryRequest.emit();
    }

    // ===== Image setup =====
    setGalleryImage(): void {
        if (!this.images?.length) return;

        const image = this.images[this.currentImageIndex];

        // Reset to baseline for a new image; we'll restore saved view afterwards if present
        this.userScale = 1;
        this.panX = 0;
        this.panY = 0;

        this.imageUrl = environment.apis.httpServer + '/' + image.url;

        // Load intrinsic size to compute base scaling
        const probe = new Image();
        probe.onload = () => {
            this.imgW = probe.naturalWidth || probe.width;
            this.imgH = probe.naturalHeight || probe.height;
            this.measureContainer();
            this.computeBaseScale();

            // Restore saved state for this image in the current mode (if any)
            this.restoreViewStateFor(image);
            this.enforceMinEffectiveScale();
        };
        probe.src = this.imageUrl;

        this.updateImageDisplay();
        this.preloadNextImages();

        // Side-effect: metadata updates
        this.websocketService.sendMetadataUpdate([{
            action: 'increment',
            target: 'views',
            type: 'image',
            fullname: image.fullname,
            homePath: image.homePath
        }, {
            action: 'set',
            target: 'lastViewed',
            value: new Date().toISOString(),
            type: 'image',
            fullname: image.fullname,
            homePath: image.homePath
        }]);

        if (image.metadata) {
            image.metadata.views = (image.metadata.views ?? 0) + 1;
            image.metadata.lastViewed = new Date().toISOString();
        }
    }

    // ===== Slideshow =====
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

    // ===== Zoom / Pan =====
    adjustZoom(delta: number): void {
        const step = delta > 0 ? -0.1 : 0.1; // wheel down -> zoom out
        let newUser = this.userScale + step;

        // Guarantee the whole image can remain visible at minimum zoom (contain)
        const minUser = (() => {
            if (!this.cw || !this.ch || !this.imgW || !this.imgH) return this.minZoom;
            const scaleFit = Math.min(this.cw / this.imgW, this.ch / this.imgH);
            return Math.max(this.minZoom, scaleFit / this.baseScale);
        })();

        const maxUser = this.maxZoom;

        this.userScale = Math.min(maxUser, Math.max(minUser, newUser));
    }

    // ===== Display & layout helpers =====
    updateImageDisplay(): void {
        const container = this.imageContainer?.nativeElement;
        if (container) {
            // Cosmetic hook if you want to style fill-mode differently
            container.classList.toggle('fill-mode', this.isFillMode);
        }
        this.computeBaseScale();
    }

    private measureContainer() {
        const el = this.imageContainer?.nativeElement;
        if (!el) return;
        this.cw = el.clientWidth;
        this.ch = el.clientHeight;
    }

    private computeBaseScale() {
        if (!this.cw || !this.ch || !this.imgW || !this.imgH) return;

        const scaleFit = Math.min(this.cw / this.imgW, this.ch / this.imgH); // contain
        const scaleFill = Math.max(this.cw / this.imgW, this.ch / this.imgH); // cover

        this.baseScale = this.isFillMode ? scaleFill : scaleFit;

        // Ensure effective scale never drops below fit, so full image is preserved at min zoom
        const minEffective = scaleFit;
        if (this.effectiveScale < minEffective) {
            this.userScale = minEffective / this.baseScale;
        }
    }

    private enforceMinEffectiveScale() {
        if (!this.cw || !this.ch || !this.imgW || !this.imgH) return;
        const scaleFit = Math.min(this.cw / this.imgW, this.ch / this.imgH);
        const minEffective = scaleFit;
        if (this.effectiveScale < minEffective) {
            this.userScale = minEffective / this.baseScale;
        }
    }

    // ===== Controls visibility =====
    showControls(): void {
        clearTimeout(this.countdownTimerToHideControls);
        this.hideControls = false;

        this.countdownTimerToHideControls = setTimeout(() => {
            this.hideControls = true;
        }, this.countdownToHideControlsInMilliseconds);
    }

    // Snap view to the new mode's baseline: centered, no extra zoom/pan
    private snapViewToModeBaseline(): void {
        this.userScale = 1;   // no extra zoom on top of base
        this.panX = 0;        // center horizontally
        this.panY = 0;        // center vertically
        this.computeBaseScale(); // recompute baseScale (fit/fill) for current container + image
        // After resetting, persist this as the new state for this mode/image
        this.saveCurrentViewState();
    }

    // ===== Session persistence: per-image, per-mode =====
    private modeKey(): 'fit' | 'fill' { return this.isFillMode ? 'fill' : 'fit'; }
    private stateKeyFor(image: IImage): string {
        return image?.fullname || image?.url || image?.name || `idx:${this.currentImageIndex}`;
    }

    private saveCurrentViewState(): void {
        if (!this.images?.length) return;
        const image = this.images[this.currentImageIndex];
        const key = this.stateKeyFor(image);

        const entry = this.viewStateByKey.get(key) || {};
        entry[this.modeKey()] = { userScale: this.userScale, panX: this.panX, panY: this.panY };
        this.viewStateByKey.set(key, entry);
        this.saveStateToSession();
    }

    private restoreViewStateFor(image: IImage): void {
        const key = this.stateKeyFor(image);
        const entry = this.viewStateByKey.get(key);
        const saved = entry?.[this.modeKey()];
        if (saved) {
            this.userScale = saved.userScale;
            this.panX = saved.panX;
            this.panY = saved.panY;
        } else {
            // defaults when nothing saved
            this.userScale = 1;
            this.panX = 0;
            this.panY = 0;
        }
    }

    private saveStateToSession(): void {
        try {
            const obj: Record<string, { fit?: ViewState; fill?: ViewState }> = {};
            for (const [k, v] of this.viewStateByKey.entries()) obj[k] = v;
            sessionStorage.setItem(this.storageKey, JSON.stringify(obj));
        } catch { /* ignore quota or privacy errors */ }
    }

    private loadStateFromSession(): void {
        try {
            const raw = sessionStorage.getItem(this.storageKey);
            if (!raw) return;
            const obj = JSON.parse(raw) as Record<string, { fit?: ViewState; fill?: ViewState }>;
            this.viewStateByKey.clear();
            Object.entries(obj).forEach(([k, v]) => this.viewStateByKey.set(k, v));
        } catch { /* ignore parse errors */ }
    }

    // NEW: clear all in-memory and session-stored view state
    private clearAllViewState(): void {
        try {
            this.viewStateByKey.clear();
            sessionStorage.removeItem(this.storageKey);
        } catch { /* ignore */ }

        // Also reset current runtime view so a future open starts clean
        this.userScale = 1;
        this.panX = 0;
        this.panY = 0;
    }
}

// local types
type ViewState = { userScale: number; panX: number; panY: number };