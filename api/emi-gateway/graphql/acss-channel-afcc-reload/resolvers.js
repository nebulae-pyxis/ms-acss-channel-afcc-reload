const withFilter = require("graphql-subscriptions").withFilter;
const PubSub = require("graphql-subscriptions").PubSub;
const pubsub = new PubSub();
const Rx = require("rxjs");
const broker = require("../../broker/BrokerFactory")();
const { CustomError } = require("../../tools/customError");
const RoleValidator  = require("../../tools/RoleValidator");
const contextName = "Acss-Channel-Afcc-Reload";
//Every single error code
// please use the prefix assigned to this microservice
const INTERNAL_SERVER_ERROR_CODE = 15001;
const BUSINESS_PERMISSION_DENIED_ERROR_CODE = 15002;

function getResponseFromBackEnd$(response) {
    return Rx.Observable.of(response)
        .map(resp => {
            if (resp.result.code != 200) {
                const err = new Error();
                err.name = 'Error';
                err.message = resp.result.error;
                // this[Symbol()] = resp.result.error;
                Error.captureStackTrace(err, 'Error');
                throw err;
            }
            return resp.data;
        });
}

/**
 * Handles errors
 * @param {*} err
 * @param {*} operationName
 */
function errorHandler$(err, methodName) {
    return Rx.Observable.of(err).map(err => {
      const exception = { data: null, result: {} };
      const isCustomError = err instanceof CustomError;
      if (!isCustomError) {
        err = new CustomError(err.name, methodName, INTERNAL_SERVER_ERROR_CODE, err.message);
      }
      exception.result = {
        code: err.code,
        error: { ...err.getContent() }
      };
      return exception;
    });
  }


