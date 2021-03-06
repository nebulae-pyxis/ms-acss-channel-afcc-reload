export const locale = {
  lang: 'en',
  data: {
    SALES_WITH_MAIN: 'Sales made with main pocket',
    SALES_WITH_BONUS: 'Sales made with bonus pocket',
    SALES_WITH_CREDIT: 'Sales made with credit pocket',
    SETTINGS: {
      TITLE: 'Channel Configurations',
      FARE_COLLECTOR_TITTLE: 'Farecollector',
      RELOADERS_TITTLE: 'Reloaders network',
      ACTORS_TITTLE: 'ACTORS',
      SURPLUS_COLLECTOR_TITTLE: 'Leftovers collector',
      BONUS_COLLECTOR_TITTLE: 'Bonus Collector',
      INVESTMENT_COLLECTOR_TITTLE: 'Investment Collector'
    },
    FORM: {
      BUSINESS_FROM: 'Cuenta Origen',
      BUSINESS_TO: 'Cuenta Destino',
      PERCENTAGE_BELONG: 'Percentage'
    },
    ERRORS: {
      PERCENTAGE_EXECEEDED: 'The sum of this percentage with the percentage of the collector can not exceed 100',
      PERCENTAGE_EXECEEDED_PARTIES: 'The sum of the percentages can not exceed 100%',
      PERCENTAGE_NOT_EXECEEDED_PARTIES: 'The sum of the percentages can not be less than 100%'
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
