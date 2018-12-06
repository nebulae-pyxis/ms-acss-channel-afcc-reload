'use strict'

let mongoDB = undefined;
//const mongoDB = require('./MongoDB')();
const Rx = require('rxjs');
const CollectionName = "Business";
const ACSS_DB_NAME = process.env.MONGODB_ACSS_DB_NAME;
const ObjectID = require("mongodb").ObjectID;


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

  /**
   * Inserts and updates the Afcc channel percentage value and children business units in the related business unit
   * @param {string} businessId 
   * @param {number} afccChannelPercentage 
   * @param {string[]} childrenBuIds
   */
  static updateAfccPercentageAttributes$(businessId, afccChannelPercentage, childrenBuIds) {
    const collection = mongoDB.client.db(ACSS_DB_NAME).collection(CollectionName);
    return Rx.Observable.defer(() => collection.findOneAndUpdate(
          { _id: businessId },
          { $set: { afccChannelPercentage: afccChannelPercentage, childrenBuIds: childrenBuIds } }
        )
      );
  }

  /**
   * Removes (afccChannelPercentage, childrenBuIds ) attributes 
   * @param {string} businessId 
   * @param {number} afccChannelPercentage 
   * @param {string[]} childrenBuIds
   */
  static removeAfccPercentageAttributes$(businessId) {
    console.log("removeAfccPercentageAttributes$", businessId);
    const collection = mongoDB.client.db(ACSS_DB_NAME).collection(CollectionName);
    return Rx.Observable.defer(() =>
      collection.findOneAndUpdate(
        { _id: businessId },
        { $unset: { afccChannelPercentage: "", childrenBuIds: "" } }
      )
    )
  }


  /**
   * searchs if the business unit that enters as a parameter is a business unit that
   * is the daughter of another business unit
   * @param {string} businessId 
   */
  static searchPosOwner$(businessId) {
    const collection = mongoDB.client.db(ACSS_DB_NAME).collection(CollectionName);
    return Rx.Observable.defer(() =>
      collection.findOne({ childrenBuIds: { $in: [businessId] } })
    );
  }



}
/**
 * @returns { BusinessUnitDA } TransactionsDA instance
 */
module.exports =  BusinessUnitDA 