module.exports = {
  //// QUERY ///////
  Query: {
      AcssChannelAfccReloadGetConfiguration(root, args, context) {
          console.log("AcssChannelAfccReloadGetConfiguration", args);
          return RoleValidator.checkPermissions$(
              context.authToken.realm_access.roles,
              contextName,
              "AcssChannelAfccReloadGetConfiguration",
              BUSINESS_PERMISSION_DENIED_ERROR_CODE,
              "Permission denied",
              ["SYSADMIN"]
          )
              .mergeMap(() =>
                  broker.forwardAndGetReply$(
                      "AfccChannel",
                      "emigateway.graphql.query.getConfiguration",
                      { root, args, jwt: context.encodedToken },
                      2000
                  )
              )
              .catch(err => errorHandler$(err, "AcssChannelAfccReloadGetConfiguration"))
              .mergeMap(response => getResponseFromBackEnd$(response))
              .toPromise();
      },
      AcssChannelAfccReloadGetAfccReload(root, args, context) {
          return RoleValidator.checkPermissions$(
              context.authToken.realm_access.roles,
              contextName,
              "AcssChannelAfccReloadGetAfccReload",
              BUSINESS_PERMISSION_DENIED_ERROR_CODE,
              "Permission denied",
              ["SYSADMIN"]
          )
              .mergeMap(() => broker
                  .forwardAndGetReply$(
                      "AfccChannel",
                      "emigateway.graphql.query.getAfccReload",
                      { root, args, jwt: context.encodedToken },
                      2000
                  ))
              .catch(err => errorHandler$(err, "AcssChannelAfccReloadGetAfccReload"))
          .do(r => console.log("#######################################################################################", r))
              
              .mergeMap(response => getResponseFromBackEnd$(response))
              .toPromise();
      },
      AcssChannelAfccReloadGetAfccReloads(root, args, context) {
          return RoleValidator.checkPermissions$(
              context.authToken.realm_access.roles,
              contextName,
              "AcssChannelAfccReloadGetAfccReloads",
              BUSINESS_PERMISSION_DENIED_ERROR_CODE,
              "Permission denied",
              ["SYSADMIN"]
          )
              .mergeMap(() =>
                  broker.forwardAndGetReply$(
                      "AfccChannel",
                      "emigateway.graphql.query.getAfccReloads",
                      { root, args, jwt: context.encodedToken },
                      2000
                  ))
              .catch(err => errorHandler$(err, "AcssChannelAfccReloadGetAfccReloads"))
              .mergeMap(response => getResponseFromBackEnd$(response))
              .toPromise();
      },
      AcssChannelAfccReloadGetAfccReloadErrors(root, args, context) {
        return RoleValidator.checkPermissions$(
            context.authToken.realm_access.roles,
            contextName,
            "AcssChannelAfccReloadGetAfccReloadErrors",
            BUSINESS_PERMISSION_DENIED_ERROR_CODE,
            "Permission denied",
            ["SYSADMIN"]
        )
            .mergeMap(() =>
                broker.forwardAndGetReply$(
                    "AfccChannel",
                    "emigateway.graphql.query.getAfccReloadErrors",
                    { root, args, jwt: context.encodedToken },
                    2000
                ))
            .catch(err => errorHandler$(err, "AcssChannelAfccReloadGetAfccReloadErrors"))
            .mergeMap(response => getResponseFromBackEnd$(response))
            .toPromise();
    },
      AcssChannelAfccReloadGetTransactions(root, args, context) {
          return RoleValidator.checkPermissions$(
              context.authToken.realm_access.roles,
              contextName,
              "AcssChannelAfccReloadGetTransactions",
              BUSINESS_PERMISSION_DENIED_ERROR_CODE,
              "Permission denied",
              ["SYSADMIN"]
          )
              .mergeMap(() =>
                  broker.forwardAndGetReply$(
                      "AfccChannel",
                      "emigateway.graphql.query.getTransactions",
                      { root, args, jwt: context.encodedToken },
                      2000
                  ))
              .catch(err => errorHandler$(err, "AcssChannelAfccReloadGetTransactions"))
              .mergeMap(response => getResponseFromBackEnd$(response))
              .toPromise();
      },
    AcssChannelAfccReloadGetReloadsCount(root, args, context) {
        return RoleValidator.checkPermissions$(
            context.authToken.realm_access.roles,
            contextName,
            "AcssChannelAfccReloadGetReloadsCount",
            BUSINESS_PERMISSION_DENIED_ERROR_CODE,
            "Permission denied",
            ["SYSADMIN"]
        )
        .mergeMap(() => broker.forwardAndGetReply$(
            "AfccChannel",
            "emigateway.graphql.query.getReloadsCount",
            { root, args, jwt: context.encodedToken },
            2000
          ))
        .catch(err => errorHandler$(err, "AcssChannelAfccReloadGetReloadsCount"))          
        .mergeMap(response => getResponseFromBackEnd$(response))
        .toPromise();
    }
  },
  //// MUTATIONS ///////
  Mutation: {
    AcssChannelAfccReloadCreateConfiguration(root, args, context) {
        return RoleValidator.checkPermissions$(
            context.authToken.realm_access.roles,
            contextName,
            "AcssChannelAfccReloadCreateConfiguration",
            BUSINESS_PERMISSION_DENIED_ERROR_CODE,
            "Permission denied",
            ["SYSADMIN"]
        )
        .mergeMap(() => broker.forwardAndGetReply$(
            "AfccChannel",
            "emigateway.graphql.query.createConfiguration",
            { root, args, jwt: context.encodedToken },
            2000
          ))
        .catch(err => errorHandler$(err, "AcssChannelAfccReloadCreateConfiguration")) 
        .mergeMap(response => getResponseFromBackEnd$(response))
        .toPromise();
    }
  },
  //// SUBSCRIPTIONS ///////
  Subscription: {
    // AcssChannelAfccReloadHelloWorldSubscription: {
    //     subscribe: withFilter(
    //         (payload, variables, context, info) => {
    //             return pubsub.asyncIterator("AcssChannelAfccReloadHelloWorldSubscription");
    //         },
    //         (payload, variables, context, info) => {
    //             return true;
    //         }
    //     )
    // }
  }
};



//// SUBSCRIPTIONS SOURCES ////

const eventDescriptors = [
    // {
    //     backendEventName: 'AcssChannelAfccReloadHelloWorldEvent',
    //     gqlSubscriptionName: 'AcssChannelAfccReloadHelloWorldSubscription',
    //     dataExtractor: (evt) => evt.data,// OPTIONAL, only use if needed
    //     onError: (error, descriptor) => console.log(`Error processing ${descriptor.backendEventName}`),// OPTIONAL, only use if needed
    //     onEvent: (evt, descriptor) => console.log(`Event of type  ${descriptor.backendEventName} arraived`),// OPTIONAL, only use if needed
    // },
];


/**
 * Connects every backend event to the right GQL subscription
 */
eventDescriptors.forEach(descriptor => {
    broker
        .getMaterializedViewsUpdates$([descriptor.backendEventName])
        .subscribe(
            evt => {
                if (descriptor.onEvent) {
                    descriptor.onEvent(evt, descriptor);
                }
                const payload = {};
                payload[descriptor.gqlSubscriptionName] = descriptor.dataExtractor ? descriptor.dataExtractor(evt) : evt.data
                pubsub.publish(descriptor.gqlSubscriptionName, payload);
            },
            error => {
                if (descriptor.onError) {
                    descriptor.onError(error, descriptor);
                }
                console.error(
                    `Error listening ${descriptor.gqlSubscriptionName}`,
                    error
                );
            },

            () =>
                console.log(
                    `${descriptor.gqlSubscriptionName} listener STOPED`
                )
        );
});


