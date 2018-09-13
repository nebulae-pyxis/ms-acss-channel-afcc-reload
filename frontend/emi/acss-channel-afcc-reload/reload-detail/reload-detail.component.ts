import { mergeMap, map } from 'rxjs/operators';
import { Component, OnInit, OnDestroy } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Subscription } from 'rxjs';
import { AcssChannelAfccReloadService } from '../acss-channel-afcc-reload.service';

@Component({
  // tslint:disable-next-line:component-selector
  selector: 'afcc-reload-detail',
  templateUrl: './reload-detail.component.html',
  styleUrls: ['./reload-detail.component.scss']
})
export class ReloadDetailComponent implements OnInit, OnDestroy {

  subscriptions: Subscription[] = [];

  constructor(
    private acssChannelAfccReloadService: AcssChannelAfccReloadService,
    private route: ActivatedRoute
  ) { }

  ngOnInit() {
    this.subscriptions.push(
      this.route.params
      .pipe(
        map(params => params.id),
        mergeMap(reloadId => this.acssChannelAfccReloadService.getCompleteReloadInfo$(reloadId) )
      )
      .subscribe(params => {
        console.log('The reload ID to search is ==> ', params);
      })
    );
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach(s => s.unsubscribe());
  }

}
