import { Observable } from 'rxjs/Observable';
import { AcssChannelAfccReloadService, AcssChannelSettings } from '../acss-channel-afcc-reload.service';
import { Component, OnDestroy, OnInit, Input } from '@angular/core';
import { fuseAnimations } from '../../../../core/animations';
import { Subscription } from 'rxjs/Subscription';
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
    console.log('this.currentVersion', this.currentVersion);
    this.settingsForm = new FormGroup({
      fareCollectors: new FormArray([]),
      parties: new FormArray([], [Validators.required] ),
      surplusCollectors: new FormArray([], [Validators.required] )
    }, [ this.validateParties.bind(this) ]);

      this.subscriptions.push(
        this.route.params
        .pipe(
          map(params => params.conf ? params.conf : 1),
          mergeMap(conf  => this.acssChannelAfccReloadService.getChannelSettings$(conf)),
          filter(r => r !== null ),
          tap(conf => this.currentConf = conf ),
          mergeMap(dataResult =>  this.loadSettingsOnForm$(dataResult))
        )
        .subscribe(form => {
          console.log('FORM IS', form );
        })
      );
  }

  ngOnDestroy() {
  }

  createItem(type?: string, businessUnitFrom?: string, businessUnitId?: string, percentage?: number): FormGroup {

    switch (type){
      case 'fareCollectors':
        return this.formBuilder.group({
          businessUnitFrom: new FormControl( businessUnitFrom, [Validators.required]),
          businessUnitId: new FormControl(businessUnitId, [Validators.required]),
          percentage: new FormControl(percentage, [
              Validators.required,
              Validators.min(0),
              Validators.max(100)
            ]
          )
        });
      case 'parties':
        return this.formBuilder.group({
          businessUnitFrom: new FormControl(businessUnitFrom, [Validators.required]),
          businessUnitId: new FormControl(businessUnitId, [Validators.required]),
          percentage: new FormControl(percentage, [Validators.required, Validators.min(0), Validators.max(100)])
        });
        case 'surplusCollectors':
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

  addActor(type: string): void {
    const items = this.settingsForm.get(type) as FormArray;
    items.push(this.createItem(type));
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
      fareCollectors: [...formValue.fareCollectors.map(e => ({ buId: e.businessUnitId, percentage: e.percentage, fromBu: e.businessUnitFrom }))],
      parties: [...formValue.parties.map(e => ({ buId: e.businessUnitId, percentage: e.percentage, fromBu: e.businessUnitFrom }))],
      surplusCollectors: [...formValue.surplusCollectors.map(e => ({ buId: e.businessUnitId, fromBu: e.businessUnitFrom }))],
      lastEdition: Date.now()
    })
      .pipe(
        mergeMap((settings: AcssChannelSettings) => this.acssChannelAfccReloadService.saveChannelSettings(settings))
      )
      .subscribe(
        ok => { console.log(ok); },
        error => { console.log('', error); },
        () => { console.log('Stream finished!!'); }
      );
  }

  logForm(){
    console.log(this.settingsForm);
  }

  restoreSettings(i){
    console.log(i);

    console.log('FORMULARIO ==> ', this.settingsForm.getRawValue());
    Rx.Observable.of({})
    .pipe(
      tap(() => {
        this.settingsForm = new FormGroup({
          fareCollectors: new FormArray([], [Validators.required]),
          // reloaders: new FormArray([], [Validators.required]),
          parties: new FormArray([], [Validators.required] ),
          surplusCollectors: new FormArray([], [Validators.required] )
        }, [ this.validateParties.bind(this) ]);
      }),
      mergeMap(() => this.loadSettingsOnForm$(this.currentConf))
    )
    .subscribe(
      ok => console.log(ok),
      err => console.log(err),
      () => console.log('Stream finished!!')
    );
  }

  deleteControl(formType: string, index: number){
    const formGroup = this.settingsForm.get(formType) as FormArray;
    formGroup.removeAt(index);
  }

  loadSettingsOnForm$(conf: any) {

    return Rx.Observable.forkJoin(
      Rx.Observable.from(conf.fareCollectors ? conf.fareCollectors : [])
      .pipe(
        map((actor: Actor) => {
          (this.settingsForm.get('fareCollectors') as FormArray).push(
            this.createItem('fareCollectors', actor.fromBu, actor.buId, actor.percentage )
            );
        })
      ),
      Rx.Observable.from(conf.parties ? conf.parties : [])
      .pipe(
        map((actor: Actor) => {
          (this.settingsForm.get('parties') as FormArray).push(
            this.createItem('parties', actor.fromBu, actor.buId, actor.percentage)
            );
        })
      ),
      Rx.Observable.from(conf.surplusCollectors ? conf.surplusCollectors : [] )
        .pipe(
          map((actor: Actor) => {
            (this.settingsForm.get('surplusCollectors') as FormArray).push(
              this.createItem('surplusCollectors', actor.fromBu, actor.buId)
            );
          })
        )
    );
  }

  validateParties(formGroup: FormGroup): { [s: string]: boolean } {
    const acumulated = formGroup.get('parties')['controls'].reduce((count: number, fg: FormGroup) => count + fg.value.percentage, 0);
    return (acumulated > 100)
      ? { 'percentageExceeded': true }
      : (acumulated < 100 && acumulated !== 0)
        ? { 'percentageNotReached': true }
        : null;
  }


}
