import Web3 from "web3";
const { Big } = require("big.js");
import { web3Service, rpcNodeService } from "./index";
import {
  NAME,
  VERSION,
  FOUNDARY,
  ONE_INCH,
  getPrivateKey,
  isAllowedPublicAddress,
} from "../constants/constants";
import {
  ecsign,
  toRpcSig,
  fromRpcSig,
  ecrecover,
  toBuffer,
  pubToAddress,
  bufferToHex,
} from "ethereumjs-util";
import { decimals, decimalsIntoNumber, withSlippage } from "../constants/utils";

export const getDataForSignature = async (
  job: any,
  decodedData: any,
  transaction: any
): Promise<any> => {
  const withdrawalData = await getValidWithdrawalData(job.data, decodedData);
  const txData = {
    transactionHash: job.returnvalue.transactionHash,
    from: transaction.from,
    token: decodedData.sourceToken,
    amount: decodedData.sourceAmount,
    fundManagerContractAddress: web3Service.getFundManagerAddress(
      decodedData.targetChainId
    ),
    fiberRouterAddress: web3Service.getFiberRouterAddress(
      decodedData.targetChainId
    ),
    chainId: decodedData.sourceChainId,
    targetChainId: decodedData.targetChainId,
    targetToken: decodedData.targetToken,
    sourceFoundaryToken: web3Service.getFoundaryTokenAddress(
      decodedData.sourceChainId
    ),
    targetFoundaryToken: web3Service.getFoundaryTokenAddress(
      decodedData.targetChainId
    ),
    targetAddress: decodedData.targetAddress,
    signatures: [],
    salt: "",
    sourceAssetType: job.data.sourceAssetType,
    destinationAssetType: job.data.destinationAssetType,
    destinationAmountIn: withdrawalData?.destinationAmountIn,
    destinationAmountOut: withdrawalData?.destinationAmountOut,
    sourceOneInchData: withdrawalData?.sourceOneInchData,
    destinationOneInchData: withdrawalData?.destinationOneInchData,
    settledAmount: withdrawalData?.settledAmount,
    expiry: job.data.expiry,
  };
  return txData;
};

export const getValidWithdrawalData = async (
  data: any,
  decodedData: any
): Promise<any> => {
  let latestHash = Web3.utils.keccak256(
    data.sourceOneInchData +
      data.destinationOneInchData +
      data.destinationAmountIn +
      data.destinationAmountOut +
      data.sourceAssetType +
      data.destinationAssetType
  );
  if (
    latestHash == decodedData.withdrawalData &&
    (await isValidSettledAmount(
      data.slippage,
      decodedData.sourceChainId,
      decodedData.targetChainId,
      data.destinationAmountIn,
      decodedData.settledAmount
    ))
  ) {
    return {
      sourceOneInchData: data.sourceOneInchData,
      destinationOneInchData: data.destinationOneInchData,
      destinationAmountIn: data.destinationAmountIn,
      destinationAmountOut: data.destinationAmountOut,
      sourceAssetType: data.sourceAssetType,
      destinationAssetType: data.destinationAssetType,
      settledAmount: decodedData.settledAmount,
    };
  }
  return null;
};

export const isValidSettledAmount = async (
  slippage: number,
  sourceChainId: string,
  destinationChainId: string,
  destinationAmountIn: any,
  settledAmount: any
): Promise<boolean> => {
  console.log(
    slippage,
    sourceChainId,
    destinationChainId,
    destinationAmountIn,
    settledAmount
  );
  const sWeb3 = new Web3(rpcNodeService.getRpcNodeByChainId(sourceChainId).url);
  const dWeb3 = new Web3(
    rpcNodeService.getRpcNodeByChainId(destinationChainId).url
  );
  let sDecimal = await decimals(
    sWeb3,
    web3Service.getFoundaryTokenAddress(sourceChainId)
  );
  let dDecimal = await decimals(
    dWeb3,
    web3Service.getFoundaryTokenAddress(destinationChainId)
  );
  settledAmount = decimalsIntoNumber(settledAmount, sDecimal);
  destinationAmountIn = decimalsIntoNumber(destinationAmountIn, dDecimal);
  console.log(settledAmount, destinationAmountIn);
  if (Big(settledAmount).gte(Big(destinationAmountIn))) {
    return true;
  }
  return false;
};

export const createSignedPayment = (
  chainId: string,
  payee: string,
  amount: string,
  targetToken: string,
  contractAddress: string,
  salt: string,
  destinationAssetType: string,
  amountIn: string,
  amountOut: string,
  targetFoundaryToken: string,
  oneInchData: string,
  expiry: number,
  web3: Web3
) => {
  let hash;
  if (destinationAssetType == FOUNDARY) {
    hash = produceFoundaryHash(
      web3,
      chainId,
      contractAddress,
      targetFoundaryToken,
      payee,
      amount,
      salt,
      expiry
    );
  } else if (destinationAssetType == ONE_INCH) {
    hash = produceOneInchHash(
      web3,
      chainId,
      contractAddress,
      payee,
      amountIn,
      amountOut,
      targetFoundaryToken,
      targetToken,
      oneInchData,
      salt,
      expiry
    );
  }
  const privateKey = getPrivateKey();
  const ecSign = ecsign(
    Buffer.from(hash.replace("0x", ""), "hex"),
    Buffer.from(privateKey.replace("0x", ""), "hex")
  );
  const signature = fixSig(toRpcSig(ecSign.v, ecSign.r, ecSign.s));
  return { signature, hash };
};

