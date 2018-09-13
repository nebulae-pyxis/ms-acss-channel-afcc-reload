"use strict";

const Rx = require("rxjs");
const broker = require("../tools/broker/BrokerFactory")();
const MATERIALIZED_VIEW_TOPIC = "materialized-view-updates";
const AfccReloadsDA = require("../data/AfccReloadsDA");
const AfccReloadChannelDA = require("../data/AfccReloadChannelDA");
const TransactionsDA = require("../data/TransactionsDA");
const { CustomError } = require("../tools/customError");
const CHANNEL_ID = "ACSS_CHANNEL_AFCC_RELOAD";
const CURRENT_RULE = 1;
const DEFAULT_TRANSACTION_TYPE = "AFCC_RELOADED";

/**
 * Singleton instance
 */
let instance;

class UserEventConsumer {
  constructor() {}

  handleHelloWorld$() {}

  handleAcssSettingsCreated$(evt){
    console.log('handleAcssSettingsCreated$', evt);
    return AfccReloadChannelDA.removeConfigurationValidity()
    .mapTo({...evt.data, editor: evt.user })
    .mergeMap(conf => AfccReloadChannelDA.insertConfiguration$(conf))
  }

  handleAfccReloaded$(evt) {
    console.log("handleAfccReloaded$", evt);
    return AfccReloadChannelDA.searchConfiguration$(CURRENT_RULE)
    .mergeMap((conf) => this.applyBusinessRules$(conf, evt.data))
    .map( arrayTransactions => ({ ...evt.data, transactions: arrayTransactions }))
    .mergeMap(reload => Rx.Observable.forkJoin(
      AfccReloadsDA.insertOneReload$(reload),
      TransactionsDA.insertTransactions$(reload.transactions)
    ));
  }

  /**
   *
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
        ]) => [
          fareCollectorTransation,
          reloadNetworkTransation,
          ...partiesTransactions
        ]
      )
  }

  createTransactionForFareCollector$(conf, evt) {
    return Rx.Observable.of({
      fromBu: evt.bu.id,
      toBu: conf.fareCollectors[0].buId,
      amount: (evt.amount / 100) * conf.fareCollectors[0].percentage,
      channel: {
        id: CHANNEL_ID,
        v: process.env.npm_package_version,
        c: conf.lastEdition
      },
      timestamp: Date.now(),
      type: DEFAULT_TRANSACTION_TYPE,
      evt: {
        // missing to define
        id: evt.id,     // missing to define
        type: evt.type, // missing to define
        user: evt.user  // missing to define
      }
    });
  }

  createTransactionForReloadNetWork$(conf, evt) {
    const reloadNetworkIndex = conf.reloadNetworks.findIndex(
      rn => rn.buId == evt.bu.id
    );
    return Rx.Observable.of({
      fromBu: evt.bu.id,
      toBu: evt.bu.id,
      amount:
        (evt.amount / 100) * conf.reloadNetworks[reloadNetworkIndex].percentage,
      channel: {
        id: CHANNEL_ID,
        v: process.env.npm_package_version,
        c: conf.lastEdition
      },
      timestamp: Date.now(),
      type: DEFAULT_TRANSACTION_TYPE,
      evt: {
        // missing to define
        id: evt.id, // missing to define
        type: evt.type, // missing to define
        user: evt.user // missing to define
      }
    });
  }

  createTransactionForParties$(conf, evt) {
    const reloadNetworkIndex = conf.reloadNetworks.findIndex(
      rn => rn.buId == evt.bu.id
    );
    const surplusAsPercentage =
      100 -
      (conf.fareCollectors[0].percentage +
        conf.reloadNetworks[reloadNetworkIndex].percentage);
    const surplusAmount = (evt.amount / 100) * surplusAsPercentage;
    return Rx.Observable.from(conf.parties)
      .map(p => {
        return {
          fromBu: evt.bu.id,
          toBu: p.buId,
          amount: (surplusAmount / 100) * p.percentage,
          channel: {
            id: CHANNEL_ID,
            v: process.env.npm_package_version,
            c: conf.lastEdition
          },
          timestamp: Date.now(),
          type: DEFAULT_TRANSACTION_TYPE,
          evt: {
            // missing to define
            id: evt.id, // missing to define
            type: evt.type, // missing to define
            user: evt.user // missing to define
          }
        };
      })
      .toArray();
  }

  validateFinalTransactions$(transactionArray, conf, evt) {
    return Rx.Observable.defer(() => Rx.Observable.of(transactionArray.reduce((acumulated, tr) => acumulated + tr.amount, 0)) )
    .mergeMap(amountProcessed => {
      if (amountProcessed == evt.amount) {
        console.log("Se repartio todo el dinero");
        return Rx.Observable.of(transactionArray);
      } else {
        console.log("no se repartio el dinero del evento de venta");
        return Rx.Observable.throw(
          new CustomError(
            "amount mismatch",
            "validateFinalTransactions$",
            undefined,
            "The reload amount does not macth with all transaction amount"
          )
        );
      }
    })
    // const totalInTransactions = ;
    // console.log(totalInTransactions, evt.amount);
   
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
