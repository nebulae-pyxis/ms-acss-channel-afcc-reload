'use strict'

let mongoDB = undefined;
//const mongoDB = require('./MongoDB')();
const Rx = require('rxjs');
const COLLECTION_NAME = "TransactionsErrors";
const ACSS_DB_NAME = process.env.MONGODB_ACSS_DB_NAME;
const { CustomError } = require('../tools/customError');


class TransactionsErrorsDA {

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
   * @param {any []} error to insert
   */
  static insertError$(error){
    const collection = mongoDB.client.db(ACSS_DB_NAME).collection(COLLECTION_NAME);
    return Rx.Observable.defer(() => collection.insertOne(error));    
  }

  static findReloadErrors$({page, count, searchFilter, sortColumn, order}) {
    let filterObject = {};
    const orderObject = {};
    if (searchFilter && searchFilter != "") {
      filterObject = {
        $or: [
          { 'name': { $regex: `${searchFilter}.*`, $options: "i" } }
        ]
      };
    }

    if (sortColumn && order) {
      let column = sortColumn;
      orderObject[column] = order == 'asc' ? 1 : -1;
    }
    const collection = mongoDB.client.db(ACSS_DB_NAME).collection(COLLECTION_NAME);
    return Rx.Observable.defer(() =>
      collection
        .find(filterObject)
        .sort(orderObject)
        .skip(count * page)
        .limit(count)
        .toArray()
    )
    .mergeMap(resultArray => Rx.Observable.from(resultArray)
      .map(reloadError => ({ ...reloadError, id: reloadError._id.toString() }))
      .toArray()
    )
  }
}
/**
 * @returns { TransactionsErrorsDA } TransactionsDA instance
 */
module.exports =  TransactionsErrorsDA 