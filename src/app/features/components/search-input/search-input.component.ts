import { ChangeDetectionStrategy, Component, output } from '@angular/core';

@Component({
  selector: 'app-search-input',
  imports: [],
  templateUrl: './search-input.component.html',
  styleUrl: './search-input.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SearchInputComponent {
  searchText = output<string>();

  onSearch(event: Event) {
    const input = event.target as HTMLInputElement;
    this.searchText.emit(input.value);
  }
}
