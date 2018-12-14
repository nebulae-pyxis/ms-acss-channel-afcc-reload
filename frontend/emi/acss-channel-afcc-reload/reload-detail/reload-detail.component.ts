import { mergeMap, map, tap, toArray, mapTo } from 'rxjs/operators';
import { Component, OnInit, OnDestroy } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Subscription, from, merge, forkJoin, of } from 'rxjs';
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
        mergeMap((response: any) =>
          of(response)
          .pipe(
            mergeMap(() => from(response.transactions)
              .pipe(
                mergeMap((transaction: any) => forkJoin(
                  of(transaction),
                  this.getBusinessName$(transaction.FromBu),
                  this.getBusinessName$(transaction.toBu),
                )),
                map(([tx, fromBuName, toBuName]) => ({ ...tx, fromBuName, toBuName})),
                toArray()
              )
            ),
            map(transactions => ({ ...response, transactions }))
          )
        ),
        tap(r => console.log(r)),
        tap(reload => this.selectedReload = reload)
      )
      .subscribe(params => { })
    );
  }


  ngOnDestroy(): void {
    this.subscriptions.forEach(s => s.unsubscribe());
  }

  getBusinessName$(businessId: string){
    return this.acssChannelAfccReloadService.getFilteredBuinessList$(businessId, 1)
    .pipe(
      map(response => response.data.AcssChannelAfccReloadGetBusinessByFilter),
      mergeMap(rawData => (rawData && rawData.length === 1)
        ? of(rawData[0].name)
        : of('')
      )
    );
  }



}
