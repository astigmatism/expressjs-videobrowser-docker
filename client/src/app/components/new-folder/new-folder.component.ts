import { Component, ElementRef, EventEmitter, OnInit, Output, ViewChild } from '@angular/core';

@Component({
    selector: 'app-new-folder',
    templateUrl: './new-folder.component.html',
    styleUrls: ['./new-folder.component.scss']
})
export class NewFolderComponent implements OnInit {

    @ViewChild('foldername') foldername!: ElementRef;
    @Output() onNewFolderRequest: EventEmitter<string> = new EventEmitter<string>();
    @Output() closeNewFolderRequest = new EventEmitter<boolean>();

    constructor() { }

    ngOnInit(): void {
    }

    onBackgroundClick(event: MouseEvent): void {
        this.closeNewFolderRequest.emit(true);
    }

    onDialogClick(event: MouseEvent): void {
        event.stopPropagation();
    }

    onClick(): void {
        const foldername = this.foldername.nativeElement.value.trim();
        if (foldername.length > 0) {
            this.onNewFolderRequest.emit(foldername);
        }
    }

    onKeyDown(event: KeyboardEvent): void {
        switch(event.key) {
            case 'Enter':
                this.onClick();
               break;
        }
    }

}
