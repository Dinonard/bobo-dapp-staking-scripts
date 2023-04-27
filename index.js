const { ApiPromise, WsProvider } = require("@polkadot/api");

const ENDPOINT = "wss://rpc.astar.network";
const FIRST_ERA_BLOCK = 815708;

const connectApi = async () => {
  const wsProvider = new WsProvider(ENDPOINT);
  const api = await ApiPromise.create({ provider: wsProvider });
  return api;
};

const getAddress = (addressObject) => {
  const address = JSON.parse(addressObject.toString());
  return address.evm ?? address.wasm;
};

const getStats = async () => {
  console.log("Getting dApp staking statistics...");
  const api = await connectApi();

  const blocksPerEra = await api.consts.dappsStaking.blockPerEra.toNumber();
  const currentEra = await api.query.dappsStaking.currentEra();
  let era = 0;
  let block = FIRST_ERA_BLOCK;

  while (era < currentEra.toNumber()) {
    const blockHash = await api.rpc.chain.getBlockHash(block);
    const apiAt = await api.at(blockHash.toHuman());
    era = await apiAt.query.dappsStaking.currentEra();

    const dapps = await apiAt.query.dappsStaking.registeredDapps.entries();
    block += blocksPerEra;
    let registeredDapps = 0;

    console.log(`Era ${era.toNumber()} - Block ${block}`);
    for (const [key, value] of dapps) {
      const dapp = value.toHuman();
      const address = getAddress(key.args[0]);
      if (dapp.state === "Registered") {
        registeredDapps++;
        const addressObject = key.args[0].toHuman();
        const eraStake = await apiAt.query.dappsStaking.contractEraStake(
          addressObject,
          era
        );
        const eraStakeObject = eraStake.toHuman();
        console.log(`\tContract ${address} - Total stake ${eraStakeObject?.total ?? 0} - Number of stakers ${eraStakeObject?.numberOfStakers ?? 0}`);
      } else {
        console.log(`\tContract ${address} - Unregistered at era ${dapp.state.Unregistered}`);
      }
    }

    console.log(`Registered dApps / total dApps: ${registeredDapps} / ${dapps.length}\n`);
  }
};

const run = async () => {
  await getStats();
  process.exit();
};

run();
