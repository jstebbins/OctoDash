import { Component, Input } from '@angular/core';
import { Router } from '@angular/router';

import { CustomAction } from '../../config/config.model';
import { ConfigService } from '../../config/config.service';
import { PSUState } from '../../model';
import { EnclosureService } from '../../services/enclosure/enclosure.service';
import { PrinterService } from '../../services/printer/printer.service';
import { SystemService } from '../../services/system/system.service';

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
    private enclosureService: EnclosureService,
    private router: Router,
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
}
