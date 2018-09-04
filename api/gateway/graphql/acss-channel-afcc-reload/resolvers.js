const withFilter = require("graphql-subscriptions").withFilter;
const PubSub = require("graphql-subscriptions").PubSub;
const pubsub = new PubSub();
const Rx = require("rxjs");
const broker = require("../../broker/BrokerFactory")();

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


module.exports = {

    //// QUERY ///////

    Query: {
        getHelloWorldFromAcssChannelAfccReload(root, args, context) {
            return broker
                .forwardAndGetReply$(
                    "HelloWorld",
                    "gateway.graphql.query.getHelloWorldFromAcssChannelAfccReload",
                    { root, args, jwt: context.encodedToken },
                    2000
                )
                .mergeMap(response => getResponseFromBackEnd$(response))
                .toPromise();
        },
        AcssChannelAfccReloadGetConfiguration(root, args, context){
            return broker
            .forwardAndGetReply$(
                "AfccChannel",
                "gateway.graphql.query.GetConfiguration",
                { root, args, jwt: context.encodedToken },
                2000
            )
            .mergeMap(response => getResponseFromBackEnd$(response))
            .toPromise();
        },
        AcssChannelAfccReloadGetAfccReload(root, args, context){
            return broker
            .forwardAndGetReply$(
                "AfccChannel",
                "gateway.graphql.query.getAfccReload",
                { root, args, jwt: context.encodedToken },
                2000
            )
            .mergeMap(response => getResponseFromBackEnd$(response))
            .toPromise();

        },
        AcssChannelAfccReloadGetAfccReloads(root, args, context){
            return broker
            .forwardAndGetReply$(
                "AfccChannel",
                "gateway.graphql.query.getAfccReloads",
                { root, args, jwt: context.encodedToken },
                2000
            )
            .mergeMap(response => getResponseFromBackEnd$(response))
            .toPromise();
        },
        AcssChannelAfccReloadGetTransactions(root, args, context){
            return broker
            .forwardAndGetReply$(
                "AfccChannel",
                "gateway.graphql.query.getTransactions",
                { root, args, jwt: context.encodedToken },
                2000
            )
            .mergeMap(response => getResponseFromBackEnd$(response))
            .toPromise();
        },
        AcssChannelAfccReloadGetTransactionsFromAfccEvt(root, args, context){
            return broker
            .forwardAndGetReply$(
                "AfccChannel",
                "gateway.graphql.query.getTransactionsFromAfccEvt",
                { root, args, jwt: context.encodedToken },
                2000
            )
            .mergeMap(response => getResponseFromBackEnd$(response))
            .toPromise();
        }

    },

    //// MUTATIONS ///////
    Mutation: {
        AcssChannelAfccReloadCreateConfiguration(root, args, context){
            return broker
            .forwardAndGetReply$(
                "AfccChannel",
                "gateway.graphql.query.createConfiguration",
                { root, args, jwt: context.encodedToken },
                2000
            )
            .mergeMap(response => getResponseFromBackEnd$(response))
            .toPromise();
        }

    },
    //// SUBSCRIPTIONS ///////
    Subscription: {
        AcssChannelAfccReloadHelloWorldSubscription: {
            subscribe: withFilter(
                (payload, variables, context, info) => {
                    return pubsub.asyncIterator("AcssChannelAfccReloadHelloWorldSubscription");
                },
                (payload, variables, context, info) => {
                    return true;
                }
            )
        }

    }
};



//// SUBSCRIPTIONS SOURCES ////

const eventDescriptors = [
    {
        backendEventName: 'AcssChannelAfccReloadHelloWorldEvent',
        gqlSubscriptionName: 'AcssChannelAfccReloadHelloWorldSubscription',
        dataExtractor: (evt) => evt.data,// OPTIONAL, only use if needed
        onError: (error, descriptor) => console.log(`Error processing ${descriptor.backendEventName}`),// OPTIONAL, only use if needed
        onEvent: (evt, descriptor) => console.log(`Event of type  ${descriptor.backendEventName} arraived`),// OPTIONAL, only use if needed
    },
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


