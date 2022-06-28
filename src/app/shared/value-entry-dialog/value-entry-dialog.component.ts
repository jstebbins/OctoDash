import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';

export interface ValueEntryData {
  icon: string;
  unit: string;
  valueDefault: number;
  valueMax: number;
}

@Component({
  selector: 'app-value-entry-dialog',
  templateUrl: './value-entry-dialog.component.html',
  styleUrls: ['./value-entry-dialog.component.scss'],
})
export class ValueEntryDialog {
  public icon: string;
  public unit: string;
  public valueDefault: number;
  public valueTarget: number;
  public valueMax: number;

  public constructor(private dialogRef: MatDialogRef<ValueEntryDialog>, @Inject(MAT_DIALOG_DATA) data: ValueEntryData) {
    this.valueDefault = data?.valueDefault;
    this.valueTarget = this.valueDefault;
    this.valueMax = data?.valueMax;
    this.icon = data?.icon;
    this.unit = data?.unit;
  }

  public close() {
    this.dialogRef.close();
  }

  public set() {
    this.dialogRef.close(this.valueTarget);
  }

  public stopPropagation(event: Event): void {
    event.stopPropagation();
  }

  public update(value: number): void {
    this.valueTarget += value;
    if (value < -999) {
      this.valueTarget = this.valueDefault;
    } else if (this.valueTarget < 0) {
      this.valueTarget = 0;
    } else if (this.valueTarget > this.valueMax) {
      this.valueTarget = this.valueMax;
    }
  }
}
