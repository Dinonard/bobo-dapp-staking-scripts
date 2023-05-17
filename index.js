const { ApiPromise, WsProvider } = require("@polkadot/api");

const ENDPOINT = "wss://rpc.astar.network";

// Rough estimate
const FIRST_BLOCK = 1000000;
const FINAL_BLOCK = 3585000;

const connectApi = async () => {
  const wsProvider = new WsProvider(ENDPOINT);
  const api = await ApiPromise.create({ provider: wsProvider });
  return api;
};

const getStats = async () => {
  console.log("Getting block information.");
  const api = await connectApi();

  let block_counter = FIRST_BLOCK;

  while (block_counter < FINAL_BLOCK) {

    const blockHash = await api.rpc.chain.getBlockHash(block_counter);

    const signedBlock = await api.rpc.chain.getBlock(blockHash);
    const apiAt = await api.at(signedBlock.block.header.hash);

    // TODO: it's possible to fetch the same date twice, but that's easy to clear via regex
    const timestamp = await apiAt.query.timestamp.now();
    let date = new Date(timestamp.toNumber());

    const bonded_candidates_len = (await apiAt.query.collatorSelection.candidates()).length;
    const invulnerables_len = (await apiAt.query.collatorSelection.invulnerables()).length;

    console.log(`${date.toDateString()};${bonded_candidates_len};${invulnerables_len};${bonded_candidates_len + invulnerables_len}`);

    // This is a rough estimate so we never skip over the entire day
    block_counter +=  7000;
  }
};

const run = async () => {
  await getStats();
  process.exit();
};

run();
