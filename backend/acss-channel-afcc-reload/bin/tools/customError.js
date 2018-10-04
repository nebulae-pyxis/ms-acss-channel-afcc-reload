//Every single error code
// please use the prefix assigned to this micorservice
const INTERNAL_SERVER_ERROR_CODE = 00001;

/**
 * class to emcapsulute diferent errors.
 */
class CustomError extends Error {
  /**
   *
   * @param {string} name Error name
   * @param {string} method Method where error was generated
   * @param {string} code Error code
   * @param {string} message Error message
   */
  constructor(name, method, code = INTERNAL_SERVER_ERROR_CODE, message = "") {
    super(message);
    this.code = code;
    this.name = name;
    this.method = method;
  }

  getContent() {
    return {
      name: this.name,
      code: this.code,
      msg: this.message,
      method: this.method
      // stack: this.stack
    };
  }
}

class DefaultError extends Error {
  constructor(anyError) {
    super(anyError.message);
    this.code = INTERNAL_SERVER_ERROR_CODE;
    this.name = anyError.name;
    this.msg = anyError.message;
    // this.stack = anyError.stack;
  }

  getContent() {
    return {
      code: this.code,
      name: this.name,
      msg: this.msg
    };
  }
}

class AfccReloadProcessError extends Error {
  /**
   *    
   * @param {string} errorName Error name
   * @param {string} errorMessage  Error message
   * @param {any} afccEvent Afcc event that generates the error
   * @param {any} channelConf Channel configuration used in the afcc event process
   */
  constructor(errorName, errorMessage, afccEvent, channelConf){
    super(errorMessage);
    this.name = errorName;
    this.afccEvent = afccEvent;
    this.channelConf = channelConf;
    this.timestamp = Date.now();
  }

  getContent(){
    return { 
      name: this.name,
      message: this.message,
      afccEvent: this.afccEvent,
      channelConf: this.channelConf,
      timestamp: this.timestamp
    }
  }
}

module.exports = {
  CustomError,
  DefaultError,
  AfccReloadProcessError
};
