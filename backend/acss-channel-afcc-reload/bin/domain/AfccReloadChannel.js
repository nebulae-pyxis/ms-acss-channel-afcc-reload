"use strict";

const Rx = require("rxjs");
const AfccReloadChannelDA = require("../data/AfccReloadChannelDA");
const TransactionDA = require("../data/TransactionsDA");
const AfccReloadsDA = require("../data/AfccReloadsDA")
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


  getConfiguration$({ args, jwt, fieldASTs }, authToken) {
    console.log(args);
    return AfccReloadChannelDA.searchConfiguration$(args.id)
      .mergeMap(rawResponse => this.buildSuccessResponse$(rawResponse))
      .catch(err => { this.handleError$(err) });
  }

  getAfccReload$({ args, jwt, fieldASTs }, authToken){
    console.log("getAfccReload$", args);
    return AfccReloadsDA.searchEvent$(args.id)
    .mergeMap(rawResponse => this.buildSuccessResponse$(rawResponse))
    .catch(err => { this.handleError$(err) });
  }

  getAfccReloads$({ args, jwt, fieldASTs }, authToken){
    
  }

  getTransactions$({ args, jwt, fieldASTs }, authToken){

  }

  getTransactionsFromAfccEvt$({ args, jwt, fieldASTs }, authToken){

  }

  createConfiguration$({ args, jwt, fieldASTs }, authToken){
    console.log("createConfiguration$", args);
    return AfccReloadChannelDA.insertConfiguration$(conf)
    .mergeMap(rawResponse => this.buildSuccessResponse$(rawResponse))
    .catch(err => { this.handleError$(err) });    
  }


  //#region  mappers for API responses
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

  //#endregion


}

module.exports = () => {
  if (!instance) {
    instance = new AfccReloadChannel();
    console.log(`${instance.constructor.name} Singleton created`);
  }
  return instance;
};
