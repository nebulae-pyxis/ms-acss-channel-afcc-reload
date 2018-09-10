'use strict'

let mongoDB = undefined;
//const mongoDB = require('./MongoDB')();
const Rx = require('rxjs');
const CollectionName = "transactions";
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
   * 
   * @param {string} afccEvtId AFCC evtn id
   * @returns {Observable<Object[]>} Array with each transaction that was made as a consequence of processing the AFCC event to which afccEvtId refers.
   */
  static searchTransactionFromAfccEvt$(afccEvtId){
    const collection = mongoDB.db.collection(CollectionName);
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
    console.log(filterObject);
    
    if (sortColumn && order) {
      let column = sortColumn;      
      orderObject[column] = order == 'asc' ? 1 : -1;
    }
    const collection = mongoDB.db.collection(CollectionName);
    return Rx.Observable.defer(()=>
      collection
        .find(filterObject)
        .sort(orderObject)
        .skip(count * page)
        .limit(count)
        .toArray()
    );
  }

  static insertTransactions$(documents){
    const collection = mongoDB.db.collection(CollectionName);
    return Rx.Observable.defer(() => collection.insertMany(documents));    
  }
}

module.exports =  TransactionsDA 