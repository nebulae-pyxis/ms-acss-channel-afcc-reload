import { AcssChannelAfccReloadService } from './acss-channel-afcc-reload.service';
import { Component, OnDestroy, OnInit, ViewEncapsulation } from '@angular/core';
import { fuseAnimations } from '../../../core/animations';
import { locale as english } from './i18n/en';
import { locale as spanish } from './i18n/es';
import { FuseTranslationLoaderService } from '../../../core/services/translation-loader.service';

@Component({
  // tslint:disable-next-line:component-selector
  selector: 'acss-channel-afcc-reload',
  templateUrl: './acss-channel-afcc-reload.component.html',
  styleUrls: ['./acss-channel-afcc-reload.component.scss'],
  encapsulation: ViewEncapsulation.None,
  animations: fuseAnimations
})
export class AcssChannelAfccReloadComponent implements OnInit, OnDestroy {

  constructor(
    private translationLoader: FuseTranslationLoaderService,
    private acssChannelAfccReloadService: AcssChannelAfccReloadService
    ) {
    this.translationLoader.loadTranslations(english, spanish);
  }

  ngOnInit() {
  }

  ngOnDestroy() {
  }

  onTabChange(event: any){
    console.log(event);
    this.acssChannelAfccReloadService.selectedTab = event.index;
  }

  getTabIndex(){
    return this.acssChannelAfccReloadService.selectedTab;
  }

}
