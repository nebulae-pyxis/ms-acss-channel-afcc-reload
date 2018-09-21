import { AcssChannelAfccReloadService } from '../acss-channel-afcc-reload.service';
import { Component, OnDestroy, OnInit, Inject } from '@angular/core';
import { fuseAnimations } from '../../../../core/animations';
// tslint:disable-next-line:import-blacklist
import * as Rx from 'rxjs/Rx';
import { MatDialog, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material';

@Component({
  // tslint:disable-next-line:component-selector
  selector: 'actor-definition',
  templateUrl: './actor-definition.component.html',
  styleUrls: ['./actor-definition.component.scss'],
  animations: fuseAnimations
})

export class ActorDefinitionComponent implements OnInit, OnDestroy {

  data: { title: string, content: string } = null;

  constructor(
    public dialogRef: MatDialogRef<ActorDefinitionComponent>,
    public dialog: MatDialog,
    @Inject(MAT_DIALOG_DATA) private dataInjected: {title: string, content: string},
  ) {
    this.data = dataInjected;
    console.log(this.data);
  }

  ngOnInit() {
  }

  ngOnDestroy(): void {
  }

}
