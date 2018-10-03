"use strict";

const Rx = require("rxjs");
const DEFAULT_TRANSACTION_TYPE = "AFCC_RELOAD";
const CHANNEL_ID = "ACSS_CHANNEL_AFCC_RELOAD";
const { CustomError, AfccReloadProcessError } = require("../tools/customError");

class AfccReloadChannelHelper {
  constructor() {}

  /**
   *
   * @param {Object} configuration Business rules to create transactions
   * @param {Object} AfccEvent AFCC event to process with the given configuration
   * @returns {<Observable>} Observable with transaction array
   */
  static applyBusinessRules$(configuration, afccEvent) {
    // console.log("Applying BusinessRules...");
    return Rx.Observable.forkJoin(
      AfccReloadChannelHelper.createTransactionForFareCollector$(configuration, afccEvent),
      AfccReloadChannelHelper.createTransactionForReloadNetWork$(configuration, afccEvent),
      AfccReloadChannelHelper.createTransactionForParties$(configuration, afccEvent)
    ).map(
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
    );
  }

  /**
   * Create all transaction for each fare collector actor
   * @param { Object } conf Channel configuration
   * @param { Object } afccEvent AFCC reload event
   */
  static createTransactionForFareCollector$(conf, afccEvent) {
    return AfccReloadChannelHelper.createTransactionObject$(
      conf.fareCollectors[0],
      (afccEvent.data.amount / 100) * conf.fareCollectors[0].percentage,
      conf,
      DEFAULT_TRANSACTION_TYPE,
      afccEvent
    );
  }

  /**
   * Create all transaction for each reload network actor
   * @param { Object } conf Channel configuration
   * @param { Object } afccEvent AFCC reload event
   */
  static createTransactionForReloadNetWork$(conf, afccEvent) {
    const reloadNetworkIndex = conf.reloadNetworks.findIndex(
      rn => rn.buId == afccEvent.data.businessId
    );
    if (reloadNetworkIndex == -1) {
      return Rx.Observable.throw(
        new AfccReloadProcessError(
          `${
            afccEvent.data.businessId
          } business unit id no found in reloadnetwork settings`,
          "ReloadNetworkTransactionError",
          afccEvent,
          conf
        )
      );
    }
    return AfccReloadChannelHelper.createTransactionObject$(
      conf.reloadNetworks[reloadNetworkIndex],
      (afccEvent.data.amount / 100) * conf.reloadNetworks[reloadNetworkIndex].percentage,
      conf,
      DEFAULT_TRANSACTION_TYPE,
      afccEvent
    );
  }

  /**
   * Create all transaction for each third part actor
   * @param { Object } conf Channel configuration
   * @param { Object } afccEvent AFCC reload event
   */
  static createTransactionForParties$(conf, afccEvent) {
    const reloadNetworkIndex = conf.reloadNetworks.findIndex(
      rn => rn.buId == afccEvent.data.businessId
    );
    if (reloadNetworkIndex === -1) {
      return Rx.Observable.throw(
        new AfccReloadProcessError(
          `${
            afccEvent.data.businessId
          } business unit id no found in reloadnetwork settings `,
          "PartiesTransactionError",
          afccEvent,
          conf
        )
      );
    }
    const surplusAsPercentage = (100000 - (conf.fareCollectors[0].percentage * 1000 + conf.reloadNetworks[reloadNetworkIndex].percentage * 1000))/1000 ;
    const surplusAmount = (afccEvent.data.amount / 100) * surplusAsPercentage;
    
    return Rx.Observable.from(conf.parties)
      .mergeMap(p => AfccReloadChannelHelper.createTransactionObject$(
          p,
          (surplusAmount / 100) * (p.percentage * 1000) / 1000,
          conf,
          DEFAULT_TRANSACTION_TYPE,
          afccEvent
        )
      )
      .toArray();
  }

  static validateAfccEvent$(conf, afccEvent) {
    return Rx.Observable.of({}).mapTo(conf);
  }

  /**
   * Verifies if the sumary of all transactions money match with the AFCC mount
   * @param {any[]} transactionArray Array with all transaction as result of an AFCC reload event
   * @param {any} conf Channel configuration
   * @param {any} evt AFCC reload event
   */
  static validateFinalTransactions$(transactionArray, conf, afccEvent) {
    // console.log("### Valor de la recarga ==>", afccEvent.data.amount)
    return Rx.Observable.defer(() =>
      Rx.Observable.of( transactionArray.reduce( (acumulated, tr) => acumulated + ( tr.amount * 1000 ), 0 ) )
    )
      .map(amountProcessed => Math.floor(amountProcessed) / 1000)
      .mergeMap(amountProcessed => {
        if (amountProcessed == afccEvent.data.amount) {
          return Rx.Observable.of(transactionArray);
        } else {
          return Rx.Observable.of(amountProcessed)
            .map( amount => Math.round((afccEvent.data.amount - amount) * 100) / 100 )
            .mergeMap(amount =>
              AfccReloadChannelHelper.createTransactionObject$(
                conf.surplusCollectors[0],
                amount,
                conf,
                DEFAULT_TRANSACTION_TYPE,
                afccEvent
              )
            )
            .map(finalTransaction => [...transactionArray, finalTransaction]);
        }
      })
      // .do(allTransactions => {
      //   allTransactions.forEach(t => { console.log("Transaction_amount: ", t.amount); });
      //   const total = allTransactions.reduce( (acc, tr) => acc + (tr.amount * 1000), 0 ) / 1000;
      //   console.log(total);
      // });
  }

