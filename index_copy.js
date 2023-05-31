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
  const api = await connectApi();

  let blockCounter = FIRST_BLOCK;

  console.log("Type;BlockNumber;RefTime;TxLength;FeeWithoutTip");

  while (blockCounter < (FIRST_BLOCK + 1000)) {
    const blockHash = await api.rpc.chain.getBlockHash(blockCounter);

    const signedBlock = await api.rpc.chain.getBlock(blockHash);
    const apiAt = await api.at(signedBlock.block.header.hash);
    const allRecords = await apiAt.query.system.events();

    // the information for each of the contained extrinsics
    for (let index = 0; index < signedBlock.block.extrinsics.length; index++) {
      const ex = signedBlock.block.extrinsics[index];
      // the extrinsics are decoded by the API, human-like view
      let humanReadable = ex.toHuman();
      if (humanReadable.method.section !== "ethereum"
        && humanReadable.method.section !== "timestamp"
        && humanReadable.method.section !== "parachainSystem") {

        const systemEvent = allRecords
          .filter(({ phase, event }) =>
            phase.isApplyExtrinsic &&
            phase.asApplyExtrinsic.eq(index)
            // && event.data.weight 
            && event.data.dispatchInfo != undefined
          )[0];

        const refTime = systemEvent.event.data.dispatchInfo.weight.refTime.toPrimitive();
        const encodedLength = ex.encodedLength;

        const paymentEvent = allRecords
          .filter(({ phase, event }) =>
            phase.isApplyExtrinsic &&
            phase.asApplyExtrinsic.eq(index)
            && event.index.toHuman() == 0x1e00 // transaction payment event
          )[0];

        const fee = paymentEvent.event.data.actualFee.toPrimitive();

        console.log(`Native;${blockCounter};${refTime};${encodedLength};${fee}`);

      } else if (humanReadable.method.section === "ethereum") {
        const extrinsicEvents = allRecords
          .filter(({ phase, event }) =>
            phase.isApplyExtrinsic &&
            phase.asApplyExtrinsic.eq(index)
          );
          const txHash = extrinsicEvents[extrinsicEvents.length - 2].toHuman().event.data.transactionHash;
          const receipt = await api.rpc.eth.getTransactionReceipt(txHash);
          const usedGas = receipt.gasUsed?.toPrimitive();

          const feeWithoutTip = usedGas * 1_000_000_000;

          const systemEvent = extrinsicEvents.filter(({ phase, event }) => event.data.dispatchInfo != undefined)[0];
          const refTime = systemEvent.event.data.dispatchInfo.weight.refTime.toPrimitive();
          const encodedLength = ex.encodedLength;

          console.log(`Ethereum;${blockCounter};${refTime};${encodedLength};${feeWithoutTip}`);
      }

    };

    blockCounter++;
  }
};

const run = async () => {
  await getStats();
  process.exit();
};

run();
