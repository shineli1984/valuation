import 'isomorphic-fetch';
import r from 'ramda';
const {compose, dissoc, path, values} = r;
import {appendFile} from 'fs';

const tickers = [
  "APPN",
  "ANET",
  "PTON",
  "NEE",
  "ASML",
  "TEAM",
  "BAM",
  "COUP",
  "KNSL",
  "MKTX",
  "MA",
  "MDB",
  "OKTA",
  "PAYC",
  "TSLA",
  "TTD",
  "TWLO",
  "WD",
  "FRCOY",
  "MA",
  "NRC",
  "SBUX",
  "ZTS",
  "AAPL",
  "MSFT",
  "DIS",
  "FB",
  "NFLX",
  "GOOG",
  "AMZN",
  "DPZ",
  "ETSY",
  "PDYPY",
  "GLOB",
  "EA",
  "CHDN",
  "EPR",
  "EB",
  "SPOT",
  "RUBI",
  "ROKU",
  "MTCH",
  "ZNGA",
  "NVDA",
  "GMED",
  "NOW",
  "ATVI",
  "BILI",
  "DOCU",
  "FSLY",
  "HAS",
  "JD",
  "MMM",
  "NVTA",
  "PYPL",
  "SCHW",
  "SE",
  "SHOP",
  "TDOC",
  "WORK",
  "ZM",
  "CGNX",
  "LVGO",
  "NVCR",
  "LULU",
  "ICE",
  "NTES",
  "PINS",
  "QDEL",
  "STAA",
  "AMD"
]

function getBaseLog(x, y) {
  return Math.log(y) / Math.log(x);
}

const calcuate = ticker =>
  fetch(`https://query2.finance.yahoo.com/v10/finance/quoteSummary/${ticker}?modules=defaultKeyStatistics%2Cprice%2CearningsTrend`)
  .then(r => {
    if (r.ok) {
      return r.json();
    }
    throw new Error(r)
  })
  .then(data => {
    if (data.error) {
      throw new Error(data.error);
    }
    if (data.quoteSummary.result.length === 0) {
      throw new Error("no data");
    }

    const summary = data.quoteSummary.result[0];

    const pegRatio = summary.defaultKeyStatistics?.pegRatio?.raw;
    const close = summary.price?.regularMarketPreviousClose?.raw;
    const eps = summary.earningsTrend?.trend?.find(t => t.period === "0y")?.epsTrend?.current?.raw;
    const growth = summary.earningsTrend?.trend?.find(t => t.period === "+5y")?.growth?.raw;

    const yr5Eps = eps * ((1 + growth) ** 5);
    const yr5Pe = growth * 100 * pegRatio;
    const yr5EstimatePrice = yr5Eps * yr5Pe;
    const expectedReturnPerYear = 15/100;
    const marginOfError = 0.5
    const fairPriceToday = yr5EstimatePrice / ((1 + expectedReturnPerYear) ** 5);

    return {
      ticker,
      close,
      negEps: eps < 0,
      yr5EstimatePrice: yr5EstimatePrice.toFixed(2),
      yr5AnnualGrowth: (getBaseLog(5, yr5EstimatePrice / close) * 100).toFixed(2),
      fairPriceToday,
      belowFairPrice: fairPriceToday - close > 0,
      belowFairPriceIncMarginOfError: fairPriceToday * (1 - marginOfError) - close > 0
    }
  })
  .catch(e => console.error(e));

Promise
  .all(tickers.map(calcuate))
  .then(list =>
    list.filter(c => 
      !c.negEps // filter out NEG_EPS 
      && c.yr5EstimatePrice !== `${NaN}` //  filter out NaN
      // && parseFloat(c.yr5AnnualGrowth) < 30 // filter yearly lower than 30%
    ).sort((a, b) => a.yr5AnnualGrowth - b.yr5AnnualGrowth)
  )
  .then(r => {
    return new Promise((resolve, reject) => {
      appendFile(
        './scores.txt', 
        `=============${new Date().toString()}=============\n` 
          + r.map(compose(values, dissoc("negEps"))).join("\n") 
          + "\n", 
        function (err) {
          resolve(r);
          if (err) reject(err);
          console.log(r)
        }
      );
    });
  });