  /**
   * Truncates the transaction amount to two decimals
   * @param {any} transaction transaction object
   * @param {number} decimals decimal to truncate the amount
   */
  static truncateAmount$(transaction, decimals = 2) {
    return Rx.Observable.of(transaction.amount.toString()).map(amountAsString => ({
      ...transaction,
      // this "Ternary if" is necessary in javascript due in some cases the aproximation fails and causes loss of a few cents
      // for example 1048.85 * 100 equals to  104884.99999999999 in javascript but 104885 was expected.
      // due this error is necessary make this "Ternary If".
      amount: (amountAsString.indexOf('.') !== -1 &&  ( amountAsString.length - amountAsString.indexOf('.') > decimals +1 ) )
        ? Math.floor(transaction.amount * Math.pow(10, decimals)) / Math.pow(10, decimals)
        : transaction.amount
    }));
  }

  /**
   *
   * @param {string} toBu
   * @param {Float} amount
   * @param {any} channel
   * @param {string} type
   * @param {any} event
   */
  static createTransactionObject$(actorConf, amount, conf, type, afccEvent) {
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
        id: afccEvent._id, 
        type: afccEvent.et, 
        user: afccEvent.user 
      }
    }).mergeMap(transaction => AfccReloadChannelHelper.truncateAmount$(transaction)
    );
  }


  /**
 * Verifies if the new settings 
 * @param {Object} conf Business rules where
 */
  static verifyBusinessRules$(conf) {
    return Rx.Observable.forkJoin(
      Rx.Observable.defer(() => conf.fareCollectors.map(e => e.percentage)),
      Rx.Observable.defer(() => conf.reloadNetworks.map(e => e.percentage)).toArray(),
      Rx.Observable.defer(() => conf.parties.map(e => e.percentage)).toArray(),
      Rx.Observable.defer(() => conf.surplusCollectors.map(e => e))
    )
      .mergeMap(([fareCollector, reloadNetworks, parties, surplusCollector]) =>
        Rx.Observable.forkJoin(
          Rx.Observable.merge(AfccReloadChannelHelper.verifyFarecollectorVsReloads$(fareCollector, reloadNetworks))
            .mergeMap(surplus => AfccReloadChannelHelper.VerifyPartiesPercentages$(parties, surplus))
        )
      )
      .mergeMap(() => Rx.Observable.of(conf))
  }

  /**
 *
 * @param {*} fareCollectors
 * @param {*} reloadNetworks
 * @return {Observable<boolean>} surplus available for the third parties
 */
  static verifyFarecollectorVsReloads$(fareCollector, reloadNetworks) {
    console.log("VAlidando verifyFarecollectorVsReloads", fareCollector, reloadNetworks)
    return Rx.Observable.from(reloadNetworks)
      .map(reloadNetwork => fareCollector + reloadNetwork <= 100) // validate that the combination don't  exceed 100%
      .toArray()
      .do(r => console.log("Validaciones", ...r))
      .map(array => array.findIndex(r => r == false))
      .mergeMap(index => (index === -1)
        ? Rx.Observable.of(true)
        : Rx.Observable.throw(
          new CustomError(
            "Percentage value exceed",
            "verifyFarecollectorVsReloads$",
            undefined,
            "A fareCollector and Reloaders wrong combination"
          )
        ));
  }

  /**
 * Verify if the percentage Configuration for the parties is correct
 * @param {number[]} parties Array numbers
 * @param {boolean} surplus surplus money available to parties ?
 * @returns { Observable<any> }
 */
  static VerifyPartiesPercentages$(parties, surplus) {
    return Rx.Observable.of(parties)
      .map(parties => parties.reduce((acc, item) => acc + item, 0))
      .mergeMap(totalPercentageInParties => (totalPercentageInParties == 100)
        ? Rx.Observable.of(true)
        : Rx.Observable.throw(
          new CustomError(
            "name",
            "verifyBusinessRules",
            "Error with percentages in the parties percentages"
          ) )
      )
  } 



}

/**
 * @returns { AfccReloadChannelHelper } unique instance
 */
module.exports = AfccReloadChannelHelper;
