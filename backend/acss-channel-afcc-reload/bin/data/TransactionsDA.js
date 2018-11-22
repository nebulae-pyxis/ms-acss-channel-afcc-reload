'use strict'

let mongoDB = undefined;
//const mongoDB = require('./MongoDB')();
const Rx = require('rxjs');
const CollectionName = "Transactions";
const ACSS_DB_NAME = process.env.MONGODB_ACSS_DB_NAME;
const NumberDecimal = require('mongodb').Decimal128;
const { CustomError } = require('../tools/customError');


class TransactionsDA {

  static start$(mongoDbInstance) {
    return Rx.Observable.create((observer) => {
      if (mongoDbInstance) {
        mongoDB = mongoDbInstance;
        observer.next('using given mongo instance');
      } else {
        mongoDB = require('./MongoDB').singleton();
        observer.next('using singleton system-wide mongo instance');
      }
      observer.complete();
    });
  }

  /**
   * todo
   * @param {string} afccEvtId AFCC evtn id
   * @returns {Observable<Object[]>} Array with each transaction that was made as a consequence of processing the AFCC event to which afccEvtId refers.
   */
  static searchTransactionFromAfccEvt$(afccEvtId){
    const collection = mongoDB.client.db(ACSS_DB_NAME).collection(CollectionName);
    return Rx.Observable.defer(() => collection.find({ }).toArray())
    .catch(error => Rx.Observable.throw(error))
  }
  
  static searchTransactions$({ page, count, lowerLimit, filter, sortColumn, order }){
    let filterObject = {'timestamp' : {$gt: lowerLimit } };
    const orderObject = {};
    if (filter && filter != "") {
     const filterWithRegex = {
        $or: [
          { 'fromBu': { $regex: `${filter}.*`, $options: "i" } },
          { 'toBu': { $regex: `${filter}.*`, $options: "i" } },
          { 'type': { $regex: `${filter}.*`, $options: "i" } }
        ]
      };
      filterObject = Object.assign(filterObject, filterWithRegex);
    }    
    if (sortColumn && order) {
      let column = sortColumn;      
      orderObject[column] = order == 'asc' ? 1 : -1;
    }
    const collection = mongoDB.client.db(ACSS_DB_NAME).collection(CollectionName);
    return Rx.Observable.defer(()=>
      collection
        .find(filterObject)
        .sort(orderObject)
        .skip(count * page)
        .limit(count)
        .toArray()
    )
    .mergeMap(transactions => Rx.Observable.from(transactions))
    .map(tx => ({ ...tx, amount: parseFloat(new NumberDecimal(tx.amount.bytes).toString()) }) )
    .toArray()
  }

  static insertTransactions$(transactions){
    const collection = mongoDB.client.db(ACSS_DB_NAME).collection(CollectionName);
    return Rx.Observable.from(transactions)
    .map(transaction => ({ ...transaction, amount: NumberDecimal.fromString( transaction.amount.toString() )  }))
    .toArray()
    .mergeMap(transactionsArray => Rx.Observable.defer(() => collection.insertMany(transactionsArray) ))
    // return Rx.Observable.defer(() => collection.insertMany(documents));    
  }
}
/**
 * @returns { TransactionsDA } TransactionsDA instance
 */
module.exports =  TransactionsDA 