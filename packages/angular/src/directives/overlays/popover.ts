/* eslint-disable */
/* tslint:disable */
import { IonPopover as IonPopoverBase, ProxyCmp } from '@ionic/angular/common';
import { ChangeDetectionStrategy, Component } from '@angular/core';

@ProxyCmp({
  inputs: [
    'alignment',
    'animated',
    'arrow',
    'keepContentsMounted',
    'backdropDismiss',
    'cssClass',
    'dismissOnSelect',
    'enterAnimation',
    'event',
    'isOpen',
    'keyboardClose',
    'leaveAnimation',
    'mode',
    'showBackdrop',
    'translucent',
    'trigger',
    'triggerAction',
    'reference',
    'size',
    'side',
  ],
  methods: ['present', 'dismiss', 'onDidDismiss', 'onWillDismiss'],
})
@Component({
  selector: 'ion-popover',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<ng-container [ngTemplateOutlet]="template" *ngIf="isCmpOpen || keepContentsMounted"></ng-container>`,
  inputs: [
    'alignment',
    'animated',
    'arrow',
    'keepContentsMounted',
    'backdropDismiss',
    'cssClass',
    'dismissOnSelect',
    'enterAnimation',
    'event',
    'isOpen',
    'keyboardClose',
    'leaveAnimation',
    'mode',
    'showBackdrop',
    'translucent',
    'trigger',
    'triggerAction',
    'reference',
    'size',
    'side',
  ],
})
export class IonPopover extends IonPopoverBase {}
