"use strict";

const Rx = require("rxjs");
const DEFAULT_TRANSACTION_TYPE = "AFCC_RELOAD";
const CHANNEL_ID = "ACSS_CHANNEL_AFCC_RELOAD";
const { CustomError, AfccReloadProcessError } = require("../tools/customError");
const [ MAIN_POCKET, BONUS_POCKET, CREDIT_POCKET  ]  = [ 'MAIN', 'BONUS', 'CREDIT' ];
const BusinessDA = require('../data/businessUnitDA'); 

class AfccReloadChannelHelper {
  constructor() {}

  static generateTransactions$(conf, evt){
    switch(evt.data.pocketAlias){
      case BONUS_POCKET: return this.generateTransactionsForBonusPocketCase$(conf, evt);
      case MAIN_POCKET: return this.generateTransactionsForMainPocketCase$(conf, evt);
      case CREDIT_POCKET: return this.generateTransactionsForBonusPocketCase$(conf, evt);
      default: return Rx.Observable.throw("Pocket alias no allowed");
    }
  }

  static generateTransactionsForCreditPocketCase$(conf,evt){
    return Rx.Observable.of([]);

  }

  static generateTransactionsForMainPocketCase$(conf, evt) {
    // apply the rules and return the array with all transaction to persist
    // .do(r => console.log("AFTER fillWithPosOwner$ ==>", JSON.stringify(r)))  
    return this.applyBusinessRules$(conf, evt)
      .mergeMap(result => this.validateTransactionForSurplus$(result.transactions, result.conf, evt))
  }

