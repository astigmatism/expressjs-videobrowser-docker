import { Component, ElementRef, EventEmitter, Input, OnInit, Output, ViewChild, AfterViewInit } from '@angular/core';
import { InputModalConfig } from 'src/models/input-model';

@Component({
    selector: 'app-input-modal',
    templateUrl: './input-modal.component.html',
    styleUrls: ['./input-modal.component.scss']
})
export class InputModalComponent implements OnInit, AfterViewInit {

    @Input() config: InputModalConfig = {};
    @Output() onClose: EventEmitter<void> = new EventEmitter<void>();

    @ViewChild('inputElement') inputElement!: ElementRef;

    constructor() {}

    ngOnInit(): void {}

    ngAfterViewInit(): void {
        // Wait until the view is fully initialized before focusing
        setTimeout(() => {
            this.inputElement.nativeElement.focus();
        });
    }

    onBackgroundClick(event: MouseEvent): void {
        this.onClose.emit();
    }

    onDialogClick(event: MouseEvent): void {
        event.stopPropagation();
    }

    submit(): void {
        const value = this.inputElement.nativeElement.value.trim();
        if (value.length > 0) {
            if (this.config.onSubmit) {
                this.config.onSubmit(value);
            }
            this.onClose.emit();
        }
    }

    onKeyDown(event: KeyboardEvent): void {
        if (event.key === 'Enter') {
            this.submit();
        }
    }
}