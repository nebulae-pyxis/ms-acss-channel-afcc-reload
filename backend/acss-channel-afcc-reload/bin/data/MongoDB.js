"use strict";

const Rx = require("rxjs");
const MongoClient = require("mongodb").MongoClient;
let instance = null;

class MongoDB {
  /**
   * initialize and configure Mongo DB
   * @param { { url, dbName } } ops
   */
  constructor({ url, dbName }) {
    this.url = url;
    this.dbName = dbName;
  }

  /**
   * Starts DB connections
   * @returns {Rx.Observable} Obserable that resolve to the DB client
   */
  start$() {
    console.log("MongoDB.start$()... ");
    return Rx.Observable.bindNodeCallback(MongoClient.connect)(this.url).map(
      client => {
        console.log(this.url);
        this.client = client;
        this.db = this.client.db(this.dbName);
        return `MongoDB connected to dbName= ${this.dbName}`;
      }
    );
  }

  /**
   * Stops DB connections
   * Returns an Obserable that resolve to a string log
   */
  stop$() {
    return Rx.Observable.create(observer => {
      this.client.close();
      observer.next("Mongo DB Client closed");
      observer.complete();
    });
  }
  /**
   * Drop current DB
   */
  dropDB$() {
    return Rx.Observable.create(async observer => {
      await this.db.dropDatabase();
      observer.next(`Database ${this.dbName} dropped`);
      observer.complete();
    });
  }
  /**
   * extracts every item in the mongo cursor, one by one
   * @param {*} cursor
   */
  static extractAllFromMongoCursor$(cursor) {
    return Rx.Observable.create(async observer => {
      let obj = await MongoDB.extractNextFromMongoCursor(cursor);
      while (obj) {
        observer.next(obj);
        obj = await MongoDB.extractNextFromMongoCursor(cursor);
      }
      observer.complete();
    });
  }

  /**
   * Extracts the next value from a mongo cursos if available, returns undefined otherwise
   * @param {*} cursor
   */
  static async extractNextFromMongoCursor(cursor) {
    const hasNext = await cursor.hasNext();
    return hasNext ? await cursor.next() : undefined;
    // if (hasNext) {
    //   const obj = await cursor.next();
    //   return obj;
    // }
    // return undefined;
  }

  /**
   * Ensure Index creation
   * Returns an Obserable that resolve to a string log
   */
  createIndexes$() {
    return Rx.Observable.create(async observer => {
      // observer.next('Creating index for DB_NAME.COLLECTION_NAME => ({ xxxx: 1 })  ');
      // await this.db.collection('COLLECTION_NAME').createIndex( { xxxx: 1});

      observer.next("All indexes created");
      observer.complete();
    });
  }
}
/**
 * @returns { MongoDB } MongoDB instance
 */
module.exports = {
  MongoDB,
  singleton() {
    if (!instance) {
      instance = new MongoDB({
        url: process.env.MONGODB_URL,
        dbName: process.env.MONGODB_DB_NAME
      });
      console.log(`MongoDB instance created: ${process.env.MONGODB_DB_NAME}`);
    }
    return instance;
  }
};
