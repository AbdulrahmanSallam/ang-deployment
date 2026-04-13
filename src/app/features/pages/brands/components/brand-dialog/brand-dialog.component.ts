import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogModule, MAT_DIALOG_DATA } from '@angular/material/dialog';
@Component({
  selector: 'app-brand-dialog',
  standalone: true,
  imports: [MatDialogModule, MatButtonModule],
  templateUrl: './brand-dialog.component.html',
  styleUrl: './brand-dialog.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BrandDialogComponent {
  data = inject(MAT_DIALOG_DATA);
}
