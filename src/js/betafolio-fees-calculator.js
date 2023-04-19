/*!
 * Betafolio-Calculator
 * https://github.com/devnacho/betafolio-calculator
 */

var betafolioCalculator = (function () {
  var betafolioData;
  var AUM;
  var isFee = ["Fixed", "Fixed", "Variable"];
  var percentageFee = 0; // monthly
  var betafolioFlatFee = 0;
  var betafolioAUMFee = 0;
  var fee = [betafolioFlatFee, betafolioAUMFee, percentageFee]; // The fee is in the orderof isFee i.e fees[0] => Fixed and fees[1] => Variable
  var selectedPortfolio = [];
  var inflation = [];
  var dataDates = [];
  var years;

	/**
	 * Parse the CSV file
	 * @param {String} csvFileUrl
	 */
  function parseCSV(csvFileUrl) {
    // @Todo: Introduce a cache system for the read data
    return new Promise(resolve => {
      Papa.parse(csvFileUrl, {
        download: true,
        header: true,
        skipEmptyLines: true,
        complete: results => {
          resolve(results.data);
        }
      });
    });
  }

  /**
		 * Set the Input Properties
		 * @param {Object} options
		 *   (required)
		 *   - csvUrl: relative Path to csv file
     *   - betafolio (40 or 60 80)
     *   - AUM (Asset Under Management)
     *   - baseRetainer (Standard fee per year)
     *   - numberOfClients (Number of clients)
     *   - clientsFee (clients fee per year)
     *   - percentageFee
     *   - years
     *   - VAT
    */
  function setInputProperties(options) {
    AUM = options.AUM;
    percentageFee = (parseFloat(options.percentageFee) / 100) / 12 // divide % by 100 and then convert to monthly fee

    // compute betafolioFlatFee and betafolioAUMFee
    betafolioFees = computeBetafolioFee(options.plan, AUM, options.numberOfClients)
    fee = [betafolioFees[0], betafolioFees[1], percentageFee];
    years = options.years;

    // return betafolio using options.betafolio passed (Allowed values is 40, 60 and 80)
    selectedPortfolio = betafolioData.map(betaData => betaData["Betafolio " + options.betafolio.toString()]);
    inflation = betafolioData.map(betaData => betaData["Inflation"]); // get data in the inflation column
    dataDates = betafolioData.map(betaData => formatDate(betaData["Dates"])); // get the date column and format as "yyyy-mm-ddd"
  }

  /**
    * Compute betafolio flat fee and AUM fee
    * @param {String} plan
    * @param {Number} AUM
    * @param {Integer} numberOfClients
    *   (required)
    *   - plan
    *   - AUM
    *   - numberOfClients
   */
  function computeBetafolioFee(plan, AUM, numberOfClients) {
    // So for "Pro" you need to run: 1) 239£ * number of Clients, 2) 0.09% percentage fee
    // for "Premium" you need to run: 1) 359£ * number of Clients, 2) 0.05% percentage fee + 15000 fixed fee per year
    if (plan == "Pro") {
      // handle pro
      var betafolioFlatFee = 0;
      var betafolioAUMFee = 0;
      var AUMPercentage = 0.0009;

      betafolioFlatFee = parseFloat(numberOfClients) * 239
      // For "Pro" Fixedfee, if the number of client is less than 33, then you would still charge them 7800£
      if (numberOfClients < 33) {
        betafolioFlatFee = 7800;
      }

      betafolioAUMFee = (parseFloat(AUM) * AUMPercentage)

      // return monthly fee
      return [(betafolioFlatFee / 12), (betafolioAUMFee / 12)]
    }
    else {
      // handle premium
      var betafolioFlatFee = 0;
      var betafolioAUMFee = 0;
      var AUMPercentage = 0.0005;
      var AUMTurnkeyRetainer = 15000;

      betafolioFlatFee = parseFloat(numberOfClients) * 359;
      // For "Premium" Fixedfee, if the number of clients is less than 50 then you would still charge them 18000£
      if (numberOfClients < 50) {
        betafolioFlatFee = 18000;
      }

      betafolioAUMFee = (parseFloat(AUM) * AUMPercentage) + AUMTurnkeyRetainer

      // return monthly fee
      return [(betafolioFlatFee / 12), (betafolioAUMFee / 12)]
    }
  }

  /**
		 * Format Date
		 * @param {String} date
		 *   (required)
		 *   - date: dd/mm/yyyy
    */
  function formatDate(dateString) {
    var date = new Date(dateString);
    return [
      date.getFullYear(),
      ('0' + (date.getMonth() + 1)).slice(-2),
      ('0' + date.getDate()).slice(-2)
    ].join('-');
  }

  /**
  * Compute NBalance
  * @param {Integer} years
  * @param {Array} returnsBeta
  * @param {String} isFee
  * @param {Array} inflation
  * @param {Number} fee
  * @param {Number} initialBalance
  * @param {Array} dataDates
  * (required)
  * - years
  * - returnsBeta
  * - isFree
  * - inflation
  * - fee
  * - initialBalance
  * - dataDates
  */
  function computeNBalance(years, returnsBeta, isFee, inflation, fee, initialBalance, dataDates) {

    var months = parseInt(years) * 12; // convert years to months
    var dataSize = returnsBeta.length;
    var scenarios = dataSize - months;

    var nominalBalance = Array.apply(null, Array(months)).map(function () { return [] }); // array of empty arrays e.g [0: [], 1: []...,359: []]
    var realBalance = Array.apply(null, Array(months)).map(function () { return [] }); // array of empty arrays e.g [0: [], 1: []...,359: []]
    var fees = Array.apply(null, Array(months)).map(function () { return [] }); // array of empty arrays e.g [0: [], 1: []...,359: []]
    var cumulativeInflationReturn = Array.apply(null, Array(months)).map(function () { return [] }); // array of empty arrays e.g [0: [], 1: []...,359: []]
    var cumulativeFees = [];

    var sortedNominalBalance = [];
    var terminalNominalBalance = [] // for an unknown reasons, realBalance[months-1].sort() is introducing a serious bug

    // percentiles
    var percentiles = [];
    var percentileNames = ["Worst Scenario", "25th Percentile", "Median Scenario", "75th Percentile", "Best Scenario"];
    var percentileIndex = [0, Math.floor(0.25 * (scenarios - 1)), Math.floor(0.5 * (scenarios - 1)), Math.floor(0.75 * (scenarios - 1)), scenarios - 1];
    var percentileNominalBalance = Array.apply(null, Array(percentileIndex.length + 1)).map(function () { return [] });
    var percentileDates = [];
    var percentileFees = [];
    var originalPosition = [];

    // output
    var allPercentiles;
    var nominalBalanceByOriginalPosition = [];
    var feesByOriginalPosition = [];

    for (var i = 0; i < scenarios; i++) {
      var cumulativeFeeSum = 0;
      for (var j = 0; j < months; j++) {

        if (j == 0) {
          var calcFees = feesCalculator(isFee, initialBalance, fee);
          fees[j][i] = calcFees.fees;
          initialBalance = calcFees.balance
          nominalBalance[j][i] = (initialBalance - fees[j][i]) * (1 + parseFloat(returnsBeta[j + i]));
          cumulativeInflationReturn[j][i] = parseFloat(inflation[j + i]) + 1;
        }
        else {
          var calcFees = feesCalculator(isFee, nominalBalance[j - 1][i], fee);
          fees[j][i] = calcFees.fees;
          nominalBalance[j - 1][i] = calcFees.balance;
          nominalBalance[j][i] = (calcFees.balance - fees[j][i]) * (1 + parseFloat(returnsBeta[j + i]));
          cumulativeInflationReturn[j][i] = cumulativeInflationReturn[j - 1][i] * (1 + parseFloat(inflation[j + i]));
        }

        realBalance[j][i] = nominalBalance[j][i] / cumulativeInflationReturn[j][i];
        cumulativeFeeSum = cumulativeFeeSum + fees[j][i];

        // for an unknown reasons, nominalBalance[months-1].sort() is introducing a serious bug
        if (j == (months - 1)) {
          terminalNominalBalance.push(nominalBalance[j][i]);
        }
      } //months

      cumulativeFees[i] = cumulativeFeeSum;
    } //scenarios

    // sort terminalNominalBalance
    sortedNominalBalance = terminalNominalBalance.sort((a, b) => a - b);

    // compute percentiles
    for (var p = 0; p < percentileIndex.length; p++) {
      percentiles[p] = sortedNominalBalance[percentileIndex[p]];
    }

    // get original position using percentile position
    for (var i = 0; i < percentileIndex.length; i++) {
      for (var j = 0; j < scenarios; j++) {
        if (nominalBalance[months - 1][j] == percentiles[i]) {
          originalPosition[i] = j;
        }
      }
    }

    // percentileDates, percentileFees, nominalBalanceByOriginalPosiiton, feesByOriginalPosition using original position
    for (var i = 0; i < originalPosition.length; i++) {
      // handle the percentileNominalBalance
      for (var k = 0; k < months; k++) {
        percentileNominalBalance[i][k] = nominalBalance[k][originalPosition[i]]
      }

      percentileDates[i] = dataDates[originalPosition[i]];
      percentileFees[i] = cumulativeFees[originalPosition[i]];

      // get actual position of the original position in the array of arrays
      var position = getItemPosition(months, originalPosition[i])
      nominalBalanceByOriginalPosition[i] = nominalBalance[position.y][position.x];
      feesByOriginalPosition[i] = fees[position.y][position.x];
    }

    // -------------Start of Latest Period---------------

    // Nominal Balance
    for (var k = 0; k < months; k++) {
      percentileNominalBalance[originalPosition.length][k] = nominalBalance[k][scenarios - 1];
    }

    // Terminal Balance
    percentiles[originalPosition.length] = nominalBalance[months - 1][scenarios - 1];

    // Cumulative Fees
    percentileFees[originalPosition.length] = cumulativeFees[scenarios - 1];

    // Percentile Dates
    percentileDates[originalPosition.length] = dataDates[scenarios - 1];

    // -------------End of Latest Period---------------

    return {
      percentiles: percentileNames,
      startDateOfScenario: percentileDates,
      terminalValueOfBalance: percentiles,
      cumulativeFees: percentileFees,
      percentileNominalBalance: percentileNominalBalance,
      allCumulativeFees: cumulativeFees,
      originalPosition: originalPosition,
      nominalBalance: nominalBalance,
      months: months,
      // nominalBalance: nominalBalance,
      // realBalance: realBalance,
      // position: originalPosition,
      // cumulativeFees: cumulativeFees,
      // cumulativeInflationReturn: cumulativeInflationReturn,
      // percentileNames: percentileNames,
      // percentileDates: percentileDates,
      // percentileFees: percentileFees,
      // percentile: percentiles,
      // percentileIndex: percentileIndex,

      // scenarios: scenarios,
      // nominalBalanceByOriginalPosition: nominalBalanceByOriginalPosition,
      // feesByOriginalPosition: feesByOriginalPosition
    }
  }

  /**
  * Compute Percentile
  * @param {Number} row_size //e.g for 30years row_size is 360
  * @param {Number} position
  */
  function getItemPosition(row_size, position) {
    if (position < row_size) {
      return {
        x: 0,
        y: position
      }
    }
    else {
      return {
        x: Math.floor(position / row_size),
        y: (position % row_size) > 0 ? ((position % row_size) - 1) : (position % row_size)  // -1 because the array is index from 0
      }
    }
  }

  /**
  * Fees Calculator
  * @param {String} isFee
  * @param {Number} balance
  * @param {Number} fee
  */

  function feesCalculator(isFee, balance, fee) {
    var fees = 0;
    if (isFee == "Fixed") {
      if (fee >= balance) {
        fees = balance;
      }
      else {
        fees = fee;
      }
    }
    else if (isFee == "Variable") {
      if (balance < 1) {
        balance = 0;
        fees = 0;
      }
      else {
        fees = fee * balance;
      }
    }

    return {
      fees: fees,
      balance: balance
    }
  }


  return {
    /**
     * Initialize betafolio calculator
     * @param {Object} options
     *
     *   (required)
     *   - csvUrl: relative Path to csv file
     *   - betafolio (40 or 60 80)
     *   - AUM (Asset Under Management)
     *   - baseRetainer (Standard fee per year)
     *   - numberOfClients (Number of clients)
     *   - clientsFee (clients fee per year)
     *   - percentageFee (expected value is 1 - 100)
     *   - years
    */
    calculate: function (options) {
      // get the content of the betafolio csv file
      return parseCSV(options.csvUrl)
        .then(csvData => {
          betafolioData = csvData;
          setInputProperties(options);

          // compute balance for each fee
          var results = [];
          var resultLabel = ["betafolioFlat", "betafolioAUM", "typicalDFM"]
          for (var i = 0; i < fee.length; i++) {
            results[resultLabel[i]] = computeNBalance(years, selectedPortfolio, isFee[i], inflation, fee[i], AUM, dataDates)
          }

          // get the original position for Typical Asset Manager
          const TAMOriginalPosition = results["typicalDFM"].originalPosition;
          const months = results["betafolioFlat"].months;

          for (var i = 0; i < TAMOriginalPosition.length; i++) {
            results["betafolioFlat"].cumulativeFees[i] = results["betafolioFlat"].allCumulativeFees[TAMOriginalPosition[i]];
            results["betafolioFlat"].terminalValueOfBalance[i] = results["betafolioFlat"].nominalBalance[months - 1][TAMOriginalPosition[i]];

            results["betafolioAUM"].cumulativeFees[i] = results["betafolioAUM"].allCumulativeFees[TAMOriginalPosition[i]];
            results["betafolioAUM"].terminalValueOfBalance[i] = results["betafolioAUM"].nominalBalance[months - 1][TAMOriginalPosition[i]];

            // percentile Nominal Balance for Betafolio
            for (var k = 0; k < months; k++) {
              results["betafolioFlat"].percentileNominalBalance[i][k] = results["betafolioFlat"].nominalBalance[k][TAMOriginalPosition[i]];
              results["betafolioAUM"].percentileNominalBalance[i][k] = results["betafolioAUM"].nominalBalance[k][TAMOriginalPosition[i]];
            }
          }

          return results;
        })
        .catch(e => {
          // @todo: handle error response
          console.log(e);
          return false;
        });
    },
  }
})();

