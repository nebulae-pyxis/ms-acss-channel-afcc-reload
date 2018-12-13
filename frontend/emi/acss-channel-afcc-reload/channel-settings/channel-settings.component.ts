import { Observable } from 'rxjs/Observable';
import { AcssChannelAfccReloadService, AcssChannelSettings } from '../acss-channel-afcc-reload.service';
import { Component, OnDestroy, OnInit, Input } from '@angular/core';
import { fuseAnimations } from '../../../../core/animations';
// tslint:disable-next-line:import-blacklist
import * as Rx from 'rxjs/Rx';
import { FuseTranslationLoaderService } from '../../../../core/services/translation-loader.service';
import { locale as english } from './i18n/en';
import { locale as spanish } from './i18n/es';
import { FormBuilder, FormGroup, FormArray, FormControl, Validators } from '@angular/forms';
import { mergeMap, map, tap, filter } from 'rxjs/operators';
import { ActivatedRoute } from '@angular/router';
import { MatDialog } from '@angular/material';
import { ActorDefinitionComponent } from './actor-definition/actor-definition.component';

export interface Actor{
  buId: string;
  fromBu: string;
  name: string;
  percentage: number;
}


@Component({
  // tslint:disable-next-line:component-selector
  selector: 'acss-channel-settings',
  templateUrl: './channel-settings.component.html',
  styleUrls: ['./channel-settings.component.scss'],
  animations: fuseAnimations
})

export class ChannelSettingsComponent implements OnInit, OnDestroy {

