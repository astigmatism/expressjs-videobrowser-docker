import { ComponentFixture, TestBed } from '@angular/core/testing';

import { GridFolderComponent } from './grid-folder.component';

describe('GridFolderComponent', () => {
  let component: GridFolderComponent;
  let fixture: ComponentFixture<GridFolderComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ GridFolderComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(GridFolderComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
