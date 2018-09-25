import { Component, Inject, ViewEncapsulation, Injectable } from '@angular/core';
import { fuseAnimations } from '../../../../../core/animations';
import { MatDialog, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material';

interface Content {
  title: string;
  content: string;
}

@Component({
  // tslint:disable-next-line:component-selector
  selector: 'reload-error-detail-dialog',
  templateUrl: './reload-error-details.component.html',
  styleUrls: ['./reload-error-details.component.scss'],
  animations: fuseAnimations,
  encapsulation: ViewEncapsulation.None
})
export class ReloadErrorDetailsComponent {
  data: Content;
  reloadError: any;

  constructor(
    public dialogRef: MatDialogRef<ReloadErrorDetailsComponent>,
    public dialog: MatDialog,
    @Inject(MAT_DIALOG_DATA) private dataInjected: Content
  ) {
    this.data = dataInjected;
    this.reloadError = dataInjected.content;
    console.log('DATA ===> ', this.data);

  }
}
