"use strict";

const Rx = require("rxjs");
const AfccReloadChannelDA = require("../data/AfccReloadChannelDA");
const TransactionDA = require("../data/TransactionsDA");
const AfccReloadsDA = require("../data/AfccReloadsDA");
const eventSourcing = require("../tools/EventSourcing")();
const Event = require("@nebulae/event-store").Event;
const broker = require("../tools/broker/BrokerFactory")();
const MATERIALIZED_VIEW_TOPIC = "materialized-view-updates";
const { PERMISSION_DENIED_ERROR } = require("../tools/ErrorCodes");
const RoleValidator = require("../tools/RoleValidator");
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
   * Handle HelloWorld Query, please remove
   * This in an Event HAndler for Event- events
   */
  handleHelloWorld$(evt) {
    return Rx.Observable.of('Some process for HelloWorld event');
  }

  /**
   * search by the settings version indicated in the query params
   * @param {any} param0 Object with args and jwt 
   * @param {any} authToken JWT Authtoken decoded
   */
  getConfiguration$({ args, jwt }, authToken) {
    console.log('getConfiguration$', args);
    return RoleValidator.checkPermissions$(
      authToken.realm_access.roles,
      "AfccReloadAcssChannel",
      "getConfiguration$",
      PERMISSION_DENIED_ERROR,
      ["SYSADMIN"]
    )
    .mergeMap(() => AfccReloadChannelDA.searchConfiguration$(args.id) )    
    .mergeMap(payload => this.buildAndSendResponse$(payload))
    .do(r => console.log(JSON.stringify(r)));
  }

   /**
   * Search by the Afcc reload  indicated in the query params
   * @param {any} param0 Object with args and jwt 
   * @param {any} authToken JWT Authtoken decoded
   */
  getAfccReload$({ args, jwt }, authToken){
    console.log("getAfccReload$", args);
    return RoleValidator.checkPermissions$(
      authToken.realm_access.roles,
      "AfccReloadAcssChannel",
      "getAfccReload$",
      PERMISSION_DENIED_ERROR,
      ["SYSADMIN"]
    )
    .mergeMap(() =>  AfccReloadsDA.searchReload$(args.id) ) 
    .map(reload => ({ ...reload, id: reload._id.toString()}))
    .mergeMap(payload => this.buildAndSendResponse$(payload));
  }

   /**
   * Search by the Afcc reloads  that match by the parms indicated in the query params
   * @param {any} param0 Object with args and jwt 
   * @param {any} authToken JWT Authtoken decoded
   */
  getAfccReloads$({ args, jwt }, authToken){
    console.log("getAfccReloads$", args);
    return RoleValidator.checkPermissions$(
      authToken.realm_access.roles,
      "AfccReloadAcssChannel",
      "getAfccReload$",
      PERMISSION_DENIED_ERROR,
      ["SYSADMIN"]
    )
    .mergeMap(() => AfccReloadsDA.searchReloads$(args) )     
    .mergeMap(payload => this.buildAndSendResponse$(payload));
  }

  /**
   * Search by the Afcc reloads  collections size in mongo collection.
   * @param {any} param0 Object with args and jwt 
   * @param {any} authToken JWT Authtoken decoded
   */
  getReloadsCount$({ args, jwt }, authToken){
    return RoleValidator.checkPermissions$(
      authToken.realm_access.roles,
      "AfccReloadAcssChannel",
      "getAfccReload$",
      PERMISSION_DENIED_ERROR,
      ["SYSADMIN"]
    )
    .mergeMap(() => AfccReloadsDA.getReloadsCount$() ) 
    .mergeMap(payload => this.buildAndSendResponse$(payload));
  }

   /**
   * Search by the ACSS transactions  that match by the parms indicated in the query params
   * @param {any} param0 Object with args and jwt 
   * @param {any} authToken JWT Authtoken decoded
   */
  getTransactions$({ args, jwt }, authToken){
    return RoleValidator.checkPermissions$(
      authToken.realm_access.roles,
      "AfccReloadAcssChannel",
      "getAfccReload$",
      PERMISSION_DENIED_ERROR,
      ["SYSADMIN"]
    )
    .mergeMap(() => TransactionDA.searchTransactions$(args) )     
    .mergeMap(payload => this.buildAndSendResponse$(payload));
  }



   /**
   * Create new Acss channel configuration, and replace the current channel cconfiguration
   * @param {Object} param0 Object that contains query Arguments, jwt and fiel
   * @param {String} authToken  JWT Authtoken decoded
   */
  createConfiguration$({ args, jwt }, authToken) {
    console.log("createConfiguration$", args); 

    return RoleValidator.checkPermissions$(
      authToken.realm_access.roles,
      "AfccReloadAcssChannel",
      "getAfccReload$",
      PERMISSION_DENIED_ERROR,
      ["SYSADMIN"]
    )
    .mergeMap(() => 
      eventSourcing.eventStore.emitEvent$(
        new Event({
          eventType: "ACSSConfigurationCreated",
          eventTypeVersion: 1,
          aggregateType: "AcssChannel",
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
