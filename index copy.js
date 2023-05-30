const { ApiPromise, WsProvider } = require("@polkadot/api");

// const ENDPOINT = "wss://rpc.astar.network";
const ENDPOINT = "wss://runtime.astar.network";

const FIRST_BLOCK = 3500098;

const connectApi = async () => {
  const wsProvider = new WsProvider(ENDPOINT);
  const api = await ApiPromise.create({ provider: wsProvider });
  return api;
};

const getStats = async () => {
  console.log("Getting block information.");
  const api = await connectApi();

  // const blocksPerEra = await api.consts.dappsStaking.blockPerEra.toNumber();
  // const currentEra = await api.query.dappsStaking.currentEra();
  // let era = 0;
  let block_counter = FIRST_BLOCK;

  // TODO: improve this
  while (block_counter < (FIRST_BLOCK + 1000)) {
    console.log("Processing block: ", block_counter);
    const blockHash = await api.rpc.chain.getBlockHash(block_counter);

    // const apiAt = await api.at(blockHash.toHuman());
    // const signedBlock = await apiAt.rpc.chain.getBlock(blockHash);

    const signedBlock = await api.rpc.chain.getBlock(blockHash);
    const apiAt = await api.at(signedBlock.block.header.hash);
    const allRecords = await apiAt.query.system.events();

    // the information for each of the contained extrinsics
    signedBlock.block.extrinsics.forEach((ex, index) => {
      // the extrinsics are decoded by the API, human-like view
      let humanReadable = ex.toHuman();
      if (humanReadable.method.section !== "ethereum" 
            && humanReadable.method.section !== "timestamp" 
            && humanReadable.method.section !== "parachainSystem") {

        console.log(index, ex.toHuman());

        const systemEvent = allRecords
          .filter(({ phase, event }) =>
          phase.isApplyExtrinsic &&
          phase.asApplyExtrinsic.eq(index) 
          // && event.data.weight 
          && event.data.dispatchInfo != undefined
        )[0];

        const refTime = systemEvent.event.data.dispatchInfo.weight.refTime.toHuman();
        const encodedLength = ex.encodedLength;

        const paymentEvent = allRecords
          .filter(({ phase, event }) =>
            phase.isApplyExtrinsic &&
            phase.asApplyExtrinsic.eq(index)
            && event.index.toHuman() == 0x1e00 // transaction payment event
          )[0];

        const fee = paymentEvent.event.data.actualFee.toHuman();
        const tip = paymentEvent.event.data.tip.toHuman();
        
        console.log(`Fee: ${fee}, Tip: ${tip}, refTime: ${refTime}, encodedLength: ${encodedLength}`);

      }

    });


    // break;

    block_counter++;
  }
};

const run = async () => {
  await getStats();
  process.exit();
};

run();