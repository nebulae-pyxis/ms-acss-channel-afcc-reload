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
}
/**
 * @returns { TransactionsErrorsDA } TransactionsDA instance
 */
module.exports =  TransactionsErrorsDA 