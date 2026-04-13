import { inject, Injectable } from '@angular/core';
import {
  MatSnackBar,
  MatSnackBarHorizontalPosition,
  MatSnackBarVerticalPosition,
} from '@angular/material/snack-bar';

@Injectable({
  providedIn: 'root',
})
export class NotificationsService {
  private readonly _snackBar = inject(MatSnackBar);

  show(
    panelClass: string,
    message: string,
    duration = 4000,
    verticalPosition: MatSnackBarVerticalPosition = 'bottom',
    horizontalPosition: MatSnackBarHorizontalPosition = 'center'
  ): void {
    this._snackBar.open(message, 'Close', {
      duration: duration,
      panelClass: [panelClass],
      verticalPosition: verticalPosition,
      horizontalPosition: horizontalPosition,
    });
  }
}
