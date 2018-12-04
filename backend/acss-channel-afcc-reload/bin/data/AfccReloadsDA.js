'use strict'

let mongoDB = undefined;
// const mongoDB = require('./MongoDB').singleton();
const Rx = require('rxjs');
const CollectionName = "AfccReloadEvents";
const ObjectID = require("mongodb").ObjectID;
const { CustomError } = require('../tools/customError');
const NumberDecimal = require('mongodb').Decimal128;

class AfccReloadsDA {

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


  static insertOneReload$(document){
    const collection = mongoDB.db.collection(CollectionName);
    return Rx.Observable.defer(() => collection.insertOne(document));
  }

  /**
   * 
   * @param { string } id reload id 
   * @returns { Rx.Observable <any> } 
   */
  static searchReload$(id){
    const collection = mongoDB.db.collection(CollectionName);
    return Rx.Observable.defer(() => collection.findOne(
      { _id: new ObjectID.createFromHexString(id) }
      )
    )
    .mergeMap(reloadObj => Rx.Observable.forkJoin(
      Rx.Observable.of(reloadObj),
      Rx.Observable.from(reloadObj.transactions)
      .map(tx => ({ ...tx, amount: parseFloat(new NumberDecimal(tx.amount.bytes).toString()) }) )
      .toArray()
    ))
    .map(([reloadObj, transactions]) => ({...reloadObj, transactions: transactions}))
  }

  /**
   * @returns {Rx.Observable<number>} reloads quantity
   */
  static getReloadsCount$(){
    const collection = mongoDB.db.collection(CollectionName);
    return Rx.Observable.defer(() => collection.count() );
  }

    /**
   * gets all the business registered on the system.
   *
   * @param {int} page Indicates the page number which will be returned
   * @param {int} count Indicates the amount of rows that will be returned
   * @param {filter} filter filter to apply to the query.
   * @param {sortColumn} sortColumn Indicates what column will be used to sort the data
   * @param {order} order Indicates if the info will be asc or desc
   */

   
  static searchReloads$({page, count, searchFilter, sortColumn, order}) {
    let filterObject = {};
    const orderObject = {};
    if (searchFilter && searchFilter != "") {
      filterObject = {
        $or: [
          { 'bu.name': { $regex: `${searchFilter}.*`, $options: "i" } },
          { 'source.machine': { $regex: `${searchFilter}.*`, $options: "i" } }
        ]
      };
    }

    if (sortColumn && order) {
      let column = sortColumn;
      orderObject[column] = order == 'asc' ? 1 : -1;
    }
    const collection = mongoDB.db.collection(CollectionName);
    return Rx.Observable.defer(() =>
      collection
        .find(filterObject)
        .sort({ timestamp: -1 })
        .skip(count * page)
        .limit(count)
        .toArray()
    )
    .mergeMap(resultArray => Rx.Observable.from(resultArray)
      .map(reload => ({ ...reload, id: reload._id.toString() }))
      .toArray()
    )
  }

  
}
/**
 * @returns { AfccReloadsDA }
 */
module.exports =  AfccReloadsDA 