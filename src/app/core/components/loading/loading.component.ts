import { Component, inject } from '@angular/core';
import { LoadingService } from '../../services/loading/loading.service';

@Component({
  selector: 'app-loading',
  imports: [],
  templateUrl: './loading.component.html',
  styleUrl: './loading.component.scss',
})
export class LoadingComponent {
  private _loadingService = inject(LoadingService);

  // ref signal
  isLoading = this._loadingService.isLoading;
}
