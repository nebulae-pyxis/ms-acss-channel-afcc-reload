import { AcssChannelAfccReloadService } from './acss-channel-afcc-reload.service';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { fuseAnimations } from '../../../core/animations';
import { Subscription } from 'rxjs/Subscription';
import * as Rx from 'rxjs/Rx';

@Component({
  // tslint:disable-next-line:component-selector
  selector: 'acss-channel-afcc-reload',
  templateUrl: './acss-channel-afcc-reload.component.html',
  styleUrls: ['./acss-channel-afcc-reload.component.scss'],
  animations: fuseAnimations
})
export class AcssChannelAfccReloadComponent implements OnInit, OnDestroy {
  
  helloWorld: String = 'Hello World static';
  helloWorldLabelQuery$: Rx.Observable<any>;
  helloWorldLabelSubscription$: Rx.Observable<any>;

  constructor(private AcssChannelAfccReloadService: AcssChannelAfccReloadService  ) {    

  }
    

  ngOnInit() {
    this.helloWorldLabelQuery$ = this.AcssChannelAfccReloadService.getHelloWorld$();
    this.helloWorldLabelSubscription$ = this.AcssChannelAfccReloadService.getHelloWorldSubscription$();
  }

  
  ngOnDestroy() {
  }

}
