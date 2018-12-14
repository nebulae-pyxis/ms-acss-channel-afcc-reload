"use strict";

const Rx = require("rxjs");
const DEFAULT_TRANSACTION_TYPE = "AFCC_RELOAD";
const CHANNEL_ID = "ACSS_CHANNEL_AFCC_RELOAD";
const { CustomError, AfccReloadProcessError } = require("../tools/customError");
const [ MAIN_POCKET, BONUS_POCKET, CREDIT_POCKET  ]  = [ 'MAIN', 'BONUS', 'CREDIT' ];
const BusinessDA = require('../data/businessUnitDA'); 

class AfccReloadChannelHelper {
  constructor() {}

  static generateTransactions$(channelConf, walletTransactionExecutedEvent) {

    return Rx.Observable.of(walletTransactionExecutedEvent)
      .mapTo(walletTransactionExecutedEvent.data.transactions)
      .filter(txs => txs)
      .map(transactions => transactions.filter(tx => tx.pocketAlias)[0].pocketAlias)
      .mergeMap(pocketAlias => {
        switch (pocketAlias) {
          case MAIN_POCKET: return this.generateTransactionsForMainPocketCase$(channelConf, walletTransactionExecutedEvent);
          case BONUS_POCKET: return this.generateTransactionsForBonusPocketCase$(channelConf, walletTransactionExecutedEvent);
          case CREDIT_POCKET: return this.generateTransactionsForCreditPocketCase$(channelConf, walletTransactionExecutedEvent);
          default: return Rx.Observable.throw("POCKET ALIAS NOT ALLOWED");
        }
      })
      .map(transactions => transactions.filter(e => e.amount != 0) )
  }

  static generateTransactionsForCreditPocketCase$(channelConf, walletTransactionExecutedEvent){
    console.log("generateTransactionsForCreditPocketCase$", channelConf, walletTransactionExecutedEvent);    
    return Rx.Observable.of(walletTransactionExecutedEvent.data.transactions)
    .mergeMap(txs => this.getSummaryEvent$(txs, walletTransactionExecutedEvent))
    .mergeMap(eventSumary  => Rx.Observable.forkJoin(
      this.generateTransactionsForActors$(channelConf, "salesWithCreditPocket", eventSumary),
      this.createTransactionsForBonus$(channelConf, "salesWithCreditPocket", eventSumary)
    ))
    .map(([ actorTransactions, bonusTransaction]) => [ ...actorTransactions, bonusTransaction ])
  }

  /**
   * 
   * @param {Object} channelConf 
   * @param {Object} walletTransactionExecutedEvent 
   */
  static generateTransactionsForMainPocketCase$(channelConf, walletTransactionExecutedEvent) {
    console.log("generateTransactionsForMainPocketCase$", channelConf, walletTransactionExecutedEvent);    
    return Rx.Observable.of(walletTransactionExecutedEvent.data.transactions)
    .mergeMap(txs => this.getSummaryEvent$(txs, walletTransactionExecutedEvent))
    .mergeMap(eventSumary  => 
      Rx.Observable.forkJoin(
        // create transactions for actors
        this.generateTransactionsForActors$(channelConf, "salesWithMainPocket",  eventSumary),
        // create transaction for bonus collector
        this.createTransactionsForBonus$(channelConf, "salesWithMainPocket", eventSumary),
        // create transaction for pos manager
        this.createTransactionForPosOwner$(channelConf, eventSumary),
        // Event summary
        Rx.Observable.of(eventSumary)
      )
    )
    .map(
      ([
        actorTransaction,
        bonusTransaction,
        posOwnerTransation,
        eventSumary
      ]) => ({
        transactions: [ ...actorTransaction, bonusTransaction, ...posOwnerTransation  ],
        eventSumary: eventSumary
      })
    )
    .mergeMap(({transactions, eventSumary}) => this.validateTransactionForSurplus$(
      transactions, "salesWithMainPocket", "surplusCollector", channelConf, eventSumary) 
    )
  }

