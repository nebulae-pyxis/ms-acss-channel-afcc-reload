const Rx = require("rxjs");

let instance;

class BusinessES {

    constructor() {
    }

}

/**
 * @returns { BusinessES }
 */
module.exports = () => {
  if (!instance) {
    instance = new BusinessES();
    console.log("BusinessES Singleton created");
  }
  return instance;
};
