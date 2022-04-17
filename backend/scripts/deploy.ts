import { ethers } from "hardhat";
import dotenv from "dotenv";
import { CRYPTO_DEVS_NFT_CONTRACT_ADDRESS } from "../constants";
import fs from "fs";

dotenv.config({ path: ".env" });

async function main() {
  // Address of the Crypto Devs NFT contract that you deployed in the previous module
  const cryptoDevsNFTContract = CRYPTO_DEVS_NFT_CONTRACT_ADDRESS;

  /*
    A ContractFactory in ethers.js is an abstraction used to deploy new smart contracts,
    so cryptoDevsTokenContract here is a factory for instances of our CryptoDevToken contract.
    */
  const cryptoDevsTokenContract = await ethers.getContractFactory(
    "CryptoDevToken"
  );

  // deploy the contract
  const deployedCryptoDevsTokenContract = await cryptoDevsTokenContract.deploy(
    cryptoDevsNFTContract
  );

  // print the address of the deployed contract
  console.log(
    "Crypto Devs Token Contract Address:",
    deployedCryptoDevsTokenContract.address
  );

  fs.writeFileSync(
    "./config.ts",
    `
  export const contractAddress = "${deployedCryptoDevsTokenContract.address}"
  export const ownerAddress = "${await deployedCryptoDevsTokenContract.signer.getAddress()}"
  `
  );
}

// Call the main function and catch if there is any error
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
