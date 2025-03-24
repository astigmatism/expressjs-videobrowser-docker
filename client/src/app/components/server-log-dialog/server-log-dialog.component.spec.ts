import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ServerLogDialogComponent } from './server-log-dialog.component';

describe('ServerLogDialogComponent', () => {
  let component: ServerLogDialogComponent;
  let fixture: ComponentFixture<ServerLogDialogComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ ServerLogDialogComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(ServerLogDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
