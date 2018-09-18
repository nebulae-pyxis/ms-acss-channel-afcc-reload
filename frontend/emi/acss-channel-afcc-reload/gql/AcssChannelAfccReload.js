import gql from "graphql-tag";

// We use the gql tag to parse our query string into a query document

//Hello world sample, please remove
export const getChannelSettings = gql`
  query getChannelSettings($id: BigInt!) {
    AcssChannelAfccReloadGetConfiguration(id: $id) {
      id
      editor
      lastEdition
      editor
      fareCollectors {
        buId
        name
        percentage
      }
      reloadNetworks {
        buId
        name
        percentage
      }
      parties {
        buId
        name
        percentage
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
