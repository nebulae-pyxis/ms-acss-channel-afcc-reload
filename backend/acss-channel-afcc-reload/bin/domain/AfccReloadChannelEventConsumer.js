"use strict";

const Rx = require("rxjs");
const broker = require("../tools/broker/BrokerFactory")();
const MATERIALIZED_VIEW_TOPIC = "materialized-view-updates";
const AfccReloadsDA = require("../data/AfccReloadsDA");
const AfccReloadChannelDA = require("../data/AfccReloadChannelDA");
const Helper = require('./AfccReloadChannelHelper');
const TransactionsErrorsDA = require('../data/TransactionsErrorsDA');
const TransactionsDA = require("../data/TransactionsDA");
const { CustomError, AfccReloadProcessError } = require("../tools/customError");
const CURRENT_RULE = 1;
const DEFAULT_TRANSACTION_TYPE = "AFCC_RELOADED";

/**
 * Singleton instance
 */
let instance;

class UserEventConsumer {
  constructor() {}

  handleAcssSettingsCreated$(evt){
    console.log('handleAcssSettingsCreated$', JSON.stringify(evt));
    return Rx.Observable.of({...evt.data, editor: evt.user })
    .mergeMap(conf => AfccReloadChannelDA.insertConfiguration$(conf))
  }

  /**
   * 
   * @param {any} evt AfccEvent  
   */
  handleAfccReloaded$(evt) {
    // searh the valid channel settiings
    return AfccReloadChannelDA.searchConfiguration$(CURRENT_RULE, evt)
      // verifies that the actors interacting with the event are in the channel configuration
      .mergeMap(conf => Helper.validateAfccEvent$(conf, evt))
      // apply the rules and return the array with all transaction to persist      
      .mergeMap((conf) => Helper.applyBusinessRules$(conf, evt))
      .mergeMap(result => Helper.validateFinalTransactions$(result.transactions, result.conf, evt))
      // .do(r => console.log(r))
      // insert all trsansaction to the MongoDB
      .mergeMap(transactionsArray => TransactionsDA.insertTransactions$(transactionsArray))
      // gets the transactions after been inserted
      .map(result => result.ops)
      .mergeMap(transactions =>
        Rx.Observable.from(transactions)
          .map(transaction => {
            transaction.id = transaction._id.toString();
            delete transaction._id;  // check performance
            return transaction;
          })
          .toArray()
      )
      // build Reload object with its transactions generated
      .map(arrayTransactions => ({ ...evt.data, timestamp: evt.timestamp, transactions: arrayTransactions }))
      // inserts the reload object
      .mergeMap(reload => AfccReloadsDA.insertOneReload$(reload))
      .catch(error => this.errorHandler$(error, evt))
  }

  /**
   * Verifies if the new settings 
   * @param {Object} conf Business rules where
   */
  verifyBusinessRules$(conf) {
    return Rx.Observable.forkJoin(
      Rx.Observable.defer(() => conf.fareCollectors.map(e => e.percentage)),
      Rx.Observable.defer(() => conf.reloadNetworks.map(e => e.percentage)).toArray(),
      Rx.Observable.defer(() => conf.parties.map(e => e.percentage)).toArray()
    )
      .mergeMap(([fareCollectors, reloadNetworks, parties]) =>
        Rx.Observable.merge(this.verifyFarecollectorVsReloads$(fareCollectors, reloadNetworks))
          .mergeMap(surplus => this.VerifyPartiesPercentages$(parties, surplus))
      );
  }
  /**
   *
   * @param {*} fareCollectors
   * @param {*} reloadNetworks
   * @return {Observable<boolean>} surplus available for the third parties
   */
  verifyFarecollectorVsReloads$(fareCollector, reloadNetworks) {
    return Rx.Observable.from(reloadNetworks)
      .map(reloadNetwork => fareCollector + reloadNetwork <= 100) // validate that the combination don't  exceed 100%
      .toArray()
      .map(array => array.findIndex(r => r == false))
      .mergeMap(index => {
        if (index == -1) {
          return Rx.Observable.of(true);
        } else {
          return Rx.Observable.throw(
            new CustomError(
              "value exceed",
              "verifyFarecollectorVsReloads$",
              undefined,
              "A fareCollector and Reloaders wrong combination"
            )
          );
        }
      });
  }

  /**
   * Verify if the percentage Configuration for the parties is correct
   * @param {number[]} parties Array numbers
   * @param {boolean} surplus surplus money available to parties ?
   * @returns { Observable<any> }
   */
  VerifyPartiesPercentages$(parties, surplus) {
    return Rx.Observable.of(parties)
      .map(parties => parties.reduce((a, b) => a + b, 0))
      .mergeMap(totalPercentageInParties => {
        if (totalPercentageInParties != 100) {
          return Rx.Observable.throw(
            new CustomError(
              "name",
              "verifyBusinessRules",
              "Error with percentages in the parties percentages"
            )
          );
        } else {
          return Rx.Observable.of(true);
        }
      });
  } 

  /**
   * 
   * @param {Error} err Error Object
   * @param {any} afccReloadEvent AFCC event 
   * @param {any} channelConf channel configuration used to process the afcc event
   */
  errorHandler$(err) {
    console.log(err);
    return Rx.Observable.of(err)
    .mergeMap(err => {
      const isCustomError = err instanceof AfccReloadProcessError;
      if(isCustomError){
        return TransactionsErrorsDA.insertError$(err.getContent())
      }
      // missin what happen if thr error is not controlled ??
      return Rx.Observable.of(new AfccReloadProcessError(
        'unknow',
        'unknow',
        undefined,
        undefined
      ));
    });   
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
