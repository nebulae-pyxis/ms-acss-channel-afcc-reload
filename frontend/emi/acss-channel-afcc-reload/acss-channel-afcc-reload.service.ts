import { Injectable } from '@angular/core';
import { Observable } from 'rxjs/Observable';
import { GatewayService } from '../../../api/gateway.service';
import {
  getChannelSettings,
  getReloadErrors,
  createAcssChannelSettings,
  getReloads,
  fetchTotalReloadsCount,
  getCompleteReloadInfo,
  getBusinessFiltered
} from './gql/AcssChannelAfccReload';
import { of } from 'rxjs';
import { map, mergeMap } from 'rxjs/operators';

export interface AcssChannelActorConf {
  buId: string;
  fromBu: string;
  percentage?: number;
}

export interface AcssChannelSettings{
  id: number;
  lastEdition: number;
  salesWithMainPocket: {
    actors: AcssChannelActorConf[],
    surplusCollector: AcssChannelActorConf,
    bonusCollector: AcssChannelActorConf
   };
   salesWithBonusPocket: {
    actors: AcssChannelActorConf[]
    investmentCollector: AcssChannelActorConf
   };
   salesWithCreditPocket: {
    actors: AcssChannelActorConf[]
   };

}

@Injectable()
export class AcssChannelAfccReloadService {

  selectedTab = 0;
  businessInCache: { id: string, name: string }[] = [];


  constructor(private gateway: GatewayService) {
  }

  // getBusinessInCache$(businessId: string){
  //   console.log('getBusinessInCache$', businessId);
  //   return of(businessId)
  //   .pipe(
  //     map(buId => this.businessInCache.find(e => e.id === buId) ),
  //     mergeMap( businessFound => businessFound
  //         ? of(businessFound)
  //         : this.getFilteredBuinessList$(businessId, 1)
  //         // this.getFilteredBuinessList$(businessId, 1)
  //         //   .pipe(
  //         //     map( (businessfetched: any) => {
  //         //       this.businessInCache.push({id: businessfetched._id, name: businessfetched.name });
  //         //       return businessfetched;
  //         //     })
  //         //   )
  //       )
  //   );


  // }

  getChannelSettings$(id: number) {
    return this.gateway.apollo
      .query<any>({
        query: getChannelSettings,
        fetchPolicy: 'network-only',
        variables: {
          id: id
        }
      });
  }

  saveChannelSettings(settings: AcssChannelSettings ){
    return this.gateway.apollo
    .mutate<any>({
      mutation: createAcssChannelSettings,
      variables: {
        input: settings
      },
      errorPolicy: 'all'
    });
  }

 /**
 * Gets the reloads filtered by page, count and a search filter.
 * @param pageValue Page number of the user table that you want to recover.
 * @param countValue Max amount of user that will be return
 * @param searchFilter Search filter (Username, name, email)
 */
getBasicReloadsInfo$(pageValue, countValue, searchFilter){
  return this.gateway.apollo
  .query<any>({
    query: getReloads,
    variables: {
      page: pageValue,
      count: countValue,
      searchFilter: searchFilter
    },
    fetchPolicy: 'network-only',
    errorPolicy: 'all'
  });
}


getFilteredBuinessList$(filterText: string, limit?: number){
  return this.gateway.apollo
  .query<any>({
    query: getBusinessFiltered,
    variables: {
      filter: filterText,
      limit: limit
    },
    fetchPolicy: 'network-only',
    errorPolicy: 'all'
  });
}

getBasicReloadErrorsInfo$(pageValue, countValue, searchFilter){
  return this.gateway.apollo
  .query<any>({
    query: getReloadErrors,
    variables: {
      page: pageValue,
      count: countValue,
      searchFilter: searchFilter
    },
    fetchPolicy: 'network-only',
    errorPolicy: 'all'
  });
}

getCompleteReloadInfo$(reloadId: string){
  return this.gateway.apollo
  .query<any>({
    query: getCompleteReloadInfo,
    variables: {
      reloadId: reloadId
    },
    fetchPolicy: 'network-only',
    errorPolicy: 'all'
  });
}

fetchTotalReloadsCount$(){
  return this.gateway.apollo
  .query<any>({
    query: fetchTotalReloadsCount,
    fetchPolicy: 'network-only',
    errorPolicy: 'all'
  });
}

fetchTotalReloadErrorsCount$(){
  return this.gateway.apollo
  .query<any>({
    query: fetchTotalReloadsCount,
    fetchPolicy: 'network-only',
    errorPolicy: 'all'
  });
}

}
