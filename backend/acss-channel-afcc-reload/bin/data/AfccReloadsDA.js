'use strict'

let mongoDB = undefined;
// const mongoDB = require('./MongoDB').singleton();
const Rx = require('rxjs');
const CollectionName = "afccReloadEvents";
const { CustomError } = require('../tools/customError');


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

  static searchEvent$(id){
    const collection = mongoDB.db.collection(CollectionName);
    return Rx.Observable.defer(() => collection.findOne({ }))
  }

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
        .sort(orderObject)
        .skip(count * page)
        .limit(count)
        .toArray()
    );
  }

  
}
/**
 * @returns { AfccReloadsDA }
 */
module.exports =  AfccReloadsDA 