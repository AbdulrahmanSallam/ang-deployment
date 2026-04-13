import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogModule, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { Subcategory } from '../../../../interfaces/subcategory/subcategory';

@Component({
  selector: 'app-categories-dialog',
  standalone: true,
  imports: [MatDialogModule, MatButtonModule],
  templateUrl: './categories-dialog.component.html',
  styleUrl: './categories-dialog.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CategoriesDialogComponent {
  data: { categoryName: string; subcategories: Subcategory[] } =
    inject(MAT_DIALOG_DATA);
}
