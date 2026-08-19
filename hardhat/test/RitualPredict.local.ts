import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { network } from "hardhat";

const SCHEDULER = "0x56e776BAE2DD60664b69Bd5F865F1180ffB7D58B";

describe("RitualPredict local workflow", async function () {
  const { viem } = await network.create();
  const publicClient = await viem.getPublicClient();
  const testClient = await viem.getTestClient();
  const [creator, yesBettor, noBettor] = await viem.getWalletClients();

  async function deployWithMockScheduler() {
    const schedulerMock = await viem.deployContract("MockScheduler");
    const schedulerCode = await publicClient.getCode({
      address: schedulerMock.address,
    });
    assert.ok(schedulerCode);

    await testClient.setCode({
      address: SCHEDULER,
      bytecode: schedulerCode,
    });

    return viem.deployContract("RitualPredict", [200n]);
  }

  it("creates a market and records its immutable resolution rule", async function () {
    const predict = await deployWithMockScheduler();
    const blockBefore = await publicClient.getBlockNumber();

    await viem.assertions.emitWithArgs(
      predict.write.createMarket([
        {
          question: "Will ETH/USD be at least $4,000?",
          oracleUrl: "https://example.com/oracle/eth",
          jsonPath: ".price",
          target: 4000n,
          comparator: 1,
          bettingSeconds: 180n,
          resolveDelaySeconds: 60n,
        },
      ]),
      predict,
      "ResolutionRuleSet",
      [
        1n,
        "https://example.com/oracle/eth",
        ".price",
        4000n,
        1,
      ],
    );

    const market = await predict.read.getMarket([1n]);

    assert.equal(market.id, 1n);
    assert.equal(market.creator.toLowerCase(), creator.account.address.toLowerCase());
    assert.equal(market.question, "Will ETH/USD be at least $4,000?");
    assert.equal(market.oracleUrl, "https://example.com/oracle/eth");
    assert.equal(market.jsonPath, ".price");
    assert.equal(market.target, 4000n);
    assert.equal(market.comparator, 1);
    assert.equal(market.scheduleId, 1n);
    assert.equal(market.state, 0);
    assert.ok(market.closeBlock >= blockBefore + 900n);
    assert.equal(market.resolveBlock - market.closeBlock, 300n);
  });

  it("tracks YES and NO stakes during the betting window", async function () {
    const predict = await deployWithMockScheduler();

    await predict.write.createMarket([
      {
        question: "Will the demo oracle report at least 100?",
        oracleUrl: "https://example.com/oracle/demo",
        jsonPath: ".value",
        target: 100n,
        comparator: 1,
        bettingSeconds: 180n,
        resolveDelaySeconds: 60n,
      },
    ]);

    await predict.write.bet([1n, true], {
      account: yesBettor.account,
      value: 3n,
    });
    await predict.write.bet([1n, false], {
      account: noBettor.account,
      value: 2n,
    });

    const market = await predict.read.getMarket([1n]);
    assert.equal(market.totalYes, 3n);
    assert.equal(market.totalNo, 2n);
    assert.equal(await predict.read.yesStake([1n, yesBettor.account.address]), 3n);
    assert.equal(await predict.read.noStake([1n, noBettor.account.address]), 2n);
  });
});
