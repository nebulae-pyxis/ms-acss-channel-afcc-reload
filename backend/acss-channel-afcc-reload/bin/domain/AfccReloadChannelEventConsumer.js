"use strict";

const Rx = require("rxjs");
const broker = require("../tools/broker/BrokerFactory")();
const MATERIALIZED_VIEW_TOPIC = "materialized-view-updates";
const AfccReloadsDA = require("../data/AfccReloadsDA");
const AfccReloadChannelDA = require("../data/AfccReloadChannelDA");
const TransactionsErrorsDA = require('../data/TransactionsErrorsDA');
const TransactionsDA = require("../data/TransactionsDA");
const { CustomError, AfccReloadProcessError } = require("../tools/customError");
const CHANNEL_ID = "ACSS_CHANNEL_AFCC_RELOAD";
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
      .mergeMap(conf => this.validateAfccEvent$(conf, evt))
      // apply the rules and return the array with all transaction to persist      
      .mergeMap((conf) => this.applyBusinessRules$(conf, evt))
      .mergeMap(result => this.validateFinalTransactions$(result.transactions, result.conf, evt))
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
   * @param {Object} configuration Business rules to create transactions
   * @param {Object} AfccEvent AFCC event to process with the given configuration
   * @returns {<Observable>} Observable with transaction array
   */
  applyBusinessRules$(configuration, afccEvent) {
    // console.log("Applying BusinessRules...");
    return Rx.Observable.forkJoin(
      this.createTransactionForFareCollector$(configuration, afccEvent),
      this.createTransactionForReloadNetWork$(configuration, afccEvent),
      this.createTransactionForParties$(configuration, afccEvent)
    )
      .map(
        ([
          fareCollectorTransation,
          reloadNetworkTransation,
          partiesTransactions
        ]) => ({
          transactions: [
            fareCollectorTransation,
            reloadNetworkTransation,
            ...partiesTransactions
          ],
          conf: configuration
        })
      )
  }


  /**
   * Create all transaction for each fare collector actor
   * @param { Object } conf Channel configuration
   * @param { Object } afccEvent AFCC reload event 
   */
  createTransactionForFareCollector$(conf, afccEvent) {
    return this.createTransactionObject$(
      conf.fareCollectors[0],
      (afccEvent.data.amount / 100) * conf.fareCollectors[0].percentage,
      conf,
      DEFAULT_TRANSACTION_TYPE,
      afccEvent
    )
  }

  /**
   * Create all transaction for each reload network actor
   * @param { Object } conf Channel configuration
   * @param { Object } afccEvent AFCC reload event 
   */
  createTransactionForReloadNetWork$(conf, afccEvent) {
    const reloadNetworkIndex = conf.reloadNetworks.findIndex( rn => rn.buId == afccEvent.data.businessId );
    if ( reloadNetworkIndex == -1 ){
      return Rx.Observable.throw(
        new AfccReloadProcessError(
          `${afccEvent.data.businessId} business unit id no found in reloadnetwork settings`, 
          'ReloadNetworkTransactionError',
           afccEvent, conf)
      )  
    }
    return this.createTransactionObject$(
      conf.reloadNetworks[reloadNetworkIndex],
      (afccEvent.data.amount / 100) * conf.reloadNetworks[reloadNetworkIndex].percentage,
      conf,
      DEFAULT_TRANSACTION_TYPE,
      afccEvent
    )
  }

  /**
   * Create all transaction for each third part actor
   * @param { Object } conf Channel configuration
   * @param { Object } afccEvent AFCC reload event 
   */
  createTransactionForParties$(conf, afccEvent) {
    const reloadNetworkIndex = conf.reloadNetworks.findIndex(
      rn => rn.buId == afccEvent.data.businessId
    );
    if(reloadNetworkIndex === -1){
      return Rx.Observable.throw(
        new AfccReloadProcessError(`${afccEvent.data.businessId} business unit id no found in reloadnetwork settings `, 'PartiesTransactionError', afccEvent, conf)
      ) 
    }
    const surplusAsPercentage =
      100 -
      (conf.fareCollectors[0].percentage +
        conf.reloadNetworks[reloadNetworkIndex].percentage);
    const surplusAmount = (afccEvent.data.amount / 100) * surplusAsPercentage;
    return Rx.Observable.from(conf.parties)
        .mergeMap(p =>  this.createTransactionObject$(
          p,
          (surplusAmount / 100) * p.percentage,
          conf,
          DEFAULT_TRANSACTION_TYPE,
          afccEvent
        ) )
      .toArray();
  }

  /**
   * Verifies if the sumary of all transactions money match with the AFCC mount
   * @param {any[]} transactionArray Array with all transaction as result of an AFCC reload event
   * @param {any} conf Channel configuration
   * @param {any} evt AFCC reload event
   */
  validateFinalTransactions$(transactionArray, conf, afccEvent) {
    // console.log("################################################################");
    // console.log("### Valor de la recarga ==>", afccEvent.data.amount)
    return Rx.Observable.defer(() => Rx.Observable.of(transactionArray.reduce((acumulated, tr) => acumulated + Math.floor(tr.amount * 100), 0)))
    .map(amountProcessed => Math.floor(amountProcessed)/100)
      .mergeMap(amountProcessed => {
        console.log("Cantida de dinero repartido en las transacciones ==> ", amountProcessed)
        if (amountProcessed == afccEvent.data.amount) {
          return Rx.Observable.of(transactionArray);
        }
        else {
          return Rx.Observable.of(amountProcessed)
            .map(amount => Math.round((afccEvent.data.amount - amount) * 100) / 100)
            .do(a => console.log("#### Dinero de los sobrados ==> ", a))
            .mergeMap((amount) => this.createTransactionObject$(
              conf.surplusCollectors[0],
              amount,
              conf,
              DEFAULT_TRANSACTION_TYPE,
              afccEvent
            ))
            .map(finalTransaction => [...transactionArray, finalTransaction])
        }
      })
      .do(allTransactions => {
        allTransactions.forEach(t => {
          console.log("Transaction_amount: ", t.amount);
        })       
        const total = allTransactions.reduce((acc, tr) => acc + Math.floor(tr.amount * 100), 0)/100;
        console.log(total);
      })
  }

  /**
   * 
   * @param {any} transaction transaction object
   * @param {number} decimals decimal to truncate the amount
   */
  truncateAmount$(transaction, decimals = 2){
    return Rx.Observable.of(Math.pow(10, decimals))
    .map((n) => ({...transaction, amount: Math.floor(transaction.amount * n)/n  }));
  }

  /**
   * 
   * @param {string} toBu 
   * @param {Float} amount 
   * @param {any} channel 
   * @param {string} type 
   * @param {any} event 
   */
  createTransactionObject$(actorConf, amount, conf, type, afccEvent) {
    console.log(conf);
    return Rx.Observable.of({
      fromBu: actorConf.fromBu,
      toBu: actorConf.buId,
      amount: amount,
      channel: {
        id: CHANNEL_ID,
        v: process.env.npm_package_version,
        c: conf.lastEdition
      },
      timestamp: Date.now(),
      type: type,
      evt: {
        id: afccEvent._id, // missing to define
        type: afccEvent.et, // missing to define
        user: afccEvent.user // missing to define
      }
    })
    .mergeMap(transaction => this.truncateAmount$(transaction))
  }

  validateAfccEvent$(conf, afccEvent){
    return Rx.Observable.of({})
    .mapTo(conf)
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
