import { mergeMap, map, tap } from 'rxjs/operators';
import { Component, OnInit, OnDestroy } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Subscription } from 'rxjs';
import { AcssChannelAfccReloadService } from '../acss-channel-afcc-reload.service';
import { FuseTranslationLoaderService } from '../../../../core/services/translation-loader.service';
import { locale as english } from './i18n/en';
import { locale as spanish } from './i18n/es';

@Component({
  // tslint:disable-next-line:component-selector
  selector: 'afcc-reload-detail',
  templateUrl: './reload-detail.component.html',
  styleUrls: ['./reload-detail.component.scss']
})
export class ReloadDetailComponent implements OnInit, OnDestroy {

  subscriptions: Subscription[] = [];
  selectedReload: any = undefined;

  constructor(
    private acssChannelAfccReloadService: AcssChannelAfccReloadService,
    private route: ActivatedRoute,
    private translationLoader: FuseTranslationLoaderService
  ) {
    this.translationLoader.loadTranslations(english, spanish);
   }

  ngOnInit() {
    this.subscriptions.push(
      this.route.params
      .pipe(
        map(params => params.id),
        mergeMap(reloadId => this.acssChannelAfccReloadService.getCompleteReloadInfo$(reloadId)),
        map(response => response.data.AcssChannelAfccReloadGetAfccReload),
        tap(reload => this.selectedReload = reload)
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
