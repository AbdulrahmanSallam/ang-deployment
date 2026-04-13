import { ChangeDetectionStrategy, Component, signal, ViewChild } from '@angular/core';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatStepper, MatStepperModule } from '@angular/material/stepper';
import { MatButtonModule } from '@angular/material/button';
import { VerificationFormComponent } from '../../components/verification-form/verification-form.component';
import { ForgetPasswordFormComponent } from './components/forget-password-form/forget-password-form.component';
import { NewPasswordFormComponent } from './components/new-password-form/new-password-form.component';
import { ForgetPasswordData } from '../../interfaces/forget-password-data';
@Component({
  selector: 'app-forget-password',
  imports: [
    MatInputModule,
    MatStepperModule,
    MatButtonModule,
    MatFormFieldModule,
    VerificationFormComponent,
    ForgetPasswordFormComponent,
    NewPasswordFormComponent,
  ],
  templateUrl: './forget-password.component.html',
  styleUrl: './forget-password.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ForgetPasswordComponent {
  @ViewChild('stepper') stepper!: MatStepper;

  // needing for email in reset password step
  forgetPasswordData = signal({} as ForgetPasswordData);

  // status for each step to ensure completence
  forgetPasswordStatus = signal<boolean>(false);
  verificationStatus = signal<boolean>(false);
  newPasswordStatus = signal<boolean>(false);

  constructor() {}

  setForgetPasswordStatus(status: boolean) {
    this.forgetPasswordStatus.set(status);
    this.goToNextStep(this.forgetPasswordStatus());
  }

  setVerificationStatus(status: boolean) {
    this.verificationStatus.set(status);
    this.goToNextStep(this.verificationStatus());
  }

  setNewPasswordStatus(status: boolean) {
    this.newPasswordStatus.set(status);
    this.goToNextStep(this.newPasswordStatus());
  }

  getForgetPasswordData(forgetPasswordData: ForgetPasswordData): void {
    this.forgetPasswordData.set(forgetPasswordData);
  }

  goToNextStep(status: boolean): void {
    if (status) {
      setTimeout(() => {
        this.stepper.next();
      }, 10);
    }
  }
}
