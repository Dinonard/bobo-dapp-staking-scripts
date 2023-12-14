const { ApiPromise, WsProvider, Keyring } = require("@polkadot/api");
const { KeyringPair } =  require("@polkadot/keyring/types");
const { BN } = require("bn.js");

const ENDPOINT = "ws://127.0.0.1:9944";

const connectApi = async () => {
  const wsProvider = new WsProvider(ENDPOINT);
  const api = await ApiPromise.create({ provider: wsProvider });

  return api;
};

async function getAccount(api) {
	const keyring = new Keyring({ type: 'sr25519', ss58Format: api.registry.chainSS58 });

  const maybeSeed = process.env['SEED'];
	if (maybeSeed) {
    console.info("Creating an account from the provided seed.");
		return keyring.addFromUri(maybeSeed);
	} else {
    console.info("No seed provided, using Alice.");
    return keyring.addFromUri('//Alice');
  }
}

async function sendAndFinalize(tx, signer) {
	return new Promise((resolve) => {
		let success = false;
		let included = [];
		let finalized = [];

		// Should be enough to get in front of the queue
		const tip = new BN(1_000_000_000_000_000);

		tx.signAndSend(signer, { tip }, ({ events = [], status, dispatchError }) => {
			if (status.isInBlock) {
				success = dispatchError ? false : true;
				console.log(
					`📀 Transaction ${tx.meta.name}(..) included at blockHash ${status.asInBlock} [success = ${success}]`
				);
				included = [...events];
			} else if (status.isBroadcast) {
				console.log(`🚀 Transaction broadcasted.`);
			} else if (status.isFinalized) {
				console.log(
					`💯 Transaction ${tx.meta.name}(..) Finalized at blockHash ${status.asFinalized}`
				);
				finalized = [...events];
				const hash = status.hash;
				resolve({ success, hash, included, finalized });
			} else if (status.isReady) {
				// let's not be too noisy..
			} else {
				console.log(`🤷 Other status ${status}`);
			}
		});
	});
}

const migrate_dapp_staking = async () => {  
  console.log("Preparing API...");
  const api = await connectApi();

  console.log("Getting account...");
  const account = await getAccount(api);

  console.log("Starting with migration.")

  let steps = 0;
  let migration_state = await api.query.dappStakingMigration.migrationStateStorage();
  while (!migration_state.isFinished) {
    steps++;

    const tx = api.tx.dappStakingMigration.migrate(null);
    const submitResult = await sendAndFinalize(tx, account);

    if (!submitResult.success) {
      throw "This shouldn't happen, since Tx must succeeed, eventually. If it does happen, fix the bug!";
    }
    migration_state = await api.query.dappStakingMigration.migrationStateStorage();
  }

  console.log("Migration finished. It took", steps, "steps.");
};

const run = async () => {
  await migrate_dapp_staking();
  process.exit();
};

run();
