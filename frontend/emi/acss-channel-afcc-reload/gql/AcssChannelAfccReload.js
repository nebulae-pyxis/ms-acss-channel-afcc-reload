import gql from "graphql-tag";

// We use the gql tag to parse our query string into a query document

//Hello world sample, please remove
export const getChannelSettings = gql`query getChannelSettings($id: BigInt!){
  AcssChannelAfccReloadGetConfiguration(id: $id){
    id,
    editor,
    lastEdition,
    editor,
    fareCollectors{
      buId,
      name
      percentage
    }
    reloadNetworks{
      buId
      name
      percentage
    }
    parties{
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


//Hello world sample, please remove
export const AcssChannelAfccReloadHelloWorldSubscription = gql`
  subscription{
    AcssChannelAfccReloadHelloWorldSubscription{
      sn
  }
}`;
