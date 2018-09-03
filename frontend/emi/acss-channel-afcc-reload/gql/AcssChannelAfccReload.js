import gql from "graphql-tag";

// We use the gql tag to parse our query string into a query document

//Hello world sample, please remove
export const getHelloWorld = gql`
  query getHelloWorldFromAcssChannelAfccReload{
    getHelloWorldFromAcssChannelAfccReload{
      sn      
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
