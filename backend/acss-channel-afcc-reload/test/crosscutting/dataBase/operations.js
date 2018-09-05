// Rx.Observable.interval(5000)
// .mergeMap(() => {
//   const buNames = [
//     { name: "Nebula", id: "Nebula_001" },
//     { name: "Pyxis", id: "Pyxis_002" },
//     { name: "TPM", id: "TPM_003" }
//   ];
//   return Rx.Observable.of({
//     id: Math.random().toString(),
//     amount: 1000,
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
// .mergeMap(evt => afccReloadChannelEventConsumer.handleAfccReloaded$(evt))
// .subscribe(
//   ok => console.log(ok),
//   error => console.log(error),
//   () => console.log("Finished")
// );