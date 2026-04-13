import {
  ChangeDetectionStrategy,
  Component,
  inject,
  OnInit,
  signal,
  computed,
} from '@angular/core';
import { Category } from '../../interfaces/category/category';
import { CategoriesService } from '../../services/categories/categories.service';
import { GetCategoriesResponse } from '../../interfaces/get-categories-response/get-categories-response';
import { CategoriesDialogComponent } from './components/categories-dialog/categories-dialog.component';
import { MatDialog } from '@angular/material/dialog';
import { Subcategory } from '../../interfaces/subcategory/subcategory';
import { GetSubcategoryResponse } from '../../interfaces/get-subcategory-response/get-subcategory-response';
import { NgxPaginationModule } from 'ngx-pagination';
import { CustomCardComponent } from '../../components/custom-card/custom-card.component';
import { MatButtonModule } from '@angular/material/button';

@Component({
  selector: 'app-categories',
  imports: [CustomCardComponent, NgxPaginationModule, MatButtonModule],
  templateUrl: './categories.component.html',
  styleUrl: './categories.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CategoriesComponent implements OnInit {
  private readonly _categoriesService = inject(CategoriesService);
  private readonly _dialog = inject(MatDialog);

  pageSize = signal(0);
  page = signal(1);
  total = signal(0);
  categories = signal([] as Category[]);
  isLoading = signal(true);
  error = signal<string | null>(null);

  // Computed properties
  showLoading = computed(() => this.isLoading());
  showEmpty = computed(() => !this.isLoading() && this.categories().length === 0 && !this.error());
  showError = computed(() => !this.isLoading() && this.error() !== null);
  showContent = computed(() => !this.isLoading() && this.categories().length > 0 && !this.error());

  constructor() {}

  ngOnInit(): void {
    this.getCategories();
  }

  getCategories(): void {
    this.isLoading.set(true);
    this.error.set(null);

    this._categoriesService.getCategories(this.page()).subscribe({
      next: (response: GetCategoriesResponse) => {
        this.handleGetCategoriesSuccess(response);
      },
      error: (error) => {
        console.error('Failed to load categories:', error);
        this.error.set('Failed to load categories. Please try again later.');
        this.isLoading.set(false);
        this.categories.set([]);
      },
    });
  }

  private handleGetCategoriesSuccess(response: GetCategoriesResponse) {
    this.categories.set(response.data);
    this.pageSize.set(response.metadata.limit);
    this.page.set(response.metadata.currentPage);
    this.total.set(response.results);
    this.isLoading.set(false);
  }

  getSubCategories(categoryName: string, categoryId: string): void {
    this._categoriesService.getSubCategories(categoryId).subscribe({
      next: (response: GetSubcategoryResponse) => {
        this.openDialog(categoryName, response.data);
      },
      error: (error) => {
        console.error('Failed to load subcategories:', error);
        // You could show a toast notification here
      },
    });
  }

  pageChangeEvent(event: number) {
    this.page.set(event);
    this.getCategories();
  }

  openDialog(categoryName: string, subcategories: Subcategory[]): void {
    this._dialog.open(CategoriesDialogComponent, {
      data: {
        categoryName,
        subcategories,
      },
    });
  }

  retryLoading(): void {
    this.error.set(null);
    this.getCategories();
  }
}
