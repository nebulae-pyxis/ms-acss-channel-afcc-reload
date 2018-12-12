'use strinct'

const Rx = require('rxjs');
const { CustomError, DefaultError } = require('./customError');

const buildSuccessResponse$ = (rawRespponse) => {
    return Rx.Observable.of(rawRespponse)
        .map(resp => ({
            data: resp,
            result: { code: 200 }
        })
        );
};

const buildErrorResponse$ = (errCode, rawRespponse) => {
    return Rx.Observable.of(rawRespponse)
        .map(resp => ({
                data: resp,
                result: { code: errCode }
            })
        );
};

const handleError$ = (err) => {
    console.log("GraphQl error handler ==> ", err)
    return Rx.Observable.of(err)
        .map(err => {
            const exception = { data: null, result: {} };
            const isCustomError = err instanceof CustomError;
            if (!isCustomError) {
                err = new DefaultError(err);
            }
            exception.result = {
                code: err.code,
                error: { ...err.getContent() }
            };
            return exception;
        })
    ;
}

module.exports = {
    buildSuccessResponse$, 
    handleError$,
    buildErrorResponse$
}