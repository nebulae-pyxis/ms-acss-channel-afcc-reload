import { AcssChannelAfccReloadService } from '../acss-channel-afcc-reload.service';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { fuseAnimations } from '../../../../core/animations';
import { Subscription } from 'rxjs/Subscription';
// tslint:disable-next-line:import-blacklist
import * as Rx from 'rxjs/Rx';
import { MatTableDataSource, MatSnackBar } from '@angular/material';
import { FuseTranslationLoaderService } from '../../../../core/services/translation-loader.service';
import { locale as english } from './i18n/en';
import { locale as spanish } from './i18n/es';
import { mergeMap, tap, filter, map } from 'rxjs/operators';
import { from, pipe } from 'rxjs';

@Component({
  // tslint:disable-next-line:component-selector
  selector: 'afcc-reload-history',
  templateUrl: './reload-history.component.html',
  styleUrls: ['./reload-history.component.scss'],
  animations: fuseAnimations
})
export class ReloadHistoryComponent implements OnInit, OnDestroy {

  dataSource = new MatTableDataSource();
  displayedColumns = ['buID', 'buName', 'machine', 'amount'];

  page = 0;
  count = 10;
  searchFilter = '';

  constructor(
    private acssChannelAfccReloadService: AcssChannelAfccReloadService,
    private translationLoader: FuseTranslationLoaderService,
    private snackBar: MatSnackBar
    ) {
      this.translationLoader.loadTranslations(english, spanish);
  }

  ngOnInit() {

    this.refreshDataTable(
      this.page,
      this.count,
      this.searchFilter
    );

  }

  ngOnDestroy() {
  }


    /**
   * Finds the users and updates the table data
   * @param page page number
   * @param count Max amount of users that will be return.
   * @param searchFilter Search filter
   */
  refreshDataTable(page, count, searchFilter) {
    this.acssChannelAfccReloadService.getReloads$(page, count, searchFilter)
    .pipe(
      mergeMap(resp => this.graphQlAlarmsErrorHandler$(resp)),
      filter((resp: any) => !resp.errors || resp.errors.length === 0),
      map(response => response.data.AcssChannelAfccReloadGetAfccReloads)
    )
    .subscribe(
      (reloads: any[]) => {
        const data = reloads.map(reload => ({ buId: reload.bu.id, buName: reload.bu.name, machine: reload.source.machine, amount: reload.amount  }));
        console.log(data);
        this.dataSource.data = data;
      }
    );
  }

    /**
   * Handles the Graphql errors and show a message to the user
   * @param response
   */
  graphQlAlarmsErrorHandler$(response){
    return Rx.Observable.of(JSON.parse(JSON.stringify(response)))
    .pipe(
      tap((resp: any) => {
        this.showSnackBarError(resp);
        return resp;
      })
    );
  }

   /**
   * Shows an error snackbar
   * @param response
   */
  showSnackBarError(response){
    if (response.errors){

      if (Array.isArray(response.errors)) {
        response.errors.forEach(error => {
          if (Array.isArray(error)) {
            error.forEach(errorDetail => {
              this.showMessageSnackbar('ERRORS.' + errorDetail.message.code);
            });
          }else{
            response.errors.forEach((err: any) => {
              this.showMessageSnackbar('ERRORS.' + err.message.code);
            });
          }
        });
      }
    }
  }

  /**
  * Shows a message snackbar on the bottom of the page
  * @param messageKey Key of the message to i18n
  * @param detailMessageKey Key of the detail message to i18n
  */
  showMessageSnackbar(messageKey, detailMessageKey?) {
    // let translationData = [];
    // if (messageKey) {
    //   translationData.push(messageKey);
    // }

    // if (detailMessageKey) {
    //   translationData.push(detailMessageKey);
    // }

    // this.translate.get(translationData)
    //   .subscribe(data => {
    //     this.snackBar.open(
    //       messageKey ? data[messageKey] : '',
    //       detailMessageKey ? data[detailMessageKey] : '',
    //       {
    //         duration: 2000
    //       }
    //     );
    //   });
    console.log('###############', messageKey, detailMessageKey);
  }


}