  /**
   * @param {object} channelConf Channel configuration with diferents case MAIN, BONUS, CREDIT
   * @param {string} pocketCase OPTIONS: salesWithMainPocket | salesWithBonusPocket | salesWithCreditPocket
   * @param {object} evtSummary Object with transaction, significant transaction value and discounted value by the reloader
   */
  static generateTransactionsForActors$(channelConf, pocketCase, evtSummary) {
    return Rx.Observable.of(channelConf)
      .filter(channelConf => channelConf && channelConf[pocketCase].actors)
      .mapTo(channelConf[pocketCase].actors)
      .mergeMap(actorConfs => Rx.Observable.from(actorConfs)
        .mergeMap(actorConf => Rx.Observable.forkJoin(
          this.getValueFromPercentage$(actorConf.percentage, evtSummary.amount),
          Rx.Observable.of(actorConf)
        ))
        .mergeMap( ([txAmount, actorConf]) => this.createTransactionObject$(
          actorConf.fromBu,
          actorConf.buId,
          txAmount,
          channelConf.lastEdition,
          DEFAULT_TRANSACTION_TYPE,
          evtSummary)
        )
      )
      .toArray()
  }

  /**
   * @param {object} channelConf Channel configuration with diferents case MAIN, BONUS, CREDIT
   * @param {string} pocketCase OPTIONS: salesWithMainPocket | salesWithBonusPocket | salesWithCreditPocket
   * @param {object} evtSummary Object with transaction, significant transaction value and discounted value by the reloader
   */
  static createTransactionsForBonus$(channelConf, pocketCase, evtSummary) {
    return Rx.Observable.of(channelConf)
      .filter(conf => conf && conf[pocketCase].bonusCollector)
      .mapTo(channelConf[pocketCase].bonusCollector)
      .mergeMap(bonusCollectorConf => this.createTransactionObject$(
        bonusCollectorConf.fromBu,
        bonusCollectorConf.buId,
        evtSummary.discounted,
        channelConf.lastEdition,
        DEFAULT_TRANSACTION_TYPE,
        evtSummary)
      )
  }

  static generateTransactionsForBonusPocketCase$(channelConf, walletTransactionExecutedEvent){
    console.log("generateTransactionsForBonusPocketCase$", channelConf, walletTransactionExecutedEvent);
    return Rx.Observable.of(walletTransactionExecutedEvent.data.transactions)
    .mergeMap(txs => this.getSummaryEvent$(txs, walletTransactionExecutedEvent))
    .mergeMap(summaryEvent  => Rx.Observable.forkJoin(
      this.generateTransactionsForActors$(channelConf, "salesWithBonusPocket",  summaryEvent),
      Rx.Observable.of(summaryEvent)
    ))
    .map( ([ transactions, summaryEvent  ]) => ({
      transactions: transactions,
      summaryEvent: summaryEvent }))
    .mergeMap(({ transactions, summaryEvent }) => this.validateTransactionForSurplus$(
      transactions, "salesWithBonusPocket", "investmentCollector", channelConf, summaryEvent) 
    )
  }


  static fillWithPosOwner$(conf, evt){
    return BusinessDA.searchPosOwner$(evt.data.businessId)
    .mergeMap(posOwner => 
      posOwner
       ? Rx.Observable.of({ ...conf, posOwner: posOwner})
       : Rx.Observable.of(conf)
    )
  }

  /**
   * Parse the afccEvent and adds discounted, amount fields
   * @param {Object[]} transactionArray 
   * @param {Object} afccEvent 
   * @returns {Object} summaryEvent {amount: number, _id:string, et: string, user: string, discounted: number}
   * 
   */
  static getSummaryEvent$(transactionArray, afccEvent){
    return Rx.Observable.of(transactionArray)
    // get the transaction with minumin value (transaction made with MAIN pocket)
    .map(transactions => transactions.sort((txa, txb) => txa.value - txb.value )[0] )
    // map object with only necessary attributes and set value transacction as positive
    .map( ({ value, user }) => ({ amount: value * -1, _id: afccEvent._id, et: afccEvent.et, user  }) )
      .map(summary => transactionArray.length > 1
        ? ({ ...summary, discounted: transactionArray.sort((txa, txb) => txa.value - txb.value)[1].value })
        : ({ ...summary, discounted: 0 })
      )
  }

  // static createTransactionForSurplus$(conf, afccEvent) {
  //   return this.subtractWithPrecision$(100, conf.fareCollectors[0].percentage)
  //     .mergeMap(surplusPercentage => this.getValueFromPercentage$(surplusPercentage, afccEvent.amount))
  //     .mergeMap(value => this.createTransactionObject$(
  //       conf.fareCollectors[0],
  //       value,
  //       conf,
  //       DEFAULT_TRANSACTION_TYPE,
  //       afccEvent
  //     ))

  // }

