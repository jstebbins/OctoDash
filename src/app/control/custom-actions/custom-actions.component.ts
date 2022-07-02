import { Component, Input } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { Router } from '@angular/router';
import _ from 'lodash-es';

import { CustomAction } from '../../config/config.model';
import { ConfigService } from '../../config/config.service';
import { ElectronService } from '../../electron.service';
import { NotificationType, PSUState } from '../../model';
import { NotificationService } from '../../notification/notification.service';
import { EnclosureService } from '../../services/enclosure/enclosure.service';
import { PrinterService } from '../../services/printer/printer.service';
import { SystemService } from '../../services/system/system.service';
import { CustomActionDialog } from '../../shared/custom-action-dialog/custom-action-dialog.component';
import { ValueEntryDialog, ValueEntryPreset } from '../../shared/value-entry-dialog/value-entry-dialog.component';

@Component({
  selector: 'app-custom-actions',
  templateUrl: './custom-actions.component.html',
  styleUrls: ['./custom-actions.component.scss'],
})
export class CustomActionsComponent {
  @Input() redirectActive = true;

  public customActions = [];
  public actionToConfirm: CustomAction;

  constructor(
    private printerService: PrinterService,
    private systemService: SystemService,
    private configService: ConfigService,
    private notificationService: NotificationService,
    private electronService: ElectronService,
    private enclosureService: EnclosureService,
    private router: Router,
    private dialog: MatDialog,
  ) {
    this.customActions = this.configService.getCustomActions();
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

  public doAction(action: CustomAction): void {
    if (action.confirm) {
      this.actionToConfirm = {
        icon: action.icon,
        command: action.command,
        color: action.color,
        confirm: false,
        exit: action.exit,
      };
    } else {
      action.command.split('; ').forEach(this.executeGCode.bind(this, action.icon));
      if (action.exit && this.redirectActive) {
        this.router.navigate(['/main-screen']);
      }
      this.hideConfirm();
    }
  }

  public editAction(number: number): void {
    const dialogRef = this.dialog.open(CustomActionDialog, {
      data: _.cloneDeep(this.customActions[number]),
    });
    dialogRef.afterClosed().subscribe(data => {
      if (data != undefined) {
        this.customActions[number] = data;
        this.electronService.on('configSaveFail', this.onConfigSaveFail.bind(this));
        this.configService.setCustomAction(number, data);
      }
    });
  }

  private onConfigSaveFail(_, errors: string[]) {
    this.notificationService.setNotification({
      heading: $localize`:@@error-invalid-config:Can't save invalid config`,
      text: String(errors),
      type: NotificationType.WARN,
      time: new Date(),
    });
  }

  public hideConfirm(): void {
    this.actionToConfirm = null;
  }

  private executeGCode(icon: string, command: string): void {
    switch (command) {
      case '[!DISCONNECT]':
        this.disconnectPrinter();
        break;
      case '[!STOPDASHBOARD]':
        this.stopOctoDash();
        break;
      case '[!RELOAD]':
        this.reloadOctoPrint();
        break;
      case '[!REBOOT]':
        this.rebootPi();
        break;
      case '[!SHUTDOWN]':
        this.shutdownPi();
        break;
      case '[!KILL]':
        this.kill();
        break;
      case '[!POWEROFF]':
        this.enclosureService.setPSUState(PSUState.OFF);
        break;
      case '[!POWERON]':
        this.enclosureService.setPSUState(PSUState.ON);
        break;
      case '[!POWERTOGGLE]':
        this.enclosureService.togglePSU();
        break;
      default: {
        if (command.includes('[!WEB]')) {
          this.openIFrame(command.replace('[!WEB]', ''), icon);
        } else if (command.includes('[!IMG]')) {
          this.openIMG(command.replace('[!IMG]', ''), icon);
        } else if (command.includes('[!NEOPIXEL]')) {
          const values = command.replace('[!NEOPIXEL]', '').split(',');
          this.setLEDColor(values[0], values[1], values[2], values[3]);
        } else if (command.includes('[!OUTPUT]')) {
          const values = command.replace('[!OUTPUT]', '').split(',');
          this.setOutput(values[0], values[1]);
        } else if (command.includes('[!OUTPUT_PWM]')) {
          const values = command.replace('[!OUTPUT_PWM]', '').split(',');
          this.setOutputPWM(values[0], values[1]);
        } else if (command.includes('[!DIALOG]')) {
          //const pattern = new RegExp(' +');
          const dialog = command.replace('[!DIALOG]', '').trim().split(/ +/);
          switch (dialog[0]) {
            case 'temperature':
              this.temperatureDialog(dialog[1]);
              break;
            default:
              break;
          }
        } else {
          this.printerService.executeGCode(command);
        }
        break;
      }
    }
  }

  // [!DISCONNECT]
  private disconnectPrinter(): void {
    this.printerService.disconnectPrinter();
  }

  // [!STOPDASHBOARD]
  private stopOctoDash(): void {
    window.close();
  }

  // [!RELOAD]
  private reloadOctoPrint(): void {
    this.systemService.sendCommand('restart');
  }

  // [!REBOOT]
  private rebootPi(): void {
    this.systemService.sendCommand('reboot');
  }

  // [!SHUTDOWN]
  private shutdownPi(): void {
    this.systemService.sendCommand('shutdown');
  }

  // [!KILL]
  private kill(): void {
    this.shutdownPi();
    setTimeout(this.stopOctoDash, 500);
  }

  // [!IMG]
  private openIMG(imgUrl: string, icon: string): void {
    this.router.navigate(['/external-link'], { queryParams: { linktype: 'img', url: imgUrl, icon: icon } });
  }

  // [!WEB]
  private openIFrame(iframeUrl: string, icon: string): void {
    this.router.navigate(['/external-link'], { queryParams: { linktype: 'iframe', url: iframeUrl, icon: icon } });
  }

  private setLEDColor(identifier: string, red: string, green: string, blue: string): void {
    this.enclosureService.setLEDColor(Number(identifier), Number(red), Number(green), Number(blue));
  }

  private setOutput(identifier: string, status: string): void {
    console.log(identifier);
    this.enclosureService.setOutput(Number(identifier), status === 'true' || status === 'on');
  }

  private setOutputPWM(identifier: string, dutyCycle: string): void {
    this.enclosureService.setOutputPWM(Number(identifier), Number(dutyCycle));
  }

  private getPresets(target: string, valueOff: number, valueDefault: number): ValueEntryPreset[] {
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

  private temperatureDialog(target: string): void {
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
