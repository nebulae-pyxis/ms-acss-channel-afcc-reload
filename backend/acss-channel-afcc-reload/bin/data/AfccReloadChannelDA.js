'use strict'

let mongoDB = undefined;
//const mongoDB = require('./MongoDB')();
const Rx = require('rxjs');
const CollectionName = "acssChannel";
const { CustomError } = require('../tools/customError');


class AfccReloadChannelDA {
  static start$(mongoDbInstance) {
    return Rx.Observable.create(observer => {
      if (mongoDbInstance) {
        mongoDB = mongoDbInstance;
        observer.next("using given mongo instance");
      } else {
        mongoDB = require("./MongoDB").singleton();
        observer.next("using singleton system-wide mongo instance");
      }
      observer.complete();
    });
  }

  /**
   * get hello world data
   * @param {string} type
   */
  static getHelloWorld$(evt) {
    return Rx.Observable.of(`{sn: Hello World ${Date.now()}}`).map(val => {
      const result = {};
      result["sn"] = val;
      return result;
    });
  }

  static insertConfiguration$(conf) {
    // console.log("insertConfiguration$", doc);
    const collection = mongoDB.db.collection(CollectionName);

    return Rx.Observable.forkJoin(
      Rx.Observable.defer(() => collection.findOneAndUpdate(
        { id: 1 },
        { $set: conf },
        { upsert: true }
      )),
      Rx.Observable.of(conf)
        .map((doc) => {
          doc.id = doc.lastEdition;
          return doc;
        })
        .do(doc => console.log("###############", doc, "######################"))
        .mergeMap((doc) => Rx.Observable.defer(() => collection.insertOne(doc))
        )
    )
  }

  static searchConfiguration$(id) {
    const collection = mongoDB.db.collection(CollectionName);
    return Rx.Observable.defer(() => collection.findOne({ id: id }));
  }
}

/**
 * @returns {AfccReloadChannelDA}
 */
module.exports =  AfccReloadChannelDA 