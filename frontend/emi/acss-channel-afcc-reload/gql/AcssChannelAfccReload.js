import gql from "graphql-tag";

// We use the gql tag to parse our query string into a query document

export const getChannelSettings = gql`
  query getChannelSettings($id: BigInt!) {
    AcssChannelAfccReloadGetConfiguration(id: $id) {
      id
      editor
      lastEdition
      salesWithMainPocket {
        actors { buId, fromBu, name, percentage }
        surplusCollector { buId, fromBu, percentage }
        bonusCollector { buId, fromBu, name, percentage }
      }
      salesWithBonusPocket {
        actors { buId, fromBu, name, percentage }
        investmentCollector { buId, fromBu, name, percentage }
      }
      salesWithCreditPocket {
        actors { buId, fromBu, name, percentage }
      }
    }
  }
`;

export const createAcssChannelSettings = gql`
  mutation saveSettings($input: AcssChannelAfccReloadConfigurationInput!) {
    AcssChannelAfccReloadCreateConfiguration(input: $input) {
      code
      message
    }
  }
`;

export const getReloads = gql`
  query getReloads($page: Int!, $count: Int!, $searchFilter: String) {
    AcssChannelAfccReloadGetAfccReloads(
      page: $page
      count: $count
      searchFilter: $searchFilter
    ) {
      id
      timestamp
      amount
      businessId
      source {
        machine
        ip
      }
    }
  }
`;

export const getReloadErrors = gql`
  query getReloadsErrors($page: Int!, $count: Int!, $searchFilter: String) {
    AcssChannelAfccReloadGetAfccReloadErrors(
      page: $page
      count: $count
      searchFilter: $searchFilter
    ) {
    name
    message
    afccEvent{
      data{
        amount
        source{
          ip
        }
        businessId
      }
    }
    channleConf{
      id
      lastEdition
      editor
    }
    timestamp
  }

  }
`;

export const fetchTotalReloadsCount = gql`
  query fetchTotalReloadsCount {
    AcssChannelAfccReloadGetReloadsCount
  }
`;

export const getCompleteReloadInfo = gql`
  query getCompleteReloadInfo($reloadId: String!){
  AcssChannelAfccReloadGetAfccReload(id: $reloadId){
    id
    amount
    businessId
    afcc{
      data{
        before
        after
      }
      UId
      cardId
      balance{
        before
        after
      }
    }
    source{
      machine
      ip
    }
    transactions{
      timestamp
      fromBu
      toBu
      amount
      type
      channel{
        id
        v
        c
      }
      evt{
        id
        type
        user
      }
    }
  }
}
`;

export const getBusinessFiltered = gql`
  query BusinessList($filter: String, $limit: Int) {
    AcssChannelAfccReloadGetBusinessByFilter(
      filter: $filter
      limit: $limit
    ) {
      id
      name
    }
  }
`;
