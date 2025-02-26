import { Component, Input, OnInit, ViewChild } from '@angular/core';

@Component({
    selector: 'app-video-caption',
    templateUrl: './video-caption.component.html',
    styleUrls: ['./video-caption.component.scss']
})
export class VideoCaptionComponent implements OnInit {

    @Input() set message(message: string) {
        this.caption = message;
        this.fadeOut();
    }

    public caption!: string;
    public messageActive = false;
    private messageActiveTimer!: number;

    constructor() { }

    ngOnInit(): void {
    }

    fadeOut(): void {

        this.messageActive = true;
        clearTimeout(this.messageActiveTimer);
        this.messageActiveTimer = window.setTimeout(() => {
            this.messageActive = false;
        }, 500);
    }

}
