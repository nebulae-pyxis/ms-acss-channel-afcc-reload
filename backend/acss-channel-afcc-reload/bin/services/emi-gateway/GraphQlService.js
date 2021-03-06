"use strict";

const afccReloadChannel = require("../../domain/AfccReloadChannel")();
const broker = require("../../tools/broker/BrokerFactory")();
const Rx = require("rxjs");
const Business = require('../../domain/Business');
const jsonwebtoken = require("jsonwebtoken");
const jwtPublicKey = process.env.JWT_PUBLIC_KEY.replace(/\\n/g, "\n");

let instance;

class GraphQlService {


  constructor() {
    this.functionMap = this.generateFunctionMap();
    this.subscriptions = [];
  }

  /**
   * Starts GraphQL actions listener
   */
  start$() {

    //default on error handler
    const onErrorHandler = error => {
      console.error("Error handling  GraphQl incoming event", error);
      process.exit(1);
    };

    //default onComplete handler
    const onCompleteHandler = () => {
      () => console.log("GraphQlService incoming event subscription completed");
    };


    return Rx.Observable.from(this.getSubscriptionDescriptors())
    .map(aggregateEvent => {return { ...aggregateEvent, onErrorHandler, onCompleteHandler }})
    .map(params => this.subscribeEventHandler(params));
  }

  /**
   * build a Broker listener to handle GraphQL requests procesor
   * @param {*} descriptor 
   */
  subscribeEventHandler({
    aggregateType,
    messageType,
    onErrorHandler,
    onCompleteHandler
  }) {
    const handler = this.functionMap[messageType];
    const subscription = broker
      .getMessageListener$([aggregateType], [messageType])
      .mergeMap(message => {        
        return Rx.Observable.of(
          {
            authToken: jsonwebtoken.verify(message.data.jwt, jwtPublicKey),
            message
          }
        )
        .catch(err => {
          return Rx.Observable.of(
            {
              response,
              correlationId: message.id,
              replyTo: message.attributes.replyTo 
            }
          )
          .mergeMap(msg => this.sendResponseBack$(msg))
        })
      })
      //ROUTE MESSAGE TO RESOLVER
      .mergeMap(({ authToken, message }) =>
        handler.fn
          .call(handler.obj, message.data, authToken)
          .map(response => {
            return {
              response,
              correlationId: message.id,
              replyTo: message.attributes.replyTo
            };
          })
      )
      .mergeMap(msg => this.sendResponseBack$(msg))
      .catch(error => {
        return Rx.Observable.of(null) // Custom error missing
      })
      .subscribe(
        msg => { },
        onErrorHandler,
        onCompleteHandler
      );
    this.subscriptions.push({
      aggregateType,
      messageType,
      handlerName: handler.fn.name,
      subscription
    });
    return {
      aggregateType,
      messageType,
      handlerName: `${handler.obj.name}.${handler.fn.name}`
    };
  }

  // send response back if neccesary
  sendResponseBack$(msg) {
    return Rx.Observable.of(msg)
      .mergeMap(({ response, correlationId, replyTo }) => {
        if (replyTo) {
          return broker.send$(
            replyTo,
            "emigateway.graphql.Query.response",
            response,
            { correlationId }
          );
        } else {
          return Rx.Observable.of(undefined);
        }
      })
  }

  stop$() {
    Rx.Observable.from(this.subscriptions).map(subscription => {
      subscription.subscription.unsubscribe();
      return `Unsubscribed: aggregateType=${aggregateType}, eventType=${eventType}, handlerName=${handlerName}`;
    });
  }

  ////////////////////////////////////////////////////////////////////////////////////////
  /////////////////// CONFIG SECTION, ASSOC EVENTS AND PROCESSORS BELOW  /////////////////
  ////////////////////////////////////////////////////////////////////////////////////////


  /**
   * returns an array of broker subscriptions for listening to GraphQL requests
   */
  getSubscriptionDescriptors() {
    return [ 
      {
        aggregateType: "AfccChannel",
        messageType: "emigateway.graphql.query.getConfiguration"
      },
      {
        aggregateType: "AfccChannel",
        messageType: "emigateway.graphql.query.getAfccReload"
      },
      {
        aggregateType: "AfccChannel",
        messageType: "emigateway.graphql.query.getAfccReloads"
      },
      {
        aggregateType: "AfccChannel",
        messageType: "emigateway.graphql.query.getTransactions"
      },
      {
        aggregateType: "AfccChannel",
        messageType: "emigateway.graphql.query.createConfiguration"
      },   
      {
        aggregateType: "AfccChannel",
        messageType: "emigateway.graphql.query.getReloadsCount"
      },
      {
        aggregateType: "AfccChannel",
        messageType: "emigateway.graphql.query.getAfccReloadErrors"
      },
      {
        aggregateType: "Business",
        messageType: "emigateway.graphql.query.getAcssChannelBusinessByFilter"
      }
    ];
  }

  /**
   * returns a map that assocs GraphQL request with its processor
   */
  generateFunctionMap() {    
    return {
      "emigateway.graphql.query.getConfiguration": {
        fn: afccReloadChannel.getConfiguration$,
        obj: afccReloadChannel
      },
      "emigateway.graphql.query.getAfccReload": {
        fn: afccReloadChannel.getAfccReload$,
        obj: afccReloadChannel
      },
      "emigateway.graphql.query.getAfccReloads": {
        fn: afccReloadChannel.getAfccReloads$,
        obj: afccReloadChannel
      },
      "emigateway.graphql.query.getTransactions": {
        fn: afccReloadChannel.getTransactions$,
        obj: afccReloadChannel
      },
      "emigateway.graphql.query.createConfiguration": {
        fn: afccReloadChannel.createConfiguration$,
        obj: afccReloadChannel
      },
      "emigateway.graphql.query.getReloadsCount": {
        fn: afccReloadChannel.getReloadsCount$,
        obj: afccReloadChannel
      },
      "emigateway.graphql.query.getAfccReloadErrors": {
        fn: afccReloadChannel.getAfccReloadErrors$,
        obj: afccReloadChannel
      },
      "emigateway.graphql.query.getAcssChannelBusinessByFilter": {
        fn: Business.cqrs.getBusinessUnits$,
        obj: Business.cqrs
      }
    };
  }

}


module.exports = () => {
  if (!instance) {
    instance = new GraphQlService();
    console.log(`${instance.constructor.name} Singleton created`);
  }
  return instance;
};