  static generateTransactionsForBonusPocketCase$(conf, evt){
    return Rx.Observable.forkJoin(
      this.createTransactionForFareCollector$(conf, evt),
      this.createTransactionForSurplus$(conf, evt)
    )
      // .map(([fareCollectorTransation, surplusTransaction]) => ({
      //   transactions: [fareCollectorTransation, surplusTransaction], conf: conf
      // }))
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
   *
   * @param {Object} configuration Business rules to create transactions
   * @param {Object} AfccEvent AFCC event to process with the given configuration
   * @returns {<Observable>} Observable with transaction array
   */
  static applyBusinessRules$(configuration, afccEvent) {    
    return Rx.Observable.of(afccEvent.data.transactions)
    .mergeMap(txs => this.getSignificantTransaction$(txs, afccEvent))
    // .do(r => {
    //   console.log("====== ApplyBusinessRules$ ======= ");
    //   console.log("====== CONFIGURATION ==> ", JSON.stringify(configuration), );
    //   console.log("====== AfccEvent ==> ", JSON.stringify(afccEvent));
    // } )
    .mergeMap(afccEvent  => 
      Rx.Observable.forkJoin(
        this.createTransactionForFareCollector$(configuration, afccEvent),
        this.createTransactionForPosOwner$(configuration, afccEvent),
        this.createTransactionForParties$(configuration, afccEvent)
      )
    )
    .map(
      ([
        fareCollectorTransation,
        posOwnerTransation,
        partiesTransactions
      ]) => ({
        transactions: [ fareCollectorTransation, ...posOwnerTransation, ...partiesTransactions ],
        conf: configuration
      })
    );
  }

  /**
   * returns the more significant transaction
   * @param {Array} transactionArray 
   */
  static getSignificantTransaction$(transactionArray, afccEvent){
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

  static createTransactionForSurplus$(conf, afccEvent) {
    return this.subtractWithPrecision$(100, conf.fareCollectors[0].percentage)
      .mergeMap(surplusPercentage => this.getValueFromPercentage$(surplusPercentage, afccEvent.amount))
      .mergeMap(value => this.createTransactionObject$(
        conf.fareCollectors[0],
        value,
        conf,
        DEFAULT_TRANSACTION_TYPE,
        afccEvent
      ))

  }

  /**
   * Create all transaction for each fare collector actor
   * @param { Object } conf Channel configuration
   * @param { Object } afccEvent AFCC reload event
   */
  static createTransactionForFareCollector$(conf, afccEvent) {
    return this.getValueFromPercentage$(conf.fareCollectors[0].percentage, afccEvent.amount)
    .mergeMap(value => this.createTransactionObject$(
      conf.fareCollectors[0],
      value,
      conf,
      DEFAULT_TRANSACTION_TYPE,
      afccEvent
    ) )
  }




  static createTransactionForPosOwner$(conf, afccEvent) {
    return Rx.Observable.of(conf.posOwner)
      .mergeMap(posOwner =>
        !posOwner
          ? Rx.Observable.of([])
          : this.getValueFromPercentage$(posOwner.afccChannelPercentage, afccEvent.amount)
            .mergeMap(value => this.createTransactionObject$(
              { fromBu: conf.fareCollectors[0].fromBu, buId: posOwner._id },
              value,
              conf,
              DEFAULT_TRANSACTION_TYPE,
              afccEvent
            )
            )
            .map( tx => ([tx]))
      )
  }

  /**
   * Create all transaction for each third part actor
   * @param { Object } conf Channel configuration
   * @param { Object } afccEvent AFCC reload event
   */
  static createTransactionForParties$(conf, afccEvent) {   
    return Rx.Observable.of(conf.posOwner)
    .map(posOwner => posOwner
      ? (posOwner.afccChannelPercentage * 100) + ( conf.fareCollectors[0].percentage * 100 )
      : conf.fareCollectors[0].percentage * 100
    )
    .mergeMap(percentageUsed => this.getValueFromPercentage$(percentageUsed/100, afccEvent.amount ))    
    .mergeMap( moneyUsed => this.subtractWithPrecision$(afccEvent.amount, ( ((moneyUsed*100)  + (afccEvent.discounted*100) )/100  ) ) )
    .mergeMap(amountForThirdPArties => 
      Rx.Observable.from(conf.parties)
      .mergeMap(thirdParty => Rx.Observable.forkJoin(
        Rx.Observable.of(thirdParty),
        this.getValueFromPercentage$(thirdParty.percentage, amountForThirdPArties)
      ))
      .mergeMap( ([thirdParty, amount]) => this.createTransactionObject$(
              thirdParty,
              amount,
              conf,
              DEFAULT_TRANSACTION_TYPE,
              afccEvent
            )
          )
      )
      .toArray();
  }

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
   * @param {any} conf Channel configuration
   * @param {any} evt AFCC reload event
   */
  static validateTransactionForSurplus$(transactionArray, conf, afccEvent) {
    return Rx.Observable.of(transactionArray.reduce((acumulated, tr) => acumulated + (tr.amount * 1000), 0))
      .map(amountProcessed => Math.floor(amountProcessed) / 1000)
      .mergeMap(amountProcessed => Rx.Observable.forkJoin(
        Rx.Observable.of(amountProcessed),
        this.getSignificantTransaction$(afccEvent.data.transactions, afccEvent)
      )) 
      .mergeMap(([amountProcessed, significantTransaction]) => 
        (amountProcessed + significantTransaction.discounted) == significantTransaction.amount 
          ? Rx.Observable.of(transactionArray)
          : Rx.Observable.of(amountProcessed  + significantTransaction.discounted )
            .map(amount => Math.round((significantTransaction.amount - amount) * 100) / 100)
            .mergeMap(amount =>
              this.createTransactionObject$(
                conf.surplusCollectors[0],
                amount,
                conf,
                DEFAULT_TRANSACTION_TYPE,
                significantTransaction
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
   * @param {string} actorConf
   * @param {Float} amount
   * @param {any} conf
   * @param {string} type
   * @param {any} afccEvent
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

  /**
 * Verify if the percentage Configuration for the parties is correct
 * @param {number[]} parties Array numbers
 * @param {boolean} surplus surplus money available to parties ?
 * @returns { Observable<any> }
 */
  static VerifyPartiesPercentages$(parties) {
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
  
  static addWithPrecision$(addends, zeroFactor = 2){
    return Rx.Observable.of(addends)
    .map(addends => addends.reduce((acc, addend) =>  (acc + addend * Math.pow(10, zeroFactor+1)) , 0))
    .map(addResult => addResult /  Math.pow(10, zeroFactor + 1))
    .mergeMap(result => Rx.Observable.of(result))
  }
  

  static subtractWithPrecision$(operatorA, operatorB, zeroFactor = 2){
    return Rx.Observable.of({
      a: Math.round(operatorA * Math.pow(10, zeroFactor + 1)),
      b: Math.round(operatorB * Math.pow(10, zeroFactor + 1))
    })
    .map(operators => (operators.a - operators.b ) / Math.pow(10, zeroFactor+1) )
  } 

  static getValueFromPercentage$(percentage, total){
    return Rx.Observable.of ((total * percentage * 100 )  / 10000 );
  }


}

/**
 * @returns { AfccReloadChannelHelper } unique instance
 */
module.exports = AfccReloadChannelHelper;
