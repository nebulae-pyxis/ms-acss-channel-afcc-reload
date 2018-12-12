const Rx = require("rxjs");
const GraphqlHelper = require('../../tools/GraphqlResponseTools');
const BusinessDA = require('../../data/businessUnitDA');
const { PERMISSION_DENIED_ERROR } = require("../../tools/ErrorCodes");
const RoleValidator = require("../../tools/RoleValidator");

let instance;

class BusinessCQRS {
  constructor() { }
  
  getBusinessUnits$({ args }, authToken){
    return RoleValidator.checkPermissions$(
      authToken.realm_access.roles,
      "AfccReloadAcssChannel",
      "getBusinessUnits$",
      PERMISSION_DENIED_ERROR,
      ["PLATFORM-ADMIN"]
    )
      .mergeMap(() => BusinessDA.searchBusinessUnits$(args.filter, args.limit))
      .do(result => console.log("RESULTADO ==> ", result))
      .mergeMap(rawResponse => GraphqlHelper.buildSuccessResponse$(rawResponse))
      .catch(error => GraphqlHelper.handleError$(error))

  }

}

/**
 * Log error
 * @returns {BusinessCQRS}
 */
module.exports = () => {
  if (!instance) {
    instance = new BusinessCQRS();
    console.log("BusinessCQRS Singleton created");
  }
  return instance;
};
