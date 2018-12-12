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

export interface AcssChannelSettings{
  id: number;
  fareCollectors: {buId: string, name: string, percentage: number}[];
  // reloadNetworks: {buId: string, name: string, percentage: number}[];
  parties: {buId: string, name: string, percentage: number}[];
  lastEdition: number;
}

@Injectable()
export class AcssChannelAfccReloadService {

  selectedTab = 0;


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
