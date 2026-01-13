import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AdminScannerComponent } from './admin-scanner.component';

describe('AdminScannerComponent', () => {
  let component: AdminScannerComponent;
  let fixture: ComponentFixture<AdminScannerComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AdminScannerComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AdminScannerComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
