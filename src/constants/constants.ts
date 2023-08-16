import moment from "moment";
var crypto = require("crypto");
var CryptoJS = require("crypto-js");

export const NAME = "FERRUM_TOKEN_BRIDGE_POOL";
export const VERSION = "000.004";
export const CUDOS_CHAIN_ID = "cudos-1";
let SECURITY_KEY = "";
export const THRESHOLD = 10;

export const getSecurityKey = function () {
  return SECURITY_KEY;
};

export const setSecurityKey = function (securityKey: string) {
  SECURITY_KEY = securityKey;
};

export const createAuthToken = async function () {
  let timelapse = 5;
  let currentTime = new Date();
  let startDateTime = moment(currentTime)
    .subtract("minutes", timelapse)
    .utc()
    .format();
  let endDateTime = moment(currentTime)
    .add("minutes", timelapse)
    .utc()
    .format();
  let randomKey = crypto.randomBytes(512).toString("hex");
  let apiKey = (global as any).environment.apiKeyForGateway;
  let tokenBody: any = {};
  tokenBody.startDateTime = startDateTime;
  tokenBody.endDateTime = endDateTime;
  tokenBody.randomKey = randomKey;
  tokenBody.apiKey = apiKey;

  let strTokenBody = JSON.stringify(tokenBody);
  let encryptedSessionToken = encryptApiKey(strTokenBody);
  return encryptedSessionToken;
};

export const encryptApiKey = function (data: any) {
  try {
    var ciphertext = CryptoJS.AES.encrypt(
      data,
      (global as any).AWS_ENVIRONMENT.SECRET_KEY
    ).toString();
    return ciphertext;
  } catch (e) {
    console.log(e);
    return "";
  }
};

export const NETWORKS = [
  {
    chainId: "56",
    fundManagerAddress: "0x6EBED6276033A33b6C6d60e515BF18E979976668",
    fiberRouterAddress: "0xd66C6a8277B4E258b4B6023F5B4085af00AfA9bB",
    foundaryTokenAddress: "0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d",
  },
  {
    chainId: "250",
    fundManagerAddress: "0x354CBFc2894d45a584a9Fd0223cf58495cE3cF7F",
    fiberRouterAddress: "0xAA209557B51C28a8D050fB500e67498EB3d1d92b",
    foundaryTokenAddress: "0x04068DA6C83AFCFA0e13ba15A6696662335D5B75",
  },
  {
    chainId: "137",
    fundManagerAddress: "0xe54B5835e8aba22D52BF892b23Bb491E0bB1b579",
    fiberRouterAddress: "0x704D29c86fD1347446c5F30f80E77B31Dc67539f",
    foundaryTokenAddress: "0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174",
  },
  {
    chainId: "42161",
    fundManagerAddress: "0xcfddF60db000D49d0F2dafd7eDB08Fca177F1A1E",
    fiberRouterAddress: "0x0d618f4632C135e05d9fD795bab021e7DD3187c4",
    foundaryTokenAddress: "0xFF970A61A04b1cA14834A43f5dE4533eBDDB5CC8",
  },
  {
    chainId: "43114",
    fundManagerAddress: "0x81A536479Af0FE02Ec2aC6BB59Db305aa72a774f",
    fiberRouterAddress: "0x066599eD3abB7Eaf517119d376254af13871e5B1",
    foundaryTokenAddress: "0xB97EF9Ef8734C71904D8002F8b6Bc66Dd9c48a6E",
  },
  {
    chainId: "245022934",
    fundManagerAddress: "0xE6ff690CC7B91A2B626F7A76Fe507028bc1Eb12D",
    fiberRouterAddress: "0x2234157B16637AfA6f1A7C1C34b1b80D82b50D82",
    foundaryTokenAddress: "0xea6b04272f9f62f997f666f07d3a974134f7ffb9",
  },
];
