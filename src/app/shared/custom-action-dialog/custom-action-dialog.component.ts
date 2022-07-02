import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';

import { CustomAction } from '../../config/config.model';

@Component({
  selector: 'app-custom-action-dialog',
  templateUrl: './custom-action-dialog.component.html',
  styleUrls: ['./custom-action-dialog.component.scss'],
})
export class CustomActionDialog {
  public customAction: CustomAction;

  public constructor(private dialogRef: MatDialogRef<CustomActionDialog>, @Inject(MAT_DIALOG_DATA) data: CustomAction) {
    this.customAction = data;
  }

  public close() {
    this.dialogRef.close();
  }

  public save() {
    this.dialogRef.close(this.customAction);
  }

  public stopPropagation(event: Event): void {
    event.stopPropagation();
  }

  public getIconSet(name: string): string {
    const parts = name.split(':');
    if (parts.length < 2) {
      return 'fas';
    }
    return parts[0];
  }

  public getIcon(name: string): string {
    const parts = name.split(':');
    if (parts.length < 2) {
      return parts[0];
    }
    return parts[1];
  }
}
