import { AlchemyProvider } from '@ethersproject/providers';
import { Wallet } from '@ethersproject/wallet';
import { ImLogger, WinstonLogger } from '@imtbl/imlogging';
import { ImmutableXClient, ImmutableMethodParams } from '@imtbl/imx-sdk';
import { parse } from 'ts-command-line-args';

import { loggerConfig } from './config/logging';
import { getEnv } from './libs/utils';
import fs from "fs"

let env = {
  alchemyApiKey: getEnv('ALCHEMY_API_KEY'),
  ethNetwork: getEnv('ETH_NETWORK'),
  pinataKey: getEnv('PINATA_APIKEY'),
  pinataSecret: getEnv('PINATA_SECRET'),
  client: {
    publicApiUrl: getEnv('PUBLIC_API_URL'),
    starkContractAddress: getEnv('STARK_CONTRACT_ADDRESS'),
    registrationContractAddress: getEnv('REGISTRATION_ADDRESS'),
    gasLimit: getEnv('GAS_LIMIT'),
    gasPrice: getEnv('GAS_PRICE'),
  },
  // Bulk minting
  privateKey1: getEnv('PRIVATE_KEY1'),
  tokenId: getEnv('TOKEN_ID'),
  tokenAddress: getEnv('TOKEN_ADDRESS'),
  bulkMintMax: getEnv('BULK_MINT_MAX'),
  // Onboarding
  ownerAccountPrivateKey: getEnv('OWNER_ACCOUNT_PRIVATE_KEY'),
  collectionContractAddress: getEnv('COLLECTION_CONTRACT_ADDRESS'),
  collectionProjectId: getEnv('COLLECTION_PROJECT_ID'),
}


const previousTokenID = () => {
  let data = JSON.parse(fs.readFileSync('./src/controller/tokenID.json',
  {encoding:'utf8', flag:'r'}))
  
  return data.tokenID
}

const updateTokenID = async (number: number) => {
  let tokensCount = previousTokenID() + number
  fs.writeFile('./src/controller/tokenID.json', JSON.stringify({ "tokenID": tokensCount }), (err) => {
    if (err) {
        throw err;
    }
    console.log("JSON data is saved.");
  });
}

interface BulkMintScriptArgs {
  wallet: string;
  number: number;
}

const provider = new AlchemyProvider(env.ethNetwork, env.alchemyApiKey);
const log: ImLogger = new WinstonLogger(loggerConfig);
const component = 'imx-bulk-mint-script';

const waitForTransaction = async (promise: Promise<string>) => {
  const txId = await promise;
  log.info(component, 'Waiting for transaction', {
    txId,
    etherscanLink: `https://ropsten.etherscan.io/tx/${txId}`,
    alchemyLink: `https://dashboard.alchemyapi.io/mempool/eth-ropsten/tx/${txId}`,
  });
  const receipt = await provider.waitForTransaction(txId);
  if (receipt.status === 0) {
    throw new Error('Transaction rejected');
  }
  log.info(component, `Transaction Mined: ${receipt.blockNumber}`);
  return receipt;
};

export const reward = async (req: any, res: any) => {
  const BULK_MINT_MAX = env.bulkMintMax;

  const wallet =  req.body.walletAddress
  const number =  req.body.count

  if (number >= Number(BULK_MINT_MAX))
    throw new Error(`tried to mint too many tokens. Maximum ${BULK_MINT_MAX}`);

  let tokenId = await previousTokenID()
  console.log("tokenId", tokenId);
  

  const minter = await ImmutableXClient.build({
    ...env.client,
    signer: new Wallet(env.privateKey1).connect(provider),
  });

  log.info(component, 'MINTER REGISTRATION');
  const registerImxResult = await minter.registerImx({
    etherKey: minter.address.toLowerCase(),
    starkPublicKey: minter.starkPublicKey,
  });

  if (registerImxResult.tx_hash === '') {
    log.info(component, 'Minter registered, continuing...');
  } else {
    log.info(component, 'Waiting for minter registration...');
    await waitForTransaction(Promise.resolve(registerImxResult.tx_hash));
  }

  log.info(component, `OFF-CHAIN MINT ${number} NFTS`);

  const tokens = Array.from({ length: number }, (_, i) => i).map(i => ({
    id: (tokenId + i).toString(),
    blueprint: 'onchain-metadata',
  }));

  const payload: ImmutableMethodParams.ImmutableOffchainMintV2ParamsTS = [
    {
      contractAddress: env.tokenAddress, // NOTE: a mintable token contract is not the same as regular erc token contract
      users: [
        {
          etherKey: wallet.toLowerCase(),
          tokens,
        },
      ],
    },
  ];

  const result = await minter.mintV2(payload);
  await updateTokenID(number)

  res.send({ success: result })
}
  
