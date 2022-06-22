import { Component, OnDestroy, OnInit } from '@angular/core';
import { SafeResourceUrl } from '@angular/platform-browser';
import { ActivatedRoute, Router } from '@angular/router';
import { Subscription } from 'rxjs';

import { EventService } from '../event.service';
import { JobStatus, PrinterStatus } from '../model';
import { FilesService } from '../services/files/files.service';
import { SocketService } from '../services/socket/socket.service';

@Component({
  selector: 'app-external-link',
  templateUrl: './external-link.component.html',
  styleUrls: ['./external-link.component.scss'],
})
export class ExternalLinkComponent implements OnInit, OnDestroy {
  private subscriptions: Subscription = new Subscription();

  public customURL: SafeResourceUrl = 'about:blank';
  public showImage = false;
  public showIframe = false;
  public actionIcon: string = null;
  public jobStatus: JobStatus;
  public printerStatus: PrinterStatus;

  public constructor(
    private router: Router,
    private route: ActivatedRoute,
    private fileService: FilesService,
    private eventService: EventService,
    private socketService: SocketService,
  ) {}

  public ngOnInit(): void {
    this.subscriptions.add(
      this.route.queryParams.subscribe(params => {
        const linkType = params.linktype;
        const url = params.url;
        const icon = params.icon;
        switch (linkType) {
          case 'img':
            this.openIMG(url, icon);
            break;
          case 'iframe':
            this.openIFrame(url, icon);
            break;
          case undefined:
            break;
          default:
            window.history.back();
            break;
        }
      }),
    );

    this.subscriptions.add(
      this.socketService.getPrinterStatusSubscribable().subscribe((status: PrinterStatus): void => {
        this.printerStatus = status;
      }),
    );

    this.subscriptions.add(
      this.socketService.getJobStatusSubscribable().subscribe((jobStatus: JobStatus): void => {
        this.jobStatus = jobStatus;
      }),
    );
  }

  public ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }

  private openIMG(url: string, icon: string): void {
    this.customURL = url;
    this.actionIcon = icon;
    this.showImage = true;
  }

  private openIFrame(url: string, icon: string): void {
    this.customURL = url;
    this.actionIcon = icon;
    this.showIframe = true;
  }

  public back(): void {
    this.showImage = false;
    this.showIframe = false;
    this.customURL = 'about:blank';
    this.actionIcon = null;
    window.history.back();
  }

  public isFileLoaded(): boolean {
    return this.fileService.getLoadedFile();
  }

  public isPrinting(): boolean {
    return this.eventService.isPrinting();
  }

  public getLayerStatusString(): string {
    if (typeof this.jobStatus.zHeight == 'number') {
      return this.jobStatus.zHeight.toString();
    }
    if ('total' in this.jobStatus.zHeight) {
      return this.jobStatus.zHeight.current + '/' + this.jobStatus.zHeight.total;
    }
    return '-/-';
  }
}
