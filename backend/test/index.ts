/* eslint-disable no-unused-expressions, node/no-missing-import  */
import { expect } from "chai";
import { ethers } from "hardhat";
// @ts-expect-error
import nftArtifact from "../../../nft-collection/backend/artifacts/contracts/CryptoDevs.sol/CryptoDevs.json";
// @ts-expect-error
import whitelistArtifact from "../../../whitelist-dapp/hardhat-tutorial/artifacts/contracts/Whitelist.sol/Whitelist.json";
import { CryptoDevs } from "../../../nft-collection/backend/typechain/";
import { Whitelist } from "../../../whitelist-dapp/hardhat-tutorial/typechain/";
import { CryptoDevToken } from "../typechain";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";

describe("Crypto Devs ICO", function () {
  let owner: SignerWithAddress;
  let minter1: SignerWithAddress;
  let whitelist: Whitelist;
  let nft: CryptoDevs;
  let token: CryptoDevToken;

  beforeEach(async () => {
    [owner, minter1] = await ethers.getSigners();
    // contracts
    const CryptoDevToken = await ethers.getContractFactory("CryptoDevToken");
    const NFTCollection = await ethers.getContractFactoryFromArtifact(
      nftArtifact,
      {
        signer: owner,
      }
    );
    const Whitelist = await ethers.getContractFactoryFromArtifact(
      whitelistArtifact
    );
    // deployed contracts
    whitelist = (await Whitelist.deploy(10)) as Whitelist;
    await whitelist.deployed();
    await whitelist.connect(minter1).addAddressToWhitelist();
    nft = (await NFTCollection.deploy(
      "someurl",
      whitelist.address
    )) as CryptoDevs;
    await nft.deployed();
    token = await CryptoDevToken.deploy(nft.address);
    await token.deployed();
  });

  it("Should give the correct amount of token to a presale minter", async function () {
    expect(token.address).not.to.be.undefined;
    await nft.startPresale();
    expect(await nft.presaleStarted()).to.be.true;

    await nft.connect(minter1).presaleMint({
      value: ethers.utils.parseEther("0.01"),
    });
    await nft.connect(minter1).presaleMint({
      value: ethers.utils.parseEther("0.01"),
    });

    expect(await nft.balanceOf(minter1.address)).to.equal(2);

    await token.connect(minter1).claim();

    expect(await token.balanceOf(minter1.address)).to.equal(
      ethers.utils.parseEther("20")
    );
  });

  it("Should allow minting after presale ended", async () => {
    const tenMinutes = 60 * 60 * 10;
    await nft.startPresale();
    expect(await nft.presaleStarted()).to.be.true;

    const endTime = await nft.presaleEnded();
    const blockNumBefore = await ethers.provider.getBlockNumber();
    const blockBefore = await ethers.provider.getBlock(blockNumBefore);
    const timestampBefore = blockBefore.timestamp;

    console.log({ timestampBefore });
    console.log({ endTime });

    expect(timestampBefore).to.be.lessThan(endTime.toNumber());

    await ethers.provider.send("evm_increaseTime", [tenMinutes]);
    await ethers.provider.send("evm_mine", []);

    const blockNumAfter = await ethers.provider.getBlockNumber();
    const blockAfter = await ethers.provider.getBlock(blockNumAfter);
    const timestampAfter = blockAfter.timestamp;

    expect(timestampAfter).to.be.greaterThan(endTime.toNumber());

    await expect(
      nft.connect(minter1).presaleMint({
        value: ethers.utils.parseEther("0.01"),
      })
    ).to.be.revertedWith("Presale is not running");

    await nft.connect(minter1).mint({
      value: ethers.utils.parseEther("0.01"),
    });
    await nft.connect(minter1).mint({
      value: ethers.utils.parseEther("0.01"),
    });

    expect(await nft.balanceOf(minter1.address)).to.equal(2);

    await token.connect(minter1).claim();

    expect(await token.balanceOf(minter1.address)).to.equal(
      ethers.utils.parseEther("20")
    );
  });

  it("Should allow the owner to pause the contract", async () => {
    const tenMinutes = 60 * 60 * 10;
    await nft.startPresale();
    expect(await nft.presaleStarted()).to.be.true;

    await nft.setPaused(true);
    await expect(
      nft.connect(minter1).presaleMint({
        value: ethers.utils.parseEther("0.01"),
      })
    ).to.be.revertedWith("Contract currently paused");

    await ethers.provider.send("evm_increaseTime", [tenMinutes]);
    await ethers.provider.send("evm_mine", []);

    await expect(
      nft.connect(minter1).mint({
        value: ethers.utils.parseEther("0.01"),
      })
    ).to.be.revertedWith("Contract currently paused");

    expect(await nft.balanceOf(minter1.address)).to.equal(0);
  });
});
