import { Observable } from 'rxjs/Observable';
import { AcssChannelAfccReloadService } from '../acss-channel-afcc-reload.service';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { fuseAnimations } from '../../../../core/animations';
import { Subscription } from 'rxjs/Subscription';
// tslint:disable-next-line:import-blacklist
import * as Rx from 'rxjs/Rx';
import { FuseTranslationLoaderService } from '../../../../core/services/translation-loader.service';
import { locale as english } from './i18n/en';
import { locale as spanish } from './i18n/es';
import { FormBuilder, FormGroup, FormArray, FormControl, Validators } from '@angular/forms';
import { mergeMap, map, switchMap, filter, tap } from 'rxjs/operators';


@Component({
  // tslint:disable-next-line:component-selector
  selector: 'acss-channel-settings',
  templateUrl: './channel-settings.component.html',
  styleUrls: ['./channel-settings.component.scss'],
  animations: fuseAnimations
})
export class ChannelSettingsComponent implements OnInit, OnDestroy {

  allSubscription = [];
  settingsForm: FormGroup = new FormGroup({});

  constructor(
    private acssChannelAfccReloadService: AcssChannelAfccReloadService,
    private translationLoader: FuseTranslationLoaderService,
    private formBuilder: FormBuilder
  ) {
    this.translationLoader.loadTranslations(english, spanish);
  }

  ngOnInit() {
    this.settingsForm = new FormGroup({
      fareCollectors: new FormArray([]),
      reloaders: new FormArray([]),
      parties: new FormArray([] )
    }, [ this.validateParties.bind(this) ]);

    this.acssChannelAfccReloadService.getChannelSettings$(1)
      .pipe(
        mergeMap(dataResult => this.loadSettingsOnForm$(dataResult))
      )
      .subscribe(r => { });

      this.settingsForm.statusChanges.subscribe(
        r => console.log(r)
      );
  }

  ngOnDestroy() {
  }

  createItem(type?: string, businessUnitId?: string, businessUnitName?: string, percentage?: number): FormGroup {

    switch (type){
      case 'fareCollectors':
        return this.formBuilder.group({
          businessUnitId: new FormControl(businessUnitId, [Validators.required ]),
          businessUnitName: new FormControl({value: businessUnitName, disabled: true}, [Validators.required]),
          percentage: new FormControl(percentage, [Validators.required, Validators.min(0), Validators.max(100)])
        });
      case 'reloaders':
        return this.formBuilder.group({
          businessUnitId: new FormControl(businessUnitId, [Validators.required ]),
          businessUnitName: new FormControl({value: businessUnitName, disabled: true}, [Validators.required]),
          percentage: new FormControl(percentage, [Validators.required, Validators.min(0), Validators.max(100), this.validateReloaders.bind(this) ])
        });
      case 'parties':
        return this.formBuilder.group({
          businessUnitId: new FormControl(businessUnitId, [Validators.required ]),
          businessUnitName: new FormControl({value: businessUnitName, disabled: true}, [Validators.required]),
          percentage: new FormControl(percentage, [ Validators.required, Validators.min(0), Validators.max(100) ])
        });
      default: {
        return this.formBuilder.group({
          businessUnitId: new FormControl(businessUnitId),
          businessUnitName: new FormControl({value: businessUnitName, disabled: true}),
          percentage: new FormControl(percentage)
        });
      }
    }
  }

  addActor(type: string): void {
    const items = this.settingsForm.get(type) as FormArray;
    items.push(this.createItem(type));
  }


  saveConfiguration(){
    console.log('STATUS ==> ', this.settingsForm.errors );
  }

  deleteControl(formType: string, index: number){
    const formGroup = this.settingsForm.get(formType) as FormArray;
    formGroup.removeAt(index);
  }

  loadSettingsOnForm$(conf: any) {
    return Rx.Observable.forkJoin(
      Rx.Observable.from(conf.fareCollectors)
      .pipe(
        map((farecollector: { buId: string, name: string, percentage: number }) => {
          (this.settingsForm.get('fareCollectors') as FormArray).push(this.createItem('fareCollectors', farecollector.buId, farecollector.name, farecollector.percentage ));
        })
      ),
      Rx.Observable.from(conf.reloadNetworks)
      .pipe(
        map((farecollector: { buId: string, name: string, percentage: number }) => {
          (this.settingsForm.get('reloaders') as FormArray).push(this.createItem('reloaders', farecollector.buId, farecollector.name, farecollector.percentage ));
        })
      ),
      Rx.Observable.from(conf.parties)
      .pipe(
        map((farecollector: { buId: string, name: string, percentage: number }) => {
          (this.settingsForm.get('parties') as FormArray).push(this.createItem('parties', farecollector.buId, farecollector.name, farecollector.percentage ));
        })
      )
    );
  }

  validateReloaders(): { [s: string]: boolean } {
    const fareCollector = (this.settingsForm.get('fareCollectors') as FormArray).getRawValue()[0];
    const reloaders = this.settingsForm.get('reloaders') as FormArray;
    const index = reloaders.getRawValue().findIndex(e => (e.percentage + fareCollector.percentage) > 100 );
    return (index !== -1) ? { 'percentageExceeded': true } : null;
  }

  validateParties(formGroup: FormGroup): { [s: string]: boolean } {
    const acumulated = formGroup.get('parties')['controls'].reduce((count: number, fg: FormGroup) => count + fg.value.percentage, 0);
    return (acumulated > 100)
      ? { 'percentageExceeded': true }
      : (acumulated < 100)
        ? { 'percentageNotReached': true }
        : null;
  }


}
