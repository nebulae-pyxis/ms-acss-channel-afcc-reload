import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { ReloadDetailComponent } from './reload-detail.component';

describe('ReloadDetailComponent', () => {
  let component: ReloadDetailComponent;
  let fixture: ComponentFixture<ReloadDetailComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ ReloadDetailComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(ReloadDetailComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
