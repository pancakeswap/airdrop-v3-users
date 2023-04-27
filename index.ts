import { assert } from 'console';
import csv from 'csvtojson';
import { Address, isAddress, parseEther, formatEther } from 'viem';

const csvBaseFilePath = `${import.meta.dir ?? '.'}/csvs`;

const part1 = {
  btcb: `${csvBaseFilePath}/btcb_wbnb_p1_p_0424.csv`,
  busd: `${csvBaseFilePath}/busd_wbnb_p1_p_0424.csv`,
  eth: `${csvBaseFilePath}/eth_wbnb_p1_p_0424.csv`,
  usdt: `${csvBaseFilePath}/usdt_wbnb_p1_p_0424.csv`,
};
const part2 = {
  btcb: `${csvBaseFilePath}/btcb_wbnb_p2_p_0424.csv`,
  busd: `${csvBaseFilePath}/busd_wbnb_p2_p_0424.csv`,
  eth: `${csvBaseFilePath}/eth_wbnb_p2_p_0424.csv`,
  usdt: `${csvBaseFilePath}/usdt_wbnb_p2_p_0424.csv`,
};

const forSC: Record<
  Address,
  {
    cakeAmountInWei: string;
    nft1: boolean;
    nft2: boolean;
  }
> = {};

const forFE: Record<
  Address,
  {
    part1: {
      [key in keyof typeof part1]: 't1' | 't2' | 't3' | 't4' | null;
    };
    part2: {
      [key in keyof typeof part2]: 't1' | 't2' | 't3' | 't4' | null;
    };
  }
> = {};

// SET THIS VALUE MANUALLY
const cakePriceUSD = 2.609;

const DEFAULT_FE: (typeof forFE)[Address] = {
  part1: {
    btcb: null,
    busd: null,
    eth: null,
    usdt: null,
  },
  part2: {
    btcb: null,
    busd: null,
    eth: null,
    usdt: null,
  },
};

const getCakeAmount = (prize: string) => {
  const prizeInUSD = parseFloat(prize);
  const cakeAmount = prizeInUSD / cakePriceUSD;
  return parseEther(`${cakeAmount}`);
};

const parseTier = (tier: string) => {
  if (tier.includes('tier1')) {
    return 't1';
  }
  if (tier.includes('tier2')) {
    return 't2';
  }
  if (tier.includes('tier3')) {
    return 't3';
  }
  if (tier.includes('tier4')) {
    return 't4';
  }
  throw new Error(`Invalid tier: ${tier}`);
};

for (const [key, value] of Object.entries(part1)) {
  const json = await csv().fromString(await Bun.file(value).text());

  json.forEach((item) => {
    const { user, tvl_tier, prize } = item;

    if (!isAddress(user)) {
      throw new Error(`Invalid address: ${user}`);
    }

    const originalCakeAmount = forSC[user]?.cakeAmountInWei ?? '0';

    forSC[user] = {
      cakeAmountInWei: (
        BigInt(originalCakeAmount) + BigInt(getCakeAmount(prize))
      ).toString(),
      nft1: true,
      nft2: forSC[user]?.nft2 ?? false,
    };

    if (!forFE[user]) {
      forFE[user] = JSON.parse(JSON.stringify(DEFAULT_FE));
    }
    if (forFE[user].part1[key as keyof typeof part1]) {
      throw new Error(`Duplicate user: ${user} in ${key}, p1`);
    }
    forFE[user].part1[key as keyof typeof part1] =
      parseTier(tvl_tier);
  });
}

for (const [key, value] of Object.entries(part2)) {
  const json = await csv().fromString(await Bun.file(value).text());

  json.forEach((item) => {
    const { user, tvl_tier, prize } = item;

    if (!isAddress(user)) {
      throw new Error(`Invalid address: ${user}`);
    }

    const originalCakeAmount = forSC[user]?.cakeAmountInWei ?? '0';

    forSC[user] = {
      cakeAmountInWei: (
        BigInt(originalCakeAmount) + BigInt(getCakeAmount(prize))
      ).toString(),
      nft2: true,
      nft1: forSC[user]?.nft1 ?? false,
    };

    if (!forFE[user]) {
      forFE[user] = JSON.parse(JSON.stringify(DEFAULT_FE));
    }
    if (forFE[user].part2[key as keyof typeof part2]) {
      throw new Error(`Duplicate user: ${user} in ${key}, p2`);
    }
    forFE[user].part2[key as keyof typeof part2] =
      parseTier(tvl_tier);
  });
}

const totalCakeAmount = Object.values(forSC).reduce((prev, curr) => {
  return prev + BigInt(curr.cakeAmountInWei);
}, 0n);

Bun.write('./forSC.json', JSON.stringify(forSC, null, 2));
Bun.write('./forFE.json', JSON.stringify(forFE, null, 2));

console.log('Done!');
console.log('CAKE Price setting at', cakePriceUSD);

console.log(
  'total in usd',
  formatEther(BigInt(Number(totalCakeAmount.toString()) * cakePriceUSD)),
);
console.log(
  'Total Cake Injection in wei',
  totalCakeAmount.toString(),
);
