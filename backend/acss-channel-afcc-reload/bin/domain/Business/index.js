const eventSourcing = require('./BusinessES')();
const cqrs = require('./BusinessCQRS')();

module.exports = {
    eventSourcing,
    cqrs
};
