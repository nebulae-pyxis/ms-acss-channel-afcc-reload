"use strict";

const Rx = require("rxjs");
const DEFAULT_TRANSACTION_TYPE = "AFCC_RELOAD";
const CHANNEL_ID = "ACSS_CHANNEL_AFCC_RELOAD";
const { CustomError, AfccReloadProcessError } = require("../tools/customError");
const [ MAIN_POCKET, BONUS_POCKET ]  = [ 'MAIN', 'BONUS' ];
const BusinessDA = require('../data/businessUnitDA'); 

class AfccReloadChannelHelper {
  constructor() {}

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
    .do(r => console.log("applyBusinessRules$ ==> ", JSON.stringify(configuration), JSON.stringify(afccEvent)) )
    .mergeMap(afccEvent  => 
      Rx.Observable.forkJoin(
        AfccReloadChannelHelper.createTransactionForFareCollector$(configuration, afccEvent),
        AfccReloadChannelHelper.createTransactionForPosOwner$(configuration, afccEvent),
        AfccReloadChannelHelper.createTransactionForParties$(configuration, afccEvent)
      )
    )
    .map(
      ([
        fareCollectorTransation,
        posOwnerTransation,
        partiesTransactions
      ]) => ({
        transactions: [ fareCollectorTransation, posOwnerTransation, ...partiesTransactions ],
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

  /**
   * Create all transaction for each fare collector actor
   * @param { Object } conf Channel configuration
   * @param { Object } afccEvent AFCC reload event
   */
  static createTransactionForFareCollector$(conf, afccEvent) {
    return this.getPercentage$(conf.fareCollectors[0].percentage, afccEvent.amount)
    .mergeMap(value => AfccReloadChannelHelper.createTransactionObject$(
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
          : this.getPercentage$(posOwner.afccChannelPercentage, afccEvent.amount)
            .mergeMap(value => AfccReloadChannelHelper.createTransactionObject$(
              { fromBu: conf.fareCollectors[0].fromBu, buId: posOwner._id },
              value,
              conf,
              DEFAULT_TRANSACTION_TYPE,
              afccEvent
            )
            )
      )
  }

  /**
   * Create all transaction for each third part actor
   * @param { Object } conf Channel configuration
   * @param { Object } afccEvent AFCC reload event
   */
  static createTransactionForParties$(conf, afccEvent) {   
    return Rx.Observable.forkJoin(
      this.getPercentage$(conf.fareCollectors[0].percentage, afccEvent.amount ),
      Rx.Observable.of( conf.posOwner )
        .mergeMap(posOwner => posOwner
          ? this.getPercentage$(posOwner.afccChannelPercentage, afccEvent.amount )
          : Rx.Observable.of(0)  )
    )
    .mergeMap(([fareCollectorAmount, posOwnerAmount])  =>  this.addWithPrecision$([fareCollectorAmount, posOwnerAmount], 2) )
    .mergeMap(debitedAmount => 
      Rx.Observable.of(( (afccEvent.amount * 100) - ( ( afccEvent.discounted * 100) + (debitedAmount * 100)  ) ) / 100) 
    )
    .mergeMap(surplusAmount => 
      Rx.Observable.from(conf.parties)
      .mergeMap(thirdParty => Rx.Observable.forkJoin(
        Rx.Observable.of(thirdParty),
        this.getPercentage$(thirdParty.percentage, surplusAmount)
      ))
      .mergeMap( ([thirdParty, amount]) => AfccReloadChannelHelper.createTransactionObject$(
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
  static validateFinalTransactions$(transactionArray, conf, afccEvent) {
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
              AfccReloadChannelHelper.createTransactionObject$(
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
      Rx.Observable.defer(() => conf.parties.map(e => e.percentage)).toArray(),
      Rx.Observable.defer(() => conf.surplusCollectors.map(e => e))
    )
      .mergeMap(([fareCollector, parties, surplusCollector]) =>
        Rx.Observable.forkJoin(
          AfccReloadChannelHelper.VerifyPartiesPercentages$(parties)
        )
      )
      .mergeMap(() => Rx.Observable.of(conf))
  }

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
  static addWithPrecision(addends, zeroFactor = 2){
    return addends.reduce((acc, addend) =>  acc + addend + Math.pow(10, zeroFactor+1) , 0);
  }

  static subtractWithPrecision$(operatorA, operatorB, zeroFactor = 2){
    return Rx.Observable.of({ a: operatorA * Math.pow(10, zeroFactor + 1), b: operatorB * Math.pow(10, zeroFactor + 1)  })
    .map(operators => (operators.a - operators.b ) / Math.pow(10, zeroFactor+1) );
  } 
  static subtractWithPrecision(operatorA, operatorB, zeroFactor = 2){
    return (operatorA * Math.pow(10, zeroFactor +1) - operatorB * Math.pow(10, zeroFactor +1)) / Math.pow(10, zeroFactor + 1)
  } 

  static getPercentage$(percentage, total){
    return Rx.Observable.of ((total / 100) * percentage);
  }


}

/**
 * @returns { AfccReloadChannelHelper } unique instance
 */
module.exports = AfccReloadChannelHelper;