  @Input() currentVersion: boolean;
  subscriptions = [];
  settingsForm: FormGroup = new FormGroup({});
  currentConf: any;
  dialogRef: any;

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
      this.subscriptions.push(
        this.route.params
        .pipe(
          map(params => params.conf ? params.conf : 1),
          mergeMap(confId  => this.acssChannelAfccReloadService.getChannelSettings$(confId)),
          mergeMap(response  => this.errorHandler$(response, 'AcssChannelAfccReloadGetConfiguration')),
          mergeMap((conf) => this.initializeForm$().pipe( mergeMap(() => Rx.Observable.of(conf) ) )),
          tap(result => console.log('####################', result)),
          map(queryResult => queryResult 
            ? queryResult
            : ({
              id: 1,
              lastEdition: Date.now(),
              salesWithMainPocket: {
                actors: [{buId: null, fromBu: null, percentage: 0}],
                surplusCollector: {buId: null, fromBu: null, percentage: null},
                bonusCollector: {buId: null, fromBu: null, percentage: null},
               },
              salesWithBonusPocket: {
                actors: [{buId: null, fromBu: null, percentage: 0}],
                investmentCollector: { buId: null, fromBu: null, percentage: null },
              },
              salesWithCreditPocket: {
                actors: [{buId: null, fromBu: null, percentage: 0}],
                bonusCollector: { buId: null, fromBu: null, percentage: null }
              }
            })
          ),
          tap(conf => this.currentConf = conf ),
          mergeMap(dataResult =>  this.loadSettingsOnForm$(dataResult)
          )
        )
        .subscribe(done => console.log('COMPLETED FORM ==> ', this.settingsForm), error => console.log(error), () => {} )
      );
  }

  ngOnDestroy() {
  }

  errorHandler$(response:any, queryName: string) {
    return Rx.Observable.of(response)
      .pipe(
        filter(() => !response.errors),
        map(() => response.data[queryName])
      )
  }

  initializeForm$() {
    return Rx.Observable.of({})
      .pipe(
        map(() => {
          this.settingsForm = new FormGroup({
            salesWithMainPocket: new FormGroup({
              actors: new FormArray([]),
              surplusCollector: new FormGroup({}),
              bonusCollector: new FormGroup({})
            }),
            salesWithBonusPocket: new FormGroup({
              actors: new FormArray([]),
              investmentCollector: new FormGroup({})
            }),
            salesWithCreditPocket: new FormGroup({
              actors: new FormArray([]),
              bonusCollector: new FormGroup({})
            })
          }, [ this.validateActorsArrays.bind(this)] );

          this.settingsForm.get('salesWithMainPocket').get('actors').setValidators(Validators.min(1));
          this.settingsForm.get('salesWithBonusPocket').get('actors').setValidators(Validators.min(1));
          this.settingsForm.get('salesWithCreditPocket').get('actors').setValidators(Validators.min(1));


        }),
        // tap(() => this.formInitialized = true)
      );
  }

  createItem(type?: string, businessUnitFrom?: string, businessUnitId?: string, percentage?: number): FormGroup {

    switch (type){      
        case 'actor':
          return this.formBuilder.group({
            businessUnitFrom: new FormControl(businessUnitFrom),
            businessUnitId: new FormControl(businessUnitId),
            percentage: new FormControl(percentage, [Validators.required, Validators.min(0), Validators.max(100)])
          });
        case 'surplusCollector':
          return this.formBuilder.group({
            businessUnitFrom: new FormControl(businessUnitFrom, [Validators.required]),
            businessUnitId: new FormControl(businessUnitId, [Validators.required])
          });
        case 'bonusCollector':
          return this.formBuilder.group({
            businessUnitFrom: new FormControl(businessUnitFrom, [Validators.required]),
            businessUnitId: new FormControl(businessUnitId, [Validators.required])
          });
        case 'investment':
          return this.formBuilder.group({
            businessUnitFrom: new FormControl(businessUnitFrom, [Validators.required]),
            businessUnitId: new FormControl(businessUnitId, [Validators.required])
          });
      default: {
        return this.formBuilder.group({
          businessUnitFrom: new FormControl(businessUnitFrom, [Validators.required]),
          businessUnitId: new FormControl(businessUnitId),
          percentage: new FormControl(percentage)
        });
      }
    }
  }

  addActorFormGroup(type: string): void {
    const items = this.settingsForm.get(type)['controls']['actors'] as FormArray;
    items.push(this.createItem('actor'));
  }

  viewDefinition(type: string){
    this.dialogRef = this.dialog.open( ActorDefinitionComponent, {
      data: {
        title: type,
        content: this.translationLoader.getTranslate().instant(`DEFINITIONS.${type}`)
      }
    });
  }

  saveConfiguration() {
    const formValue = this.settingsForm.getRawValue();
    Rx.Observable.of({
      id: 1,
      lastEdition: Date.now(),
      salesWithMainPocket: {
        actors: [...formValue.salesWithMainPocket.actors.map(e => ({ 
          buId: e.businessUnitId.id,
          percentage: e.percentage,
          fromBu: e.businessUnitFrom.id
        }))],
        surplusCollector: [formValue.salesWithMainPocket.surplusCollector].map(e => ({ 
          fromBu: e.businessUnitFrom.id,
          buId: e.businessUnitId.id
        }))[0],
        bonusCollector: [formValue.salesWithMainPocket.bonusCollector].map(e => ({
          buId: e.businessUnitId.id,
          fromBu: e.businessUnitFrom.id }))[0]
      },
      salesWithBonusPocket: {
        actors: [...formValue.salesWithBonusPocket.actors.map(e => ({ 
          buId: e.businessUnitId.id,
          percentage: e.percentage,
          fromBu: e.businessUnitFrom.id }))],
        investmentCollector: [formValue.salesWithBonusPocket.investmentCollector].map(e => ({           
          buId: e.businessUnitId.id,
          fromBu: e.businessUnitFrom.id }))[0],
      },
      salesWithCreditPocket: {
        actors: [...formValue.salesWithCreditPocket.actors.map(e => ({ 
          buId: e.businessUnitId.id,
          percentage: e.percentage,
          fromBu: e.businessUnitFrom.id 
        }))],
        bonusCollector: [formValue.salesWithCreditPocket.bonusCollector].map(e => ({
          buId: e.businessUnitId.id,
          fromBu: e.businessUnitFrom.id }))[0]
      }
    })
      .pipe(
        tap(r => console.log('RESULT ==> ', r)),
        mergeMap((settings: AcssChannelSettings) => this.acssChannelAfccReloadService.saveChannelSettings(settings))
      )
      .subscribe(
        ok => { },
        error => { console.log('', error); },
        () => { console.log('Stream finished!!'); }
      );
  }

  restoreSettings(i){
    console.log(this.settingsForm.getRawValue());
    Rx.Observable.of({})
    .pipe(
      tap(() => this.initializeForm$() ),
      mergeMap(() => this.loadSettingsOnForm$(this.currentConf))
    )
    .subscribe( ok => {}, err => console.log(err), () => console.log('Stream finished!!') );
  }

  /**
   *
   * @param confType string: salesWithMainPocket | salesWithBonusPocket | salesWithCreditPocket
   * @param index number
   */
  deleteActorFormGroup( confType: string, index: number){
    const formGroup = ( this.settingsForm.controls[confType]['controls']['actors'] as FormArray );
    formGroup.removeAt(index);
  }

  /**
   *
   * @param conf AFCC channel configuration
   */
  loadSettingsOnForm$(conf: any) {
    return Rx.Observable.forkJoin(
      Rx.Observable.of(conf.salesWithMainPocket)
        .pipe(
          mergeMap(mainConf => Rx.Observable.forkJoin(
            Rx.Observable.of(mainConf.surplusCollector)
            .pipe(
              map((sc: Actor) => this.createItem('surplusCollector', sc.fromBu, sc.buId) ),
              map( formControl =>  { this.settingsForm.controls['salesWithMainPocket']['controls']['surplusCollector'] = formControl; } )
            ),
            Rx.Observable.of(mainConf.bonusCollector)
            .pipe(
              map((sc: Actor) => this.createItem('bonusCollector', sc.fromBu, sc.buId) ),
              map( formControl =>  { this.settingsForm.controls['salesWithMainPocket']['controls']['bonusCollector'] = formControl; } )
            ),
            Rx.Observable.from(mainConf.actors)
            .pipe(
              map((actor: Actor) => this.createItem('actor', actor.fromBu, actor.buId, actor.percentage)),
              map( formControl =>  {
                ( this.settingsForm.controls['salesWithMainPocket']['controls']['actors'] as FormArray ).push(
                formControl
              ); } )
            )
          ))
        ),
      Rx.Observable.of(conf.salesWithBonusPocket)
        .pipe(
          mergeMap(configWithBonusPocket => Rx.Observable.forkJoin(
            Rx.Observable.of(configWithBonusPocket.investmentCollector)
            .pipe(
              map((sc: Actor) => this.createItem('investment', sc.fromBu, sc.buId) ),
              map( formControl =>  { this.settingsForm.controls['salesWithBonusPocket']['controls']['investmentCollector'] = formControl; } )
            ),
            Rx.Observable.from(configWithBonusPocket.actors)
            .pipe(
              map((actor: Actor) => this.createItem('actor', actor.fromBu, actor.buId, actor.percentage)),
              map( formControl =>  {
                ( this.settingsForm.controls['salesWithBonusPocket']['controls']['actors'] as FormArray ).push(
                formControl
              ); } )
            )
          ))
        ),
      Rx.Observable.of(conf.salesWithCreditPocket)
        .pipe(
          mergeMap(configWithCreditPocket => Rx.Observable.forkJoin(
            Rx.Observable.of(configWithCreditPocket.bonusCollector)
            .pipe(
              map((sc: Actor) => this.createItem('bonusCollector', sc.fromBu, sc.buId) ),
              map( formControl =>  { this.settingsForm.controls['salesWithCreditPocket']['controls']['bonusCollector'] = formControl; } )
            ),
            Rx.Observable.from(configWithCreditPocket.actors)
            .pipe(
              map((actor: Actor) => this.createItem('actor', actor.fromBu, actor.buId, actor.percentage)),
              map( formControl =>  {
                ( this.settingsForm.controls['salesWithCreditPocket']['controls']['actors'] as FormArray ).push(
                formControl
              ); } )
            )
          ))
        )
    ).pipe(
      tap(() => { this.formInitialized = true; })
    );
  }


  validateActorsArrays(formGroup: FormGroup): { [s: string]: boolean } {
    if (this.formInitialized) {
      const salesWithMainPocketActors = this.settingsForm.get('salesWithMainPocket')['controls']['actors'] as FormArray;
      const salesWithBonusPocket = this.settingsForm.get('salesWithMainPocket')['controls']['actors'] as FormArray;
      const salesWithCreditPocket = this.settingsForm.get('salesWithMainPocket')['controls']['actors'] as FormArray;


      return (salesWithBonusPocket.length == 0 || salesWithMainPocketActors.length == 0 || salesWithCreditPocket.length == 0)
        ? { 'actorsRequired': true }
        : null
    }
    return null;

  }

}
