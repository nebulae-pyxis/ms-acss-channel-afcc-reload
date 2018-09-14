'use strict'

let mongoDB = undefined;
//const mongoDB = require('./MongoDB')();
const Rx = require('rxjs');
const CollectionName = "Transactions";
const ACSS_DB_NAME = process.env.MONGODB_ACSS_DB_NAME;
const ObjectID = require("mongodb").ObjectID;
const { CustomError } = require('../tools/customError');


class BusinessUnitDA {

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

  static searchBusinessUnit$(id){
    const collection = mongoDB.client.db(ACSS_DB_NAME).collection(CollectionName);
    return Rx.Observable.defer(() => collection.findOne(
        { _id: new ObjectID.createFromHexString(id) }
    ))
    .catch(error => Rx.Observable.throw(error))
  }

}
/**
 * @returns { BusinessUnitDA } TransactionsDA instance
 */
module.exports =  BusinessUnitDA 