  // /**
  //  * Create all transaction for each fare collector actor
  //  * @param { Object } conf Channel configuration
  //  * @param { Object } afccEvent AFCC reload event
  //  */
  // static createTransactionForFareCollector$(conf, afccEvent) {
  //   return this.getValueFromPercentage$(conf.fareCollectors[0].percentage, afccEvent.amount)
  //   .mergeMap(value => this.createTransactionObject$(
  //     conf.fareCollectors[0],
  //     value,
  //     conf,
  //     DEFAULT_TRANSACTION_TYPE,
  //     afccEvent
  //   ) )
  // }



/**
 * 
 * @param {Object} channelConf channel configuration
 * @param {object} parsedEvent Object with transaction, significant transaction value and discounted value by the reloader
 */
  static createTransactionForPosOwner$(channelConf, eventSumary) {
    return Rx.Observable.of(channelConf.posOwner)
      .mergeMap(posOwner =>
        !posOwner
          ? Rx.Observable.of([])
          : this.getValueFromPercentage$(posOwner.afccChannelPercentage, eventSumary.amount)
            .map(value => ({ 
              value: value,
              payer: channelConf.salesWithMainPocket.surplusCollector.fromBu 
            }))
            .mergeMap( ({value, payer}) => this.createTransactionObject$(
              payer,
              posOwner._id,
              value,
              channelConf.lastEdition,
              DEFAULT_TRANSACTION_TYPE,
              eventSumary
            ))
            .map( tx => ([tx]))
      )
  }

  // /**
  //  * Create all transaction for each third part actor
  //  * @param { Object } conf Channel configuration
  //  * @param { Object } afccEvent AFCC reload event
  //  */
  // static createTransactionForParties$(conf, afccEvent) {   
  //   return Rx.Observable.of(conf.posOwner)
  //   .map(posOwner => posOwner
  //     ? (posOwner.afccChannelPercentage * 100) + ( conf.fareCollectors[0].percentage * 100 )
  //     : conf.fareCollectors[0].percentage * 100
  //   )
  //   .mergeMap(percentageUsed => this.getValueFromPercentage$(percentageUsed/100, afccEvent.amount ))    
  //   .mergeMap( moneyUsed => this.subtractWithPrecision$(afccEvent.amount, ( ((moneyUsed*100)  + (afccEvent.discounted*100) )/100  ) ) )
  //   .mergeMap(amountForThirdPArties => 
  //     Rx.Observable.from(conf.parties)
  //     .mergeMap(thirdParty => Rx.Observable.forkJoin(
  //       Rx.Observable.of(thirdParty),
  //       this.getValueFromPercentage$(thirdParty.percentage, amountForThirdPArties)
  //     ))
  //     .mergeMap( ([thirdParty, amount]) => this.createTransactionObject$(
  //             thirdParty,
  //             amount,
  //             conf,
  //             DEFAULT_TRANSACTION_TYPE,
  //             afccEvent
  //           )
  //         )
  //     )
  //     .toArray();
  // }

  static validateAfccEvent$(conf, afccEvent) {
    return Rx.Observable.of({})
    .map(() => {
      if(afccEvent.amount <= 0 ){
        return Rx.Observable.throw(
          new AfccReloadProcessError(           
            "ReloadNetworkTransactionError",
            "Invalid Reload amount",
            afccEvent,
            conf
          )
        );
      }
    })
    .mapTo(conf);
  }

