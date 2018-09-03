import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { SharedModule } from '../../../core/modules/shared.module';
import { DatePipe } from '@angular/common';
import { FuseWidgetModule } from '../../../core/components/widget/widget.module';

import { AcssChannelAfccReloadService } from './acss-channel-afcc-reload.service';
import { AcssChannelAfccReloadComponent } from './acss-channel-afcc-reload.component';

const routes: Routes = [
  {
    path: '',
    component: AcssChannelAfccReloadComponent,
  }
];

@NgModule({
  imports: [
    SharedModule,
    RouterModule.forChild(routes),
    FuseWidgetModule
  ],
  declarations: [
    AcssChannelAfccReloadComponent    
  ],
  providers: [ AcssChannelAfccReloadService, DatePipe]
})

export class AcssChannelAfccReloadModule {}