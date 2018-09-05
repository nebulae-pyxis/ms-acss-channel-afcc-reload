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


  static insertOneEvent$(document){
    const collection = mongoDB.db.collection(CollectionName);
    return Rx.Observable.defer(() => collection.insertOne(document));
  }

  static searchEvent$(id){
    console.log("searchEvent$", id);
    const collection = mongoDB.db.collection(CollectionName);
    return Rx.Observable.defer(() => collection.findOne({ id: id  }))
  }


  
}

module.exports =  AfccReloadsDA 