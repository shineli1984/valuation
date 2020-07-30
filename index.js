import 'isomorphic-fetch';
import r from 'ramda';
const {path} = r;
import {appendFile} from 'fs';

const tickers = [
  "APPN",
  "ANET",
  "PTON",
  "STAA",
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

    const pegRatio = path(["defaultKeyStatistics", "pegRatio", "raw"], summary);
    const close = path(["price", "regularMarketPreviousClose", "raw"], summary);
    const eps = path(["earningsTrend", "trend"], summary)?.find(t => t.period === "0y")?.epsTrend?.current?.raw;
    const growth = path(["earningsTrend", "trend"], summary)?.find(t => t.period === "+5y")?.growth?.raw;

    // console.log(pegRatio, close, eps, growth);

    const yr5Eps = eps * ((1 + growth) ** 5);
    const yr5Pe = growth * 100 * pegRatio;
    const yr5EstimatePrice = yr5Eps * yr5Pe;

    return [ticker, eps < 0 ? "NEG_EPS" : "", yr5EstimatePrice.toFixed(2), getBaseLog(5, yr5EstimatePrice / close).toFixed(2) * 100];
  })
  .catch(e => console.error(e));

Promise
  .all(tickers.map(calcuate))
  .then(list =>
    list.filter(c => 
      c[1] !== "NEG_EPS" // filter out NEG_EPS 
      && c[2] !== `${NaN}` //  filter out NaN
      // && parseFloat(c[3]) < 30 // filter yearly lower than 30%
    )
  )
  .then(r => {
    return new Promise((resolve, reject) => {
      appendFile('./scores.txt', `=============${new Date().toString()}=============\n` + r.join("\n") + "\n", function (err) {
        resolve(r);
        if (err) reject(err);
        console.log(r)
      });
    });
  });