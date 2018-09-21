"use strict";

const Rx = require("rxjs");
const DEFAULT_TRANSACTION_TYPE = "AFCC_RELOADED";
const CHANNEL_ID = "ACSS_CHANNEL_AFCC_RELOAD";
const { CustomError, DefaultError } = require("../tools/customError");

let instance;

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
      (afccEvent.data.amount / 100) *
        conf.reloadNetworks[reloadNetworkIndex].percentage,
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
    const surplusAsPercentage =
      100 -
      (conf.fareCollectors[0].percentage +
        conf.reloadNetworks[reloadNetworkIndex].percentage);
    const surplusAmount = (afccEvent.data.amount / 100) * surplusAsPercentage;
    return Rx.Observable.from(conf.parties)
      .mergeMap(p =>
        AfccReloadChannelHelper.createTransactionObject$(
          p,
          (surplusAmount / 100) * p.percentage,
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
    // console.log("################################################################");
    // console.log("### Valor de la recarga ==>", afccEvent.data.amount)
    return Rx.Observable.defer(() =>
      Rx.Observable.of(
        transactionArray.reduce(
          (acumulated, tr) => acumulated + Math.floor(tr.amount * 100),
          0
        )
      )
    )
      .map(amountProcessed => Math.floor(amountProcessed) / 100)
      .mergeMap(amountProcessed => {
        console.log(
          "Cantida de dinero repartido en las transacciones ==> ",
          amountProcessed
        );
        if (amountProcessed == afccEvent.data.amount) {
          return Rx.Observable.of(transactionArray);
        } else {
          return Rx.Observable.of(amountProcessed)
            .map(
              amount => Math.round((afccEvent.data.amount - amount) * 100) / 100
            )
            .do(a => console.log("#### Dinero de los sobrados ==> ", a))
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
      .do(allTransactions => {
        allTransactions.forEach(t => {
          console.log("Transaction_amount: ", t.amount);
        });
        const total =
          allTransactions.reduce(
            (acc, tr) => acc + Math.floor(tr.amount * 100),
            0
          ) / 100;
        console.log(total);
      });
  }

  /**
   *
   * @param {any} transaction transaction object
   * @param {number} decimals decimal to truncate the amount
   */
  static truncateAmount$(transaction, decimals = 2) {
    return Rx.Observable.of(Math.pow(10, decimals)).map(n => ({
      ...transaction,
      amount: Math.floor(transaction.amount * n) / n
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
        id: afccEvent._id, 
        type: afccEvent.et, 
        user: afccEvent.user 
      }
    }).mergeMap(transaction =>
      AfccReloadChannelHelper.truncateAmount$(transaction)
    );
  }
}

/**
 * @returns { AfccReloadChannelHelper } unique instance
 */
module.exports = AfccReloadChannelHelper;
