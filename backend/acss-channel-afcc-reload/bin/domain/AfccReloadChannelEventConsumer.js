"use strict";

const Rx = require("rxjs");
const MATERIALIZED_VIEW_TOPIC = "materialized-view-updates";
const AfccReloadsDA = require("../data/AfccReloadsDA");
const AfccReloadChannelDA = require("../data/AfccReloadChannelDA");
const Helper = require('./AfccReloadChannelHelper');
const TransactionsErrorsDA = require('../data/TransactionsErrorsDA');
const BusinessDA = require('../data/businessUnitDA');
const TransactionsDA = require("../data/TransactionsDA");
const { CustomError, AfccReloadProcessError } = require("../tools/customError");
const CURRENT_RULE = 1;
const TRANSACTION_TYPES = ["SALE"];
const TRANSACTION_CONCEPTS = ["RECARGA_CIVICA"];
const [MAIN_POCKET, BONUS_POCKET] = ["MAIN", "BONUS"];


/**
 * Singleton instance
 */
let instance;

class UserEventConsumer {
  constructor() {
    this.channelSettings = undefined;
    this.lastChannelConfFetch = undefined;
    // this.reloadsInQueue = 0;
  }

  handleAcssSettingsCreated$(evt){
    return Rx.Observable.of({...evt.data, editor: evt.user })
    .mergeMap(conf => AfccReloadChannelDA.insertConfiguration$(conf))
    // .catch(error => this.errorHandler$(error, evt))
  }

  /**
   * 
   * @param {any} evt AfccEvent  
   */
  handleWalletTransactionExecuted$(evt) {
    // let now = Date.now();
    // this.reloadsInQueue++;
    // searh the valid channel settiings
    return  Rx.Observable.of(evt.data)
      .filter(({transactionType, transactionConcept}) => ( TRANSACTION_TYPES.includes(transactionType) &&  TRANSACTION_CONCEPTS.includes(transactionConcept)  ))
      .filter(() =>  !(evt.data.transactions.length == 1 && evt.data.transactions[0].pocket == BONUS_POCKET) )
      .mergeMap(() => this.getChannelSettings$(evt) )    
      // verifies that the actors interacting with the event are in the channel configuration
      // .mergeMap(conf => Helper.validateAfccEvent$(conf, evt))
      .mergeMap(conf => Helper.fillWithPosOwner$(conf, evt) )
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
      .mergeMap(arrayTransactions => Rx.Observable.forkJoin(
        Rx.Observable.of(arrayTransactions),
        Helper.getSignificantTransaction$(evt.data.transactions, evt)
      ))
      // build Reload object with its transactions generated inserts the reload object
      .mergeMap( ([arrayTransactions, mainTransaction]) => AfccReloadsDA.insertOneReload$({
        ...evt.data,
        amount: mainTransaction.amount,
        timestamp: evt.timestamp,
        transactions: arrayTransactions,
        afcc: {
          data: {
            before: {},
            after: {}
          },
          uId: "no provided",
          cardId: "no provided",
          balance: {
            before: 0,
            after: 0
          }
        },
        source: {
          machine: "no provided",
          ip: "no provided"
        }
      }))
      // .do(() => console.log( evt.data.businessId, evt.data.amount, "Time Used ==>",  Date.now() - now, " || InQueue ==> ", this.reloadsInQueue))
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
   * @param {Object} evt BusinessAttributesUpdated Event
   */
  handleBusinessAttributesUpdated$(evt) {
    return Rx.Observable.of(evt.data.attributes)
      .map(attributes => ({ attributes, keys: attributes.reduce((acc, atr => [...acc, atr.key], [])) }))
      .mergeMap(({ attributes, keys }) =>
        (keys.includes('AFCC_CHANNEL_PERCENTAGE') && keys.includes('CHILDREN_BUIDS'))
          ? Rx.Observable.forkJoin(
            Rx.Observable.of(attributes.find(atr => atr.key == "AFCC_CHANNEL_PERCENTAGE")),
            Rx.Observable.of(attributes.find(atr => atr.key == "CHILDREN_BUIDS"))
          )
            .map(([percentage, childrenBuids]) => ({
              percentage: parseFloat(percentage),
              childrenBuids: childrenBuids.replace(/ /g, '').split(",")
            }))
            .mergeMap(({ percentage, childrenBuids }) => BusinessDA.updateAfccPercentageAttributes$(evt.data.aid, percentage, childrenBuids))
          : BusinessDA.removeAfccPercentageAttributes$(evt.data.aid)
      )
  }


  /**
   * 
   * @param {Error} err Error Object
   * @param {any} afccReloadEvent AFCC event 
   * @param {any} channelConf channel configuration used to process the afcc event
   */
  errorHandler$(err, event) {
    console.log("EventConsumer error ", err.stack);
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
