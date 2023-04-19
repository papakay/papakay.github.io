var betaContainer = document.getElementById("betafolio-calculator");
// Please change the path to if you're not running this with gulp or if you're in production
var csvDataUrl = "http://localhost:8888/data/Betafolios.csv";
var betaCalculationResult = [];
var betaChart;

function changeChartType(chartType) {
  betaChart.update({
    chart: {
      type: chartType.value
    },
  });

  betaChart.redraw(false);
}

function rewDrawChartAndTableData() {
  // get current selected scenario
  var betaFolioScenario = document.getElementById("betaFolioScenario").value;
  // update table
  formatTableData(betaFolioScenario);
  // redraw charts
  redrawChart(betaFolioScenario)
}

function formatTableData(betaFolioScenario) {
  var tBodyTr;
  // handle variable
  // ["betafolioFlat", "betafolioAUM", "typicalDFM"]
  var typicalDFMData = betaCalculationResult["typicalDFM"];
  var betafolioAUMData = betaCalculationResult["betafolioAUM"];
  var betafolioFlatData = betaCalculationResult["betafolioFlat"];

  tBodyTr = "<tr><td data-label=''>Typical DFM</td><td data-label='Start Date of the Scenario' class='beta-text-uppercase' rowspan=3>" +
    dayjs(typicalDFMData.startDateOfScenario[betaFolioScenario]).format('MMM YYYY') + "</td>" +
    "<td data-label='Terminal value of the balance' class='beta-text-uppercase'>£" + numeral(typicalDFMData.terminalValueOfBalance[betaFolioScenario]).format('0.0a') + "</td>" +
    "<td data-label='Cumulative Fees' class='beta-text-uppercase'>£" + numeral(typicalDFMData.cumulativeFees[betaFolioScenario]).format('0.0a') + "</td>" +
    "<td data-label='Terminal Value Savings vs Typical DFM' class='beta-text-uppercase'>" + calculateTerminalSavings(typicalDFMData.terminalValueOfBalance[betaFolioScenario], typicalDFMData.terminalValueOfBalance[betaFolioScenario]) + "</td>" +
    "<td data-label='Cumulative Fees Savings vs Typical DFM' class='beta-text-uppercase'>" + calculateFeeSavings(typicalDFMData.cumulativeFees[betaFolioScenario], typicalDFMData.cumulativeFees[betaFolioScenario]) + "</td>" +
    "</tr>";

  tBodyTr += "<tr><td data-label=''>With Betafolio Flat Fee</td>" +
    "<td data-label='Terminal value of the balance' class='beta-text-uppercase'>£" + numeral(betafolioFlatData.terminalValueOfBalance[betaFolioScenario]).format('0.0a') + "</td>" +
    "<td data-label='Cumulative Fees' class='beta-text-uppercase'>£" + numeral(betafolioFlatData.cumulativeFees[betaFolioScenario]).format('0.0a') + "</td>" +
    "<td data-label='Terminal Value Savings vs Typical DFM' class='beta-text-uppercase'>" + calculateTerminalSavings(betafolioFlatData.terminalValueOfBalance[betaFolioScenario], typicalDFMData.terminalValueOfBalance[betaFolioScenario]) + "</td>" +
    "<td data-label='Cumulative Fees Savings vs Typical DFM' class='beta-text-uppercase'>" + calculateFeeSavings(betafolioFlatData.cumulativeFees[betaFolioScenario], typicalDFMData.cumulativeFees[betaFolioScenario]) + "</td>" +
    "</tr>";

  tBodyTr += "<tr><td data-label=''>With Betafolio % AUM</td>" +
    "<td data-label='Terminal value of the balance' class='beta-text-uppercase'>£" + numeral(betafolioAUMData.terminalValueOfBalance[betaFolioScenario]).format('0.0a') + "</td>" +
    "<td data-label='Cumulative Fees' class='beta-text-uppercase'>£" + numeral(betafolioAUMData.cumulativeFees[betaFolioScenario]).format('0.0a') + "</td>" +
    "<td data-label='Terminal Value Savings vs Typical DFM' class='beta-text-uppercase'>" + calculateTerminalSavings(betafolioAUMData.terminalValueOfBalance[betaFolioScenario], typicalDFMData.terminalValueOfBalance[betaFolioScenario]) + "</td>" +
    "<td data-label='Cumulative Fees Savings vs Typical DFM' class='beta-text-uppercase'>" + calculateFeeSavings(betafolioAUMData.cumulativeFees[betaFolioScenario], typicalDFMData.cumulativeFees[betaFolioScenario]) + "</td>" +
    "</tr>";

  var tbody = document.querySelector(".beta-table table tbody");
  tbody.innerHTML = tBodyTr;
}

function calculateFeeSavings(cost1, cost2) {
  var gains = cost1 - cost2
  if (gains < 0) {
    return "<strong class='beta-text-uppercase'>£" + numeral(gains * -1).format('0.0a') + "</strong>";
  }
  else return "<strong class='beta-text-uppercase'>£0</strong>"
}

function calculateTerminalSavings(cost1, cost2) {
  var gains = cost1 - cost2
  if (gains > 0) {
    return "<strong class='beta-text-uppercase'>£" + numeral(gains).format('0.0a') + "</strong>";
  }
  else return "<strong class='beta-text-uppercase'>£0</strong>"
}

