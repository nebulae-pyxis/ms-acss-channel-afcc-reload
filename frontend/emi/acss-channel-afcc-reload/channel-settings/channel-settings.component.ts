import { AcssChannelAfccReloadService } from '../acss-channel-afcc-reload.service';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { fuseAnimations } from '../../../../core/animations';
import { Subscription } from 'rxjs/Subscription';
import * as Rx from 'rxjs/Rx';
import { FuseTranslationLoaderService } from '../../../../core/services/translation-loader.service';
import { locale as english } from './i18n/en';
import { locale as spanish } from './i18n/es';
import { FormBuilder, FormGroup, FormArray } from '@angular/forms';


@Component({
  // tslint:disable-next-line:component-selector
  selector: 'acss-channel-settings',
  templateUrl: './channel-settings.component.html',
  styleUrls: ['./channel-settings.component.scss'],
  animations: fuseAnimations
})
export class ChannelSettingsComponent implements OnInit, OnDestroy {

  allSubscription = [];
  settingsForm: FormGroup = new FormGroup({
    farecollectors: new FormArray([ this.createItem()]),
    reloaders: new FormArray([this.createItem()]),
    // parties: new FormArray([this.createItem()])

  });
  items: FormArray;

  constructor(
    private acssChannelAfccReloadService: AcssChannelAfccReloadService,
    private translationLoader: FuseTranslationLoaderService,
    private formBuilder: FormBuilder
  ) {
    this.translationLoader.loadTranslations(english, spanish);
  }

  ngOnInit() {
    // this.settingsForm = this.formBuilder.group({
    //   customerName: '',
    //   email: '',
    //   items: this.formBuilder.array([ this.createItem() ])
    // });

  }


  ngOnDestroy() {
  }

  createItem(): FormGroup {
    return this.formBuilder.group({
      name: '',
      description: '',
      price: ''
    });
  }

  addItem(type: string): void {
    this.items = this.settingsForm.get(type) as FormArray;
    this.items.push(this.createItem());
  }

}