export const produceFoundaryHash = (
  web3: Web3,
  chainId: string,
  contractAddress: string,
  token: string,
  payee: string,
  amount: string,
  swapTxId: string,
  expiry: number
): any => {
  const methodHash = Web3.utils.keccak256(
    Web3.utils.utf8ToHex(
      "WithdrawSigned(address token,address payee,uint256 amount,bytes32 salt,uint256 expiry)"
    )
  );
  const params = [
    "bytes32",
    "address",
    "address",
    "uint256",
    "bytes32",
    "uint256",
  ];
  const structure = web3.eth.abi.encodeParameters(params, [
    methodHash,
    token,
    payee,
    amount,
    swapTxId,
    expiry,
  ]);
  const structureHash = Web3.utils.keccak256(structure);
  const ds = domainSeparator(web3, chainId, contractAddress);
  const hash = Web3.utils.soliditySha3("\x19\x01", ds, structureHash);
  return hash;
};

export const produceOneInchHash = (
  web3: Web3,
  chainId: string,
  contractAddress: string,
  payee: string,
  amountIn: string,
  amountOut: string,
  foundryToken: string,
  targetToken: string,
  oneInchData: string,
  salt: string,
  expiry: number
): any => {
  const methodHash = Web3.utils.keccak256(
    Web3.utils.utf8ToHex(
      "WithdrawSignedOneInch(address to,uint256 amountIn,uint256 amountOut,address foundryToken,address targetToken,bytes oneInchData,bytes32 salt,uint256 expiry)"
    )
  );
  const params = [
    "bytes32",
    "address",
    "uint256",
    "uint256",
    "address",
    "address",
    "bytes",
    "bytes32",
    "uint256",
  ];
  const structure = web3.eth.abi.encodeParameters(params, [
    methodHash,
    payee,
    amountIn,
    amountOut,
    foundryToken,
    targetToken,
    oneInchData,
    salt,
    expiry,
  ]);
  const structureHash = Web3.utils.keccak256(structure);
  const ds = domainSeparator(web3, chainId, contractAddress);
  const hash = Web3.utils.soliditySha3("\x19\x01", ds, structureHash);
  return hash;
};

export const domainSeparator = (
  web3: Web3,
  chainId: string,
  contractAddress: string
) => {
  const hashedName = Web3.utils.keccak256(Web3.utils.utf8ToHex(NAME));
  const hashedVersion = Web3.utils.keccak256(Web3.utils.utf8ToHex(VERSION));
  const typeHash = Web3.utils.keccak256(
    Web3.utils.utf8ToHex(
      "EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)"
    )
  );
  return Web3.utils.keccak256(
    web3.eth.abi.encodeParameters(
      ["bytes32", "bytes32", "bytes32", "uint256", "address"],
      [typeHash, hashedName, hashedVersion, chainId, contractAddress]
    )
  );
};

const fixSig = (sig: any) => {
  const rs = sig.substring(0, sig.length - 2);
  let v = sig.substring(sig.length - 2);
  if (v === "00" || v === "37" || v === "25") {
    v = "1b";
  } else if (v === "01" || v === "38" || v === "26") {
    v = "1c";
  }
  return rs + v;
};

export const validateSignature = (job: any, localSignatures: any) => {
  let isValid = true;
  try {
    let signatures = job?.transaction?.generatorSig?.signatures;
    if (signatures?.length > 0 && localSignatures?.length > 0) {
      for (let index = 0; index < signatures.length; index++) {
        let signature = signatures[index];
        let localSignature = localSignatures[index];
        let sig = signature?.signature;
        let hash = localSignature?.hash;
        if (isRecoverAddressValid(sig, hash) == false) {
          isValid = false;
        }
      }
    } else {
      isValid = false;
    }
  } catch (e) {
    isValid = false;
  }
  return isValid;
};

export const isRecoverAddressValid = (
  signature: string,
  hash: string
): boolean => {
  try {
    const { v, r, s } = fromRpcSig(signature);
    const pubKey = ecrecover(toBuffer(hash), v, r, s);
    const addrBuf = pubToAddress(pubKey);
    const address = bufferToHex(addrBuf);
    if (isAllowedPublicAddress(address.toLowerCase())) {
      return true;
    }
  } catch (e) {
    console.log(e);
  }
  return false;
};

export const getDataForSalt = (
  isForValidation: boolean,
  txData: any,
  generatorHash: string
): string => {
  try {
    if (isForValidation) {
      return txData.transactionHash.toLocaleLowerCase();
    } else {
      return txData.transactionHash.toLocaleLowerCase() + generatorHash;
    }
  } catch (e) {
    console.log(e);
  }
  return "";
};
