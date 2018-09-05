"use strict";

const Rx = require("rxjs");
const broker = require("../tools/broker/BrokerFactory")();
const MATERIALIZED_VIEW_TOPIC = "materialized-view-updates";
const AfccReloadsDA = require("../data/AfccReloadsDA");
const AfccReloadChannelDA = require('../data/AfccReloadChannelDA');
const TransactionsDA = require('../data/TransactionsDA');
const CURRENT_RULE = 1;

/**
 * Singleton instance
 */
let instance;

class UserEventConsumer {
  constructor() {}

  handleHelloWorld$(){

  }

  handleAfccReloaded$(evt){

    return AfccReloadChannelDA.searchConfiguration$(CURRENT_RULE)
    .mergeMap(conf => this.applyBusinessRules(conf, evt) )

  }

  

}

module.exports = () => {
  if (!instance) {
    instance = new UserEventConsumer();
    console.log(`${instance.constructor.name} Singleton created`);
  }
  return instance;
};