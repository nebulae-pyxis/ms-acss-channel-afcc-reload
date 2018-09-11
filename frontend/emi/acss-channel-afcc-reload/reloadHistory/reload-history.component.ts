import { AcssChannelAfccReloadService } from '../acss-channel-afcc-reload.service';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { fuseAnimations } from '../../../../core/animations';
import { Subscription } from 'rxjs/Subscription';
import * as Rx from 'rxjs/Rx';

@Component({
  // tslint:disable-next-line:component-selector
  selector: 'afcc-reload-history',
  templateUrl: './reload-history.component.html',
  styleUrls: ['./reload-history.component.scss'],
  animations: fuseAnimations
})
export class ReloadHistoryComponent implements OnInit, OnDestroy {

  helloWorld: String = 'Hello World static';
  helloWorldLabelQuery$: Rx.Observable<any>;
  helloWorldLabelSubscription$: Rx.Observable<any>;

  constructor(private acssChannelAfccReloadService: AcssChannelAfccReloadService  ) {

  }

  ngOnInit() {
    this.helloWorldLabelQuery$ = this.acssChannelAfccReloadService.getChannelSettings$(1);
    this.helloWorldLabelSubscription$ = this.acssChannelAfccReloadService.getHelloWorldSubscription$();
  }


  ngOnDestroy() {
  }

}
