'use strict'

if (process.env.NODE_ENV !== 'production') {
    require('dotenv').load();
}

const eventSourcing = require('./tools/EventSourcing')();
const eventStoreService = require('./services/event-store/EventStoreService')();
const mongoDB = require('./data/MongoDB').singleton();
const AfccReloadChannelDA = require('./data/AfccReloadChannelDA');
const AfccReloadsDA = require('./data/AfccReloadsDA');
const TransactionsDA = require('./data/TransactionsDA');
const TransactionsErrorsDA = require('./data/TransactionsErrorsDA');
const graphQlService = require('./services/emi-gateway/GraphQlService')();
const Rx = require('rxjs');

const start = () => {
    Rx.Observable.concat(
        eventSourcing.eventStore.start$(),
        eventStoreService.start$(),
        mongoDB.start$(),
        Rx.Observable.forkJoin(
            AfccReloadChannelDA.start$(),
            AfccReloadsDA.start$(),
            TransactionsDA.start$(),
            TransactionsErrorsDA.start$()
        ),
        graphQlService.start$()
    ).subscribe(
        (evt) => { },
        (error) => {
            console.error('Failed to start', error);
            process.exit(1);
        },
        () => console.log('acss-channel-afcc-reload started')
    );
};

start();