function redrawChart(betaFolioScenario) {
  betaChart.series[0].update({
    data: betaCalculationResult["betafolioFlat"].percentileNominalBalance[betaFolioScenario]
  }, false);

  betaChart.series[1].update({
    data: betaCalculationResult["betafolioAUM"].percentileNominalBalance[betaFolioScenario]
  }, false);

  // update typical asset manager series
  betaChart.series[2].update({
    data: betaCalculationResult["typicalDFM"].percentileNominalBalance[betaFolioScenario]
  }, false);

  betaChart.redraw(false);
}

// functin to handle initial chart rendering
function chartRendering(AUMCleave, numberOfClientsCleave, percentageFeeCleave, yearsOfPlanningCleave) {
  betaContainer.classList.add("is-beta-loading");
  var betaForm = document.forms["beta-form"]
  var betafolio = betaForm["betafolio"].value;
  var AUM = AUMCleave.getRawValue();
  var numberOfClients = numberOfClientsCleave.getRawValue();
  var betafolioPlan = betaForm["plan"].value;
  var percentageFee = percentageFeeCleave.getRawValue();
  var years = yearsOfPlanningCleave.getRawValue();

  betafolioCalculator.calculate({
    csvUrl: csvDataUrl, // please change this
    betafolio: betafolio,
    AUM: AUM,
    plan: betafolioPlan,
    numberOfClients: numberOfClients,
    percentageFee: percentageFee,
    years: years,
  }).then(betaResult => {
    betaContainer.classList.remove("is-beta-loading");
    betaCalculationResult = betaResult;
    rewDrawChartAndTableData();
  });
}

function toggleAssetBreakDown(id) {
  var div = document.getElementById(id);
  div.style.display = div.style.display == "block" ? "none" : "block";
  document.getElementById("beta-show-breakdown").innerHTML = div.style.display == "block" ? "Hide" : "Show";
}



document.addEventListener("DOMContentLoaded", function (event) {
  // cleave input initialization
  var AUMCleave = new Cleave('#AUM', {
    numeral: true,
    numeralThousandsGroupStyle: 'thousand',
    stripLeadingZeroes: true,
    numeralPositiveOnly: true
  });

  var numberOfClientsCleave = new Cleave('#numberOfClients', {
    numeral: true,
    stripLeadingZeroes: true,
    numeralPositiveOnly: true,
    numeralDecimalMark: ' ',
    delimiter: '',
  });

  var yearsOfPlanningCleave = new Cleave('#yearsOfPlanning', {
    numeral: true,
    stripLeadingZeroes: true,
    numeralPositiveOnly: true,
    numeralDecimalMark: ' ',
    delimiter: '',
  });

  var percentageFeeCleave = new Cleave('#percentageFee', {
    numeral: true,
    stripLeadingZeroes: true,
    numeralPositiveOnly: true,
    numeralDecimalScale: 2,
    // numeralDecimalMark: ' ',
    // delimiter: '',
  });


  betaChart = Highcharts.chart('beta-chart', {
    chart: {
      type: 'line',
      backgroundColor: "transparent",
      style: {
        fontFamily:
          'apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, "Noto Sans", sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol", "Noto Color Emoji"'
      }
    },
    exporting: {
      filename: "Betafolio-vs-Typical-Asset-Managament"
    },
    credits: {
      enabled: false
    },
    accessibility: {
      description: 'Compare Betafolio Fee vs Typical MPS Discretionary Manager'
    },
    title: {
      text: ''
    },
    subtitle: {
      text: ''
    },
    xAxis: {
      title: {
        text: 'Years of Planning'
      },
      type: 'linear',
      tickInterval: 12,
      labels: {
        formatter: function () {
          if (this.value != 0 && this.value % 12 == 0) {
            return this.value / 12;
          }
          else {
            return null;
          }
        }
      }
    },
    yAxis: {
      title: {
        text: 'Balance'
      },
      labels: {
        formatter: function () {
          if (this.value != 0) {
            // return this.y +'%';
            return '£' + this.value / 1000000 + 'M';
          } else {
            return null;
          }
        }
      }
    },
    tooltip: {
      headerFormat: '',
      pointFormat: '{series.name} balance is <b>£{point.y:,.0f}</b>',
      valuePrefix: "£",
      valueDecimals: 2
    },
    plotOptions: {
      // area: {
      //   pointStart: 1,
      //   marker: {
      //     enabled: false,
      //     symbol: 'circle',
      //     radius: 2,
      //     states: {
      //       hover: {
      //         enabled: true
      //       }
      //     }
      //   }
      // }
    },
    series: [
      {
        name: 'Betafolio With Flat Fee',
        color: "#2173DD",
      },
      {
        name: 'Betafolio With % AUM',
        color: "#6BA3FA",
      },
      {
        name: 'Typical DFM',
        color: "#333333",
      }
    ]
  });

  // initial chart rendering
  chartRendering(AUMCleave, numberOfClientsCleave, percentageFeeCleave, yearsOfPlanningCleave);

  // handle form submission
  document.querySelector("#beta-form").addEventListener("submit", function (e) {
    e.preventDefault();
    chartRendering(AUMCleave, numberOfClientsCleave, percentageFeeCleave, yearsOfPlanningCleave);
  });

  // handle changes to scenario - Rebuild the chart and the content of the table
  document.getElementById("betaFolioScenario").addEventListener("change", rewDrawChartAndTableData);

  document.getElementById("yearsOfPlanning").addEventListener("blur", function (e) {
    if (yearsOfPlanningCleave.getRawValue() > 140) {
      yearsOfPlanningCleave.setRawValue(140);
    }
    if (yearsOfPlanningCleave.getRawValue() == 0) {
      yearsOfPlanningCleave.setRawValue(1);
    }
  });

});
