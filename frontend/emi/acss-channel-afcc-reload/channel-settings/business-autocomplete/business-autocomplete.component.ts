import { Observable } from 'rxjs/Observable';
import { AcssChannelAfccReloadService, AcssChannelSettings } from '../../acss-channel-afcc-reload.service';
import { Component, OnDestroy, OnInit, Input, Output, EventEmitter } from '@angular/core';
import { fuseAnimations } from '../../../../../core/animations';
import { Subscription } from 'rxjs/Subscription';
// tslint:disable-next-line:import-blacklist
import * as Rx from 'rxjs/Rx';
import { FuseTranslationLoaderService } from '../../../../../core/services/translation-loader.service';
import { locale as english } from '../i18n/en';
import { locale as spanish } from '../i18n/es';
import { FormBuilder, FormGroup, FormArray, FormControl, Validators } from '@angular/forms';
import { mergeMap, map, tap, filter, mapTo, startWith, debounceTime, distinctUntilChanged, toArray, takeUntil } from 'rxjs/operators';
import { ActivatedRoute } from '@angular/router';
import { MatDialog } from '@angular/material';
import { runInThisContext } from 'vm';
// tslint:disable-next-line:import-blacklist
import { Subject } from 'rxjs/Rx';

export interface Actor{
  buId: string;
  fromBu: string;
  name: string;
  percentage: number;
}


@Component({
  // tslint:disable-next-line:component-selector
  selector: 'business-autocomplete',
  templateUrl: './business-autocomplete.component.html',
  styleUrls: ['./business-autocomplete.component.scss'],
  animations: fuseAnimations
})

export class BusinessAutocompleteComponent implements OnInit, OnDestroy {

  private ngUnsubscribe = new Subject();

  @Input() editable: boolean;
  @Input() formGroup: FormGroup;
  @Input() controlName: string;
  @Input() placeHolder: String;
  @Output() onSelected = new EventEmitter();


  subscriptions = [];
  currentConf: any;
  businessQueryFiltered$: Observable<any>;

  formInitialized = false;

  constructor(
    private acssChannelAfccReloadService: AcssChannelAfccReloadService,
    private translationLoader: FuseTranslationLoaderService,
    private formBuilder: FormBuilder,
    private route: ActivatedRoute,
    public dialog: MatDialog
  ) {
    this.translationLoader.loadTranslations(english, spanish);
  }

  ngOnInit() {
    this.businessQueryFiltered$ = this.formGroup.get(this.controlName).valueChanges
      .pipe(
        // startWith(this.formGroup.get(this.controlName).value),
        debounceTime(500),
        distinctUntilChanged(),
        mergeMap((filterText: string) => this.getBusinessFiltered$(filterText, 10))
      );

    Rx.Observable.of(this.formGroup.get(this.controlName).value)
    .pipe(
      filter(filterText => filterText !== null),
      mergeMap(filterText => this.getBusinessFiltered$(filterText, 1)),
      filter(result => result && result.length === 1),
      map(result => result[0]),
      tap(result => this.formGroup.get(this.controlName).setValue({name: result.name, id: result.id }) )
    )
    .subscribe(() => {}, error => console.log(error), () => {});


  }

  ngOnDestroy() {
    this.ngUnsubscribe.next();
    this.ngUnsubscribe.complete();
  }


  onSelectBusinessEvent(business){
    // this.formGroup.get(this.controlName).setValue(business.id)
    this.onSelected.emit(business);
  }


  getBusinessFiltered$(filterText: string, limit: number): Observable<any[]> {
    return this.acssChannelAfccReloadService.getFilteredBuinessList$(filterText, limit).pipe(
      filter(resp => !resp.errors),
      map(result => result.data.AcssChannelAfccReloadGetBusinessByFilter),
      takeUntil(this.ngUnsubscribe)
    );
  }

  displayFn(business) {
    return business ?  business.name : '';
  }
}
