"use strict";

const Rx = require("rxjs");
const broker = require("../tools/broker/BrokerFactory")();
const MATERIALIZED_VIEW_TOPIC = "materialized-view-updates";
const AfccReloadsDA = require("../data/AfccReloadsDA");
const AfccReloadChannelDA = require('../data/AfccReloadChannelDA');
const TransactionsDA = require('../data/TransactionsDA');
const { CustomError } = require('../tools/customError');
const CURRENT_RULE = 1;

/**
 * Singleton instance
 */
let instance;

class UserEventConsumer {
  constructor() {}

  handleHelloWorld$(){

  }

  handleAfccReloaded$(evt){
    return AfccReloadChannelDA.searchConfiguration$(CURRENT_RULE)
    .mergeMap(conf => this.verifyBusinessRules$(conf))
    .mergeMap((conf) => this.applyBusinessRules(conf, evt))
  }

  /**
   * 
   * @param {Object} conf Business rules where  
   */
  verifyBusinessRules$(conf) {
    console.log(conf);
    return Rx.Observable.forkJoin(
      Rx.Observable.defer(() => conf.fareCollectors.map(e => e.percentage)),
      Rx.Observable.defer(() => conf.reloadNetworks.map(e => e.percentage)).toArray(),
      Rx.Observable.defer(() => conf.parties.map(e => e.percentage)).toArray()
    )
      .mergeMap(([fareCollectors, reloadNetworks, parties]) => Rx.Observable.of({})
        .mergeMap(() => this.verifyFarecollectorVsReloads$(fareCollectors, reloadNetworks))
        .mergeMap((surplus) => this.VerifyPartiesPercentages$(parties, surplus))
      )
      .mergeMap(() => Rx.Observable.of(conf))

  }
  /**
   * 
   * @param {*} fareCollectors 
   * @param {*} reloadNetworks
   * @return {Observable<boolean>} surplus available for the third parties
   */
  verifyFarecollectorVsReloads$(fareCollector, reloadNetworks){
    return Rx.Observable.from(reloadNetworks)
    .map( reloadNetwork => (fareCollector  + reloadNetwork) <= 100) // validate that the combination don't  exceed 100%
    .toArray()
    .mergeMap(array => Rx.Observable.from(array))
    .filter(validation => validation == false)
    .mergeMap(() => Rx.Observable.throw(new CustomError('value exceed', 'verifyFarecollectorVsReloads$', undefined, 'A fareCollector and Reloaders wrong combination', )))
  }

  /**
   * Verify if the percentage Configuration for the parties is correct
   * @param {number[]} parties Array numbers
   * @param {boolean} surplus surplus money available to parties ?
   * @returns { Observable<any> } 
   */
  VerifyPartiesPercentages$(parties, surplus ){
    return Rx.Observable.of(parties)
    .map((parties) => parties.reduce((a, b) => a + b, 0))
    .mergeMap(totalPercentageInParties => {
      if(totalPercentageInParties != 100){
        return Rx.Observable.throw(new CustomError('name', 'verifyBusinessRules', 'Error with percentages in the parties percentages'));
      } else{
        return Rx.Observable.of(true)
      }
    })
  }

  /**
   * 
   * @param {Object} configuration Business rules to create transactions
   * @param {Object} AfccEvent AFCC event to process with the given configuration
   * @returns {<Observable>} Observable with transaction array
   */
  applyBusinessRules(configuration, AfccEvent){
    return Rx.Observable.of({});
  }



}

module.exports = () => {
  if (!instance) {
    instance = new UserEventConsumer();
    console.log(`${instance.constructor.name} Singleton created`);
  }
  return instance;
};