  /**
   * Verifies if the sumary of all transactions money match with the AFCC mount
   * @param {any[]} transactionArray Array with all transaction as result of an AFCC reload event
   * @param { string } pocketCase  | salesWithMainPocket | salesWithBonusPocket | salesWithCreditPocket
   * @param {Objet} collectorActor collector config
   * @param {any} conf Channel configuration
   * @param {any} eventSumary Event summary with amoun, discounted 
   */
  static validateTransactionForSurplus$(transactionArray, pocketCase, collectorActor, conf, eventSumary) {
    return Rx.Observable.of(transactionArray.reduce((acumulated, tr) => acumulated + (tr.amount * 1000), 0))
      .map(amountProcessed => Math.floor(amountProcessed) / 1000)
      // .mergeMap(amountProcessed => Rx.Observable.forkJoin(
      //   Rx.Observable.of(amountProcessed),
      //   Rx.Observable.of(eventSumary)
      // )) 
      .mergeMap(amountProcessed => (amountProcessed == eventSumary.amount)
        ? Rx.Observable.of(transactionArray)
        : amountProcessed > eventSumary.amount
          ? Rx.Observable.throw("Amount Exced")
          : Rx.Observable.of(Math.round((eventSumary.amount - amountProcessed) * 100) / 100)
            .mergeMap(amountForSurplus =>
              this.createTransactionObject$(
                conf[pocketCase][collectorActor].fromBu,
                conf[pocketCase][collectorActor].buId,
                amountForSurplus,
                conf.lastEdition,
                DEFAULT_TRANSACTION_TYPE,
                eventSumary
              )
            )
            .map(finalTransaction => [...transactionArray, finalTransaction])
      )
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
      /* this "Ternary if" is necessary in javascript due in some cases the aproximation fails and causes loss of a few cents
      for example 1048.85 * 100 equals to  104884.99999999999 in javascript but 104885 was expected.
      due this error is necessary make this "Ternary If".
      */
      amount: (amountAsString.indexOf('.') !== -1 &&  ( amountAsString.length - amountAsString.indexOf('.') > decimals +1 ) )
        ? Math.floor(transaction.amount * Math.pow(10, decimals)) / Math.pow(10, decimals)
        : transaction.amount
    }));
  }

  /**
   *
   * @param {string} from business unit id who pays
   * @param {string} to business unit id who receive the cash
   * @param {Float} amount transaction amount
   * @param {any} confLastEdition configuration last edition (version id configuration)
   * @param {string} type transaction type
   * @param {any} event Associated event nedded to get _id, et, user field
   */
  static createTransactionObject$(from, to, amount, confLastEdition, type, event) {
    return Rx.Observable.of({
      fromBu: from,
      toBu: to,
      amount: amount,
      channel: {
        id: CHANNEL_ID,
        v: process.env.npm_package_version,
        c: confLastEdition
      },
      timestamp: Date.now(),
      type: type,
      evt: {
        id: event._id, 
        type: event.et, 
        user: event.user 
      }
    }).mergeMap(transaction => this.truncateAmount$(transaction)
    );
  }


  /**
 * Verifies if the new settings 
 * @param {Object} conf Business rules where
 */
  // static verifyBusinessRules$(conf) {
  //   return Rx.Observable.forkJoin(
  //     Rx.Observable.defer(() => conf.fareCollectors.map(e => e.percentage)),
  //     Rx.Observable.defer(() => conf.parties.map(e => e.percentage)).toArray(),
  //     Rx.Observable.defer(() => conf.surplusCollectors.map(e => e))
  //   )
  //     .mergeMap(([fareCollector, parties, surplusCollector]) =>
  //       Rx.Observable.forkJoin(
  //         this.VerifyPartiesPercentages$(parties)
  //       )
  //     )
  //     .mergeMap(() => Rx.Observable.of(conf))
  // }

//   /**
//  * Verify if the percentage Configuration for the parties is correct
//  * @param {number[]} parties Array numbers
//  * @param {boolean} surplus surplus money available to parties ?
//  * @returns { Observable<any> }
//  */
//   static VerifyPartiesPercentages$(parties) {
//     return Rx.Observable.of(parties)
//       .map(parties => parties.reduce((acc, item) => acc + item, 0))
//       .mergeMap(totalPercentageInParties => (totalPercentageInParties == 100)
//         ? Rx.Observable.of(true)
//         : Rx.Observable.throw(
//           new CustomError(
//             "name",
//             "verifyBusinessRules",
//             "Error with percentages in the parties percentages"
//           ) )
//       )
//   }
  
  //#region Math functions

  /**
   * 
   * @param {number[]} addends 
   * @param {number} zeroFactor 
   */
  static addWithPrecision$(addends, zeroFactor = 2) {
    return Rx.Observable.of(addends)
      .map(addends => addends.reduce((acc, addend) => (acc + addend * Math.pow(10, zeroFactor + 1)), 0))
      .map(addResult => addResult / Math.pow(10, zeroFactor + 1))
      .mergeMap(result => Rx.Observable.of(result))
  }

/**
 * 
 * @param {number} operatorA 
 * @param {number} operatorB 
 * @param {number} zeroFactor 
 */
  static subtractWithPrecision$(operatorA, operatorB, zeroFactor = 2) {
    return Rx.Observable.of({
      a: Math.round(operatorA * Math.pow(10, zeroFactor + 1)),
      b: Math.round(operatorB * Math.pow(10, zeroFactor + 1))
    })
      .map(operators => (operators.a - operators.b) / Math.pow(10, zeroFactor + 1))
  }

  /**
   * 
   * @param {number} percentage 
   * @param {number} total 
   */
  static getValueFromPercentage$(percentage, total) {
    return Rx.Observable.of((total * percentage * 100) / 10000);
  }

//#endregion

}

/**
 * @returns { AfccReloadChannelHelper } unique instance
 */
module.exports = AfccReloadChannelHelper;
