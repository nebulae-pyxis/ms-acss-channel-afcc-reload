"use strict";

const Rx = require("rxjs");
const AfccReloadChannelDA = require("../data/AfccReloadChannelDA");
const TransactionDA = require("../data/TransactionsDA");
const AfccReloadsDA = require("../data/AfccReloadsDA");
const eventSourcing = require("../tools/EventSourcing")();
const Event = require("@nebulae/event-store").Event;
const broker = require("../tools/broker/BrokerFactory")();
const MATERIALIZED_VIEW_TOPIC = "materialized-view-updates";
const {
  CustomError,
  DefaultError
} = require("../tools/customError");

/**
 * Singleton instance
 */
let instance;

class AfccReloadChannel{
  constructor() {
    // this.initHelloWorldEventGenerator();
  }

  /**
   *  HelloWorld Query, please remove
   *  this is a queiry form GraphQL
   */
  getHelloWorld$({ args, jwt, fieldASTs }, authToken) {
    console.log(args);
    return AfccReloadChannelDA.getHelloWorld$()
      .mergeMap(rawResponse => this.buildSuccessResponse$(rawResponse))
      .catch(err => this.errorHandler$(err));
  }

  /**
   * Handle HelloWorld Query, please remove
   * This in an Event HAndler for Event- events
   */
  handleHelloWorld$(evt) {
    return Rx.Observable.of('Some process for HelloWorld event');
  }


  // initHelloWorldEventGenerator(){
  //   Rx.Observable.interval(1000)
  //   .take(120)
  //   .mergeMap(id =>  AfccReloadChannelDA.getHelloWorld$())    
  //   .mergeMap(evt => {
  //     return broker.send$(MATERIALIZED_VIEW_TOPIC, 'AcssChannelAfccReloadHelloWorldEvent',evt);
  //   }).subscribe(
  //     (evt) => console.log('Gateway GraphQL sample event sent, please remove'),
  //     (err) => console.error('Gateway GraphQL sample event sent ERROR, please remove'),
  //     () => console.log('Gateway GraphQL sample event sending STOPPED, please remove'),
  //   );
  // }


  getConfiguration$({ args, jwt }, authToken) {
    console.log(args);
    return AfccReloadChannelDA.searchConfiguration$(args.id)
    .mergeMap(payload => this.buildAndSendResponse$(payload))
    .do(r => console.log(JSON.stringify(r)));
  }

  getAfccReload$({ args, jwt }, authToken){
    console.log("getAfccReload$", args, "$$$$$$$$$$$$$$$$$");
    return AfccReloadsDA.searchEvent$(args.id)
    .mergeMap(payload => this.buildAndSendResponse$(payload));
  }

  getAfccReloads$({ args, jwt }, authToken){
    console.log("getAfccReloads$", args, "$$$$$$$$$$$$$$$$$$$$");
    return AfccReloadsDA.searchReloads$(args)
    .mergeMap(payload => this.buildAndSendResponse$(payload));
  }

  getReloadsCount$({ args, jwt }, authToken){
    return AfccReloadsDA.getReloadsCount$()
    .mergeMap(payload => this.buildAndSendResponse$(payload));
  }

  getTransactions$({ args, jwt }, authToken){
    return TransactionDA.searchTransactions$(args)
    .mergeMap(payload => this.buildAndSendResponse$(payload));
  }

  /**
   * 
   * @param {Object} param0 Object that contains query Arguments, jwt and fiel
   * @param {String} authToken 
   */
  getTransactionsFromAfccEvt$({ args, jwt }, authToken){
    console.log("getTransactionsFromAfccEvt", args);
    return TransactionDA.searchTransactionFromAfccEvt$('123')
    .mergeMap(payload => this.buildAndSendResponse$(payload));
  }

  createConfiguration$({ args, jwt }, authToken) {
    console.log("createConfiguration$", args); 

    return Rx.Observable.of({})
      .mergeMap(() =>
        eventSourcing.eventStore
          .emitEvent$(
            new Event({
              eventType: "ACSSConfigurationCreated",
              eventTypeVersion: 1,
              aggregateType: "AfccChannel",
              aggregateId: Date.now(),
              data: args.input,
              user: authToken.preferred_username
            })
          )
      )
      .mapTo({
        code: 200,
        message: "persistBasicInfoTag$"
      })
      .do(r => console.log("RESPUESTA ==>", r))
      .mergeMap(payload => this.buildAndSendResponse$(payload));
  }


  //#region  mappers for API responses
  buildAndSendResponse$(payload){
    return Rx.Observable.of(payload)
    .mergeMap(rawPayload => this.buildSuccessResponse$(rawPayload))
    .catch(err => { this.errorHandler$(err) });  
  }

  buildSuccessResponse$(rawRespponse) {
    return Rx.Observable.of(rawRespponse)
      .map(resp => {
        return {
          data: resp,
          result: {
            code: 200
          }
        }
      });
  }

  errorHandler$(err) {
    return Rx.Observable.of(err)
      .map(err => {
        const exception = { data: null, result: {} };
        const isCustomError = err instanceof CustomError;
        if(!isCustomError){
          err = new DefaultError(err)
        }
        exception.result = {
            code: err.code,
            error: {...err.getContent()}
          }
        return exception;
      });
  }

  //#endregion


}

/**
 * @returns { AfccReloadChannel } unique instance
 */
module.exports = () => {
  if (!instance) {
    instance = new AfccReloadChannel();
    console.log(`${instance.constructor.name} Singleton created`);
  }
  return instance;
};
