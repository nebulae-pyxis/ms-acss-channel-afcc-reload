"use strict";

const Rx = require("rxjs");
const MATERIALIZED_VIEW_TOPIC = "materialized-view-updates";
const AfccReloadsDA = require("../data/AfccReloadsDA");
const AfccReloadChannelDA = require("../data/AfccReloadChannelDA");
const Helper = require('./AfccReloadChannelHelper');
const TransactionsErrorsDA = require('../data/TransactionsErrorsDA');
const TransactionsDA = require("../data/TransactionsDA");
const { CustomError, AfccReloadProcessError } = require("../tools/customError");
const CURRENT_RULE = 1;

/**
 * Singleton instance
 */
let instance;

class UserEventConsumer {
  constructor() {
    this.channelSettings = undefined;
    this.lastChannelConfFetch = undefined;
    this.reloadsInQueue = 0;
  }

  handleAcssSettingsCreated$(evt){
    // console.log('handleAcssSettingsCreated$', JSON.stringify(evt));
    return Rx.Observable.of({...evt.data, editor: evt.user })
    .do(r => console.log(r))
    .mergeMap(conf => AfccReloadChannelDA.insertConfiguration$(conf))
    // .catch(error => this.errorHandler$(error, evt))
  }

  /**
   * 
   * @param {any} evt AfccEvent  
   */
  handleAfccReloaded$(evt) {
    let now = Date.now();
    this.reloadsInQueue++;
    // searh the valid channel settiings
    return this.getChannelSettings$(evt)
      // verifies that the actors interacting with the event are in the channel configuration
      .mergeMap(conf => Helper.validateAfccEvent$(conf, evt)) //todo/
      // apply the rules and return the array with all transaction to persist      
      .mergeMap((conf) => Helper.applyBusinessRules$(conf, evt))
      .mergeMap(result => Helper.validateFinalTransactions$(result.transactions, result.conf, evt))
      //.do(r => console.log(r))
      // insert all trsansaction to the MongoDB
      .mergeMap(transactionsArray => TransactionsDA.insertTransactions$(transactionsArray))
      // gets the transactions after been inserted
      .map(result => result.ops)
      .mergeMap(transactions =>
        Rx.Observable.from(transactions)
          .map(transaction => ({ ...transaction, id: transaction._id.toString() }))
          .toArray()
      )
      // build Reload object with its transactions generated inserts the reload object
      .mergeMap(arrayTransactions => AfccReloadsDA.insertOneReload$({ ...evt.data, timestamp: evt.timestamp, transactions: arrayTransactions }))
      .do(() => console.log( evt.data.businessId, evt.data.amount, "Time Used ==>",  Date.now() - now, " || InQueue ==> ", this.reloadsInQueue))
      .catch(error => this.errorHandler$(error, evt))
  }

  
  getChannelSettings$(evt) {
    // AfccReloadChannelDA.searchConfiguration$(CURRENT_RULE, evt)
    return (!this.channelSettings || (Date.now() - this.lastChannelConfFetch) > 60000)
      ? AfccReloadChannelDA.searchConfiguration$(CURRENT_RULE, evt)
        .map((settings) => {
          this.channelSettings = settings;
          this.lastChannelConfFetch = Date.now();
          return settings;
        })
      : Rx.Observable.of(this.channelSettings)
  }


  /**
   * 
   * @param {Error} err Error Object
   * @param {any} afccReloadEvent AFCC event 
   * @param {any} channelConf channel configuration used to process the afcc event
   */
  errorHandler$(err, event) {
    console.log("######################################################################", err);
    // console.log(err);
    return Rx.Observable.of(err)
      .map(error => (error instanceof AfccReloadProcessError) ? error :  new AfccReloadProcessError(error.message, error.stack, event, undefined) )
      .mergeMap(error => TransactionsErrorsDA.insertError$(error.getContent()))
  }

}
/**
 * @returns { UserEventConsumer } unique instance
 */
module.exports = () => {
  if (!instance) {
    instance = new UserEventConsumer();
    console.log(`${instance.constructor.name} Singleton created`);
  }
  return instance;
};
