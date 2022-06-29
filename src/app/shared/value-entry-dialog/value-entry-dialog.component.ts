import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';

export interface ValueEntryPreset {
  name: string;
  value: number;
}

export interface ValueEntryData {
  icon: string;
  unit: string;
  selection: string;
  acknowledge: string;
  valueMax: number;
  presets: ValueEntryPreset[];
}

@Component({
  selector: 'app-value-entry-dialog',
  templateUrl: './value-entry-dialog.component.html',
  styleUrls: ['./value-entry-dialog.component.scss'],
})
export class ValueEntryDialog {
  public icon: string;
  public unit: string;
  public selection: string;
  public value: number;
  public acknowledge: string;
  private valueMax: number;
  private presets: ValueEntryPreset[];
  private preset: ValueEntryPreset;

  public constructor(private dialogRef: MatDialogRef<ValueEntryDialog>, @Inject(MAT_DIALOG_DATA) data: ValueEntryData) {
    this.valueMax = data?.valueMax;
    this.icon = data?.icon;
    this.unit = data?.unit;
    this.acknowledge = data?.acknowledge;
    this.presets = data?.presets;
    this.selection = data?.selection;
    this.updatePreset(0);
  }

  public updatePreset(next: number): void {
    let index = this.presets.findIndex(p => p.name === this.selection) + next;
    index = index < 0 ? 0 : index >= this.presets.length ? this.presets.length - 1 : index;
    this.preset = this.presets[index];
    this.selection = this.preset.name;
    this.value = this.preset.value;
  }

  public close() {
    this.dialogRef.close();
  }

  public ack() {
    this.dialogRef.close([this.selection, this.value]);
  }

  public stopPropagation(event: Event): void {
    event.stopPropagation();
  }

  public updateValue(delta: number): void {
    this.value += delta;
    if (delta < -999) {
      this.value = this.preset.value;
    } else if (this.value < 0) {
      this.value = 0;
    } else if (this.value > this.valueMax) {
      this.value = this.valueMax;
    }
  }
}
