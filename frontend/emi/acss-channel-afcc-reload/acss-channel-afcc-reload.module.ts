import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { SharedModule } from '../../../core/modules/shared.module';
import { DatePipe } from '@angular/common';
import { FuseWidgetModule } from '../../../core/components/widget/widget.module';

import { AcssChannelAfccReloadService } from './acss-channel-afcc-reload.service';
import { AcssChannelAfccReloadComponent } from './acss-channel-afcc-reload.component';
import { ChannelSettingsComponent } from './channel-settings/channel-settings.component';
import { ReloadHistoryComponent } from './reload-history/reload-history.component';
import { ReloadDetailComponent } from './reload-detail/reload-detail.component';


const routes: Routes = [
  {
    path: '',
    component: AcssChannelAfccReloadComponent
  },
  {
    path: 'reload-details/:id',
    component: ReloadDetailComponent
  }
];

@NgModule({
  imports: [
    SharedModule,
    RouterModule.forChild(routes),
    FuseWidgetModule
  ],
  declarations: [
    AcssChannelAfccReloadComponent,
    ChannelSettingsComponent,
    ReloadHistoryComponent,
    ReloadDetailComponent
  ],
  providers: [ AcssChannelAfccReloadService, DatePipe]
})

export class AcssChannelAfccReloadModule {}
