import { Injectable } from '@angular/core';
import { Observable } from 'rxjs/Observable';
import * as Rx from 'rxjs';
import { GatewayService } from '../../../api/gateway.service';
import {
  getChannelSettings,
  AcssChannelAfccReloadHelloWorldSubscription
} from './gql/AcssChannelAfccReload';

@Injectable()
export class AcssChannelAfccReloadService {


  constructor(private gateway: GatewayService) {

  }

  /**
   * Hello World sample, please remove
   */
  getChannelSettings$(id: number) {
    return this.gateway.apollo
      .watchQuery<any>({
        query: getChannelSettings,
        fetchPolicy: 'network-only',
        variables: {
          id: id
        }
      })
      .valueChanges.map(
        resp => resp.data.AcssChannelAfccReloadGetConfiguration
      );
  }

  /**
  * Hello World subscription sample, please remove
  */
 getHelloWorldSubscription$(): Observable<any> {
  return this.gateway.apollo
    .subscribe({
      query: AcssChannelAfccReloadHelloWorldSubscription
    })
    .map(resp => resp.data.AcssChannelAfccReloadHelloWorldSubscription.sn);
}

}
