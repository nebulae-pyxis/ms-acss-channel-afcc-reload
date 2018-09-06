"use strict";
const Rx = require("rxjs");
const eventSourcing = require("../../tools/EventSourcing")();
const afccReloadChannelEventConsumer = require("../../domain/AfccReloadChannelEventConsumer")();

/**
 * Singleton instance
 */
let instance;
/**
 * Micro-BackEnd key
 */
const mbeKey = "ms-acss-channel-afcc-reload-reloader_mbe_ms-acss-channel-afcc-reload";

class EventStoreService {
  constructor() {
    this.functionMap = this.generateFunctionMap();
    this.subscriptions = [];
    this.aggregateEventsArray = this.generateAggregateEventsArray();
  }

  /**
   * Starts listening to the EventStore
   * Returns observable that resolves to each subscribe agregate/event
   *    emit value: { aggregateType, eventType, handlerName}
   */
  start$() {

    Rx.Observable.interval(5000)
.mergeMap(() => {
  const buNames = [
    { name: "Nebula", id: "Nebula_001" },
    { name: "Pyxis", id: "Pyxis_002" },
    { name: "TPM", id: "TPM_003" }
  ];
  return Rx.Observable.of({
    id: Math.random().toString(),
    amount: 1000,
    timestamp: 1536180161541,
    bu: buNames[Math.floor(Math.random() * buNames.length)],
    afcc: {
      before: "card Before",
      after: "card After",
      uid: "sdosd78gsod8fg6s",
      cardId: "234563463546345634",
      balanceBefore: 1000,
      balanceAfter: 2000
    },
    source: {
      machine: "Nesas-12",
      ip: "192.168.1.15"
    }
  });
})
.mergeMap(evt => afccReloadChannelEventConsumer.handleAfccReloaded$(evt))
.subscribe(
  ok => console.log(ok),
  error => console.log(error),
  () => console.log("Finished")
);
    //default error handler
    const onErrorHandler = error => {
      console.error("Error handling  EventStore incoming event", error);
      process.exit(1);
    };
    //default onComplete handler
    const onCompleteHandler = () => {
      () => console.log("EventStore incoming event subscription completed");
    };
    console.log("EventStoreService starting ...");

    return Rx.Observable.from(this.aggregateEventsArray)
      .map(aggregateEvent => { return { ...aggregateEvent, onErrorHandler, onCompleteHandler } })
      .map(params => this.subscribeEventHandler(params));
  }

  /**
   * Stops listening to the Event store
   * Returns observable that resolves to each unsubscribed subscription as string
   */
  stop$() {
    return Rx.Observable.from(this.subscriptions).map(subscription => {
      subscription.subscription.unsubscribe();
      return `Unsubscribed: aggregateType=${aggregateType}, eventType=${eventType}, handlerName=${handlerName}`;
    });
  }

  /**
     * Create a subscrition to the event store and returns the subscription info     
     * @param {{aggregateType, eventType, onErrorHandler, onCompleteHandler}} params
     * @return { aggregateType, eventType, handlerName  }
     */
  subscribeEventHandler({ aggregateType, eventType, onErrorHandler, onCompleteHandler }) {
    const handler = this.functionMap[eventType];
    const subscription =
      //MANDATORY:  AVOIDS ACK REGISTRY DUPLICATIONS
      eventSourcing.eventStore.ensureAcknowledgeRegistry$(aggregateType)
        .mergeMap(() => eventSourcing.eventStore.getEventListener$(aggregateType, mbeKey))
        .filter(evt => evt.et === eventType)
        .mergeMap(evt => Rx.Observable.concat(
          handler.fn.call(handler.obj, evt),
          //MANDATORY:  ACKWOWLEDGE THIS EVENT WAS PROCESSED
          eventSourcing.eventStore.acknowledgeEvent$(evt, mbeKey),
        ))
        .subscribe(
          (evt) => {
            // console.log(`EventStoreService: ${eventType} process: ${evt}`);
          },
          onErrorHandler,
          onCompleteHandler
        );
    this.subscriptions.push({ aggregateType, eventType, handlerName: handler.fn.name, subscription });
    return { aggregateType, eventType, handlerName: `${handler.obj.name}.${handler.fn.name}` };
  }

  /**
  * Starts listening to the EventStore
  * Returns observable that resolves to each subscribe agregate/event
  *    emit value: { aggregateType, eventType, handlerName}
  */
  syncState$() {
    return Rx.Observable.from(this.aggregateEventsArray)
      .concatMap(params => this.subscribeEventRetrieval$(params))
  }


  /**
   * Create a subscrition to the event store and returns the subscription info     
   * @param {{aggregateType, eventType, onErrorHandler, onCompleteHandler}} params
   * @return { aggregateType, eventType, handlerName  }
   */
  subscribeEventRetrieval$({ aggregateType, eventType }) {
    const handler = this.functionMap[eventType];
    //MANDATORY:  AVOIDS ACK REGISTRY DUPLICATIONS
    return eventSourcing.eventStore.ensureAcknowledgeRegistry$(aggregateType)
      .switchMap(() => eventSourcing.eventStore.retrieveUnacknowledgedEvents$(aggregateType, mbeKey))
      .filter(evt => evt.et === eventType)
      .concatMap(evt => Rx.Observable.concat(
        handler.fn.call(handler.obj, evt),
        //MANDATORY:  ACKWOWLEDGE THIS EVENT WAS PROCESSED
        eventSourcing.eventStore.acknowledgeEvent$(evt, mbeKey)
      ));
  }

  ////////////////////////////////////////////////////////////////////////////////////////
  /////////////////// CONFIG SECTION, ASSOC EVENTS AND PROCESSORS BELOW     //////////////
  ////////////////////////////////////////////////////////////////////////////////////////

  generateFunctionMap() {
    return {

      //Sample for handling event-sourcing events, please remove
      HelloWorldEvent: {
        fn: afccReloadChannelEventConsumer.handleHelloWorld$,
        obj: afccReloadChannelEventConsumer
      },

    };
  }

  /**
  * Generates a map that assocs each AggretateType withs its events
  */
  generateAggregateEventsArray() {
    return [

      //Sample for assoc events and aggregates, please remove
      {
        aggregateType: "HelloWorld",
        eventType: "HelloWorldEvent"
      },

    ]
  }
}



module.exports = () => {
  if (!instance) {
    instance = new EventStoreService();
    console.log("NEW  EventStore instance  !!");
  }
  return instance;
};

