import { Component, OnDestroy, OnInit } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { Subscription } from 'rxjs';

import { ConfigService } from '../config/config.service';
import { PrinterStatus } from '../model';
import { PrinterService } from '../services/printer/printer.service';
import { SocketService } from '../services/socket/socket.service';
import { ValueEntryDialog } from '../shared/value-entry-dialog/value-entry-dialog.component';

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

  public showQuickControlHotend(): void {
    const dialogRef = this.dialog.open(ValueEntryDialog, {
      data: {
        valueDefault: this.configService.getDefaultHotendTemperature(),
        valueMax: 280,
        icon: 'nozzle.svg',
        unit: '°C',
      },
    });
    dialogRef.afterClosed().subscribe(data => {
      if (data != undefined) {
        this.printerService.setTemperatureHotend(data);
      }
    });
  }

  public showQuickControlHeatbed(): void {
    const dialogRef = this.dialog.open(ValueEntryDialog, {
      data: {
        valueDefault: this.configService.getDefaultHeatbedTemperature(),
        valueMax: 120,
        icon: 'heat-bed.svg',
        unit: '°C',
      },
    });
    dialogRef.afterClosed().subscribe(data => {
      if (data != undefined) {
        this.printerService.setTemperatureBed(data);
      }
    });
  }

  public showQuickControlFan(): void {
    const dialogRef = this.dialog.open(ValueEntryDialog, {
      data: {
        valueDefault: this.configService.getDefaultFanSpeed(),
        valueMax: 100,
        icon: 'fan.svg',
        unit: '%',
      },
    });
    dialogRef.afterClosed().subscribe(data => {
      if (data != undefined) {
        this.printerService.setFanSpeed(data);
      }
    });
  }
}
