import { ComponentFixture, TestBed } from '@angular/core/testing';

import { VideoCaptionComponent } from './video-caption.component';

describe('VideoCaptionComponent', () => {
  let component: VideoCaptionComponent;
  let fixture: ComponentFixture<VideoCaptionComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ VideoCaptionComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(VideoCaptionComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
