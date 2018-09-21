import { Component, Inject, ViewEncapsulation } from '@angular/core';
import { fuseAnimations } from '../../../../core/animations';
import { MatDialog, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material';

interface Content {
  title: string;
  content: string;
}

@Component({
  // tslint:disable-next-line:component-selector
  selector: 'actor-definition',
  templateUrl: './actor-definition.component.html',
  styleUrls: ['./actor-definition.component.scss'],
  animations: fuseAnimations,
  encapsulation: ViewEncapsulation.None
})
export class ActorDefinitionComponent {
  data: Content;

  constructor(
    public dialogRef: MatDialogRef<ActorDefinitionComponent>,
    public dialog: MatDialog,
    @Inject(MAT_DIALOG_DATA) private dataInjected: Content
  ) {
    this.data = dataInjected;
  }
}
