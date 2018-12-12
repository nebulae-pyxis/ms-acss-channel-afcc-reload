export const locale = {
  lang: 'es',
  data: {
    SALES_WITH_MAIN: 'Ventas Realizadas con la bolsa de Saldo',
    SALES_WITH_BONUS: 'Ventas realizadas con la bolsa de comisión',
    SALES_WITH_CREDIT: 'ventas realizadas con la bolsa de crédito',
    SETTINGS: {
      TITLE: 'Configuracion de unidad de negocio',
      FARE_COLLECTOR_TITTLE: 'Fare collector',
      RELOADERS_TITTLE: 'Red de recargas',
      PARTIES_TITTLE: 'Terceros',
      SURPLUS_COLLECTOR_TITTLE: 'Recolector de residuos',
      BONUS_COLLECTOR_TITTLE: 'Recollector de comisiones'
    },
    FORM: {
      BUID_PLACEHOLDER: 'ID de unidad de negocio',
      BU_NAME: 'Nombre de la unidad de negocio',
      BU_FROM: 'Unidad de negocio que paga',
      PERCENTAGE_BELONG: 'Porcentaje'
    },
    ERRORS: {
      PERCENTAGE_EXECEEDED: 'Este porcentaje sumado con el del recaudador no pueden superar el 100',
      PERCENTAGE_EXECEEDED_PARTIES: 'La suma de los porcentajes no puede superar el 100%',
      PERCENTAGE_NOT_EXECEEDED_PARTIES: 'La suma de los porcentajes no puede ser inferior a  el 100%'
    },
    DEFINITIONS: {
      FARECOLLECTORS: `Es el ente recaudador del dinero de las recargas con mayor porcentaje, este porcentaje
      se calcula con respecto al valor total de la recarga`,
      RELOAD_NETWORKS: `Son loas actores por medio de los cuales es posible realizar una recarga,
       estos tiene derecho a un porcentaje del valor totalde la recarga, este porcentaje sumado con el porcentaje del
       Farecollector no puede superar el 100%`,
      THIRD_PARTIES: `El dinero sobrante tras haber aplicado los porcentajes para el Farecollector y la red de recargas
      se debe repartir sobre los actores que recoben el nombre de terceros. estos de deben repartir el dinero restante entre ellos.
      La suma de los porcentajes de todos los terceros debe sumer un 100%`,
      LEFTOVER_COLLECTORS: `Debido a que en la hora de hacer la reparticion de sinero de acuerdo a los porcenjes ingresados es muy
      posible de que hayan caso en los que al hacer la proximacion del monto pueden haber perdidas de dinero por centavos, todos estos centavos
      deben de  depositarse sobre una cuenta externa donde puedan ser utilizados despues`
    }
  }
};
