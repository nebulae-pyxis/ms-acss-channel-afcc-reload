// Rx.Observable.interval(5000)
// .mergeMap(() => {
//   const buNames = [
//     { name: "Nebula", id: "Nebula" },
//     { name: "Metro_123", id: "Metro_123" },
//     { name: "Gana_med", id: "Gana_med" }
//   ];
//   return Rx.Observable.of({
//     id: Math.random().toString(),
//     amount: Math.floor(Math.random() * 20) * 1000,
//     timestamp: 1536180161541,
//     bu: buNames[Math.floor(Math.random() * buNames.length)],
//     afcc: {
//       before: "card Before",
//       after: "card After",
//       uid: "sdosd78gsod8fg6s",
//       cardId: "234563463546345634",
//       balanceBefore: 1000,
//       balanceAfter: 2000
//     },
//     source: {
//       machine: "Nesas-12",
//       ip: "192.168.1.15"
//     }
//   });
// })
// .map(afccEvt => {
//   return new Event({
//     eventType: "ACSSConfigurationCreated",
//     eventTypeVersion: 1,
//     aggregateType: "AfccChannel",
//     aggregateId: Date.now(),
//     data: afccEvt,
//     user: 'FELIPE:SANTA'
//   })
// })
// .mergeMap(evt => afccReloadChannelEventConsumer.handleAfccReloaded$(evt))
// .subscribe(
//   ok => {  },
//   error => console.log(error),
//   () => console.log("Finished")
// );


// Rx.Observable.interval(5000)
// .mergeMap(() => {
//   const buNames = [
//     { name: "Nebula", id: "Nebula" },
//     { name: "Metro_123", id: "Metro_123" },
//     { name: "Gana_med", id: "Gana_med" }
//   ];
//   return Rx.Observable.of({
//     amount: 1000,
//     businessId: buNames[Math.floor(Math.random() * 3)].id,
//     afcc: {
//       data: {
//         before: {},
//         after: {}
//       },
//       uId: 'CARD_UIID',
//       cardId: "CARD_ID",
//       balance: {
//         before: 1000,
//         after: 2000
//       }
//     },
//     source: {
//       machine: "Nesas-12",
//       ip: "192.168.1.15"
//     }
//   });
// })
// .mergeMap(afccEvt =>
//   eventSourcing.eventStore
//     .emitEvent$(
//       new Event({
//         eventType: "AfccReloadSold",
//         eventTypeVersion: 1,
//         aggregateType: "Afcc",
//         aggregateId: Date.now(),
//         data: afccEvt,
//         user: 'Felipe_santa'
//       })
//     )
// )
// .subscribe(
//   ok => { },
//   error => console.log(error),
//   () => console.log("Finished")
// );