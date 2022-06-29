import { Component, OnDestroy, OnInit } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { Subscription } from 'rxjs';

import { ConfigService } from '../config/config.service';
import { PrinterStatus } from '../model';
import { PrinterService } from '../services/printer/printer.service';
import { SocketService } from '../services/socket/socket.service';
import { ValueEntryDialog, ValueEntryPreset } from '../shared/value-entry-dialog/value-entry-dialog.component';

@Component({
  selector: 'app-printer-status',
  templateUrl: './printer-status.component.html',
  styleUrls: ['./printer-status.component.scss'],
})
export class PrinterStatusComponent implements OnInit, OnDestroy {
  private subscriptions: Subscription = new Subscription();
  public printerStatus: PrinterStatus;
  public status: string;

  public constructor(
    private printerService: PrinterService,
    private configService: ConfigService,
    private socketService: SocketService,
    private dialog: MatDialog,
  ) {}

  public ngOnInit(): void {
    this.subscriptions.add(
      this.socketService.getPrinterStatusSubscribable().subscribe((status: PrinterStatus): void => {
        this.printerStatus = status;
      }),
    );
  }

  public ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }

  public getPresets(target: string, valueOff: number, valueDefault: number): ValueEntryPreset[] {
    const settings = this.printerService.fetchSettings();
    const presets: Array<ValueEntryPreset> = [];
    let preset: ValueEntryPreset = {
      name: 'Off',
      value: valueOff,
    };
    presets.push(preset);
    preset = {
      name: 'Default',
      value: valueDefault,
    };
    presets.push(preset);
    if (target != 'fan') {
      settings?.temperature?.profiles?.forEach(profile => {
        preset = {
          name: profile.name,
          value: profile[target],
        };
        presets.push(preset);
      });
    }
    return presets;
  }

  public showQuickControl(target: string): void {
    let valueDefault: number;
    let valueMax: number;
    let presets: ValueEntryPreset[];
    let icon: string;
    let unit: string;

    switch (target) {
      case 'nozzle':
        valueMax = 280;
        valueDefault = this.configService.getDefaultHotendTemperature();
        presets = this.getPresets('extruder', 0, valueDefault);
        icon = 'nozzle.svg';
        unit = '°C';
        break;
      case 'bed':
        valueMax = 120;
        valueDefault = this.configService.getDefaultHeatbedTemperature();
        presets = this.getPresets('bed', 0, valueDefault);
        icon = 'heat-bed.svg';
        unit = '°C';
        break;
      case 'fan':
        valueMax = 100;
        valueDefault = this.configService.getDefaultFanSpeed();
        presets = this.getPresets('fan', 0, valueDefault);
        icon = 'fan.svg';
        unit = '%';
        break;
      default:
        return;
    }
    const dialogRef = this.dialog.open(ValueEntryDialog, {
      data: {
        icon: icon,
        unit: unit,
        selection: 'Default',
        acknowledge: 'set',
        valueMax: valueMax,
        presets: presets,
      },
    });
    dialogRef.afterClosed().subscribe(data => {
      if (data != undefined) {
        const [, value] = data;
        switch (target) {
          case 'nozzle':
            this.printerService.setTemperatureHotend(value);
            break;
          case 'bed':
            this.printerService.setTemperatureBed(value);
            break;
          case 'fan':
            this.printerService.setFanSpeed(value);
            break;
        }
      }
    });
  }
}
