/*
============================
Dependencies:
<script src="https://cdn.rawgit.com/socrata/soda-js/master/lib/soda-js.bundle.js"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/moment.js/2.28.0/moment.min.js"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/Chart.js/2.6.0/Chart.min.js"></script>
============================
*/

const washingtonCoPopulation = 53740;

function drawChart(covid_data) {
    let ctx = document.getElementById('myChart').getContext('2d');
    let cummulativeCases = covid_data.map(obj => obj.total_cases);
    let newCases = [0]; //first day (3/26/2020) is zero
    for (i = 1, count = 0; i < cummulativeCases.length; i++) {
        count = cummulativeCases[i] - cummulativeCases[i - 1]
        if (count < 0) {
            count = 0;
        }
        newCases.push(count);
    }
    //console.log(newCases);

    let casesPer100k = (cummulativeCases[cummulativeCases.length - 1] / washingtonCoPopulation) * 100000;
    console.log(casesPer100k);


    let sevenDayCaseAvgs = getAvgCases(newCases);
    let avgNewCasesPer100k = (sevenDayCaseAvgs[sevenDayCaseAvgs.length - 1] / washingtonCoPopulation) * 100000;
    let caseRateColor = '';
    console.log({
        'avg_new_cases_per_100k': avgNewCasesPer100k
    });
    // Use daily new case rate per 100,000
    if (1 > avgNewCasesPer100k) {
        caseRateColor = 'rgba(131,218,47,.5)';
    } else if ((1 <= avgNewCasesPer100k) && (9 >= avgNewCasesPer100k)) {
        caseRateColor = 'rgba(255,255,0,.5)';
    } else if ((10 <= avgNewCasesPer100k) && (24 >= avgNewCasesPer100k)) {
        caseRateColor = 'rgba(255,153,0,.8)';
    } else if (25 <= avgNewCasesPer100k) {
        caseRateColor = 'rgba(255,51,0,1)';
    } else {
        caseRateColor = 'white'
    }

    var element = document.getElementById('currentCaseRate');
    setbackgroundAndTextColor(element, caseRateColor);
    console.log(caseRateColor)

    //Harvard Global Health Institute Color Code
    /*
        Daily new case rate per 100,000:
        A community that has fewer than one daily new case per 100,000 is green.
        One to 9 is yellow;
        between 10 and 24 is orange;
        and 25 and above puts you in the red.
     */


    Chart.pluginService.register({
        beforeDraw: function (chart, easing) {
            if (chart.config.options.chartArea && chart.config.options.chartArea.backgroundColor) {
                var ctx = chart.chart.ctx;
                var chartArea = chart.chartArea;

                ctx.save();
                ctx.fillStyle = chart.config.options.chartArea.backgroundColor;
                ctx.fillRect(chartArea.left, chartArea.top, chartArea.right - chartArea.left, chartArea.bottom - chartArea.top);
                ctx.restore();
            }
        }
    });

    Chart.Tooltip.positioners.custom = function (elements, position) {
        if (!elements.length) {
            return false;
        }
        var offset = 0;
        //adjust the offset left or right depending on the event position
        if (elements[0]._chart.width / 2 > position.x) {
            offset = 20;
        } else {
            offset = -20;
        }
        return {
            x: position.x + offset,
            y: position.y + -80
        }
    }

    let myChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: covid_data.slice(-90).map(obj => obj.report_date),
            datasets: [{
                    // Keep at top so it is in front of bars
                    label: '7-day Average',
                    data: sevenDayCaseAvgs.slice(-90),
                    type: 'line',
                    pointRadius: 0,
                    fill: false,
                    backgroundColor: 'rgb(247, 181, 39)',
                    borderColor: 'rgb(247, 181, 39)',
                    borderWidth: 0
                },
                {
                    label: 'New Cases',
                    data: newCases.slice(-90),
                    backgroundColor: 'rgb(22,58,100)',
                    borderColor: 'rgb(22,58,100)',
                    borderWidth: 0
                }
            ]
        },
        options: {
            legend: {
                display: true,
                position: 'bottom',
            },

            tooltips: {
                mode: 'index', //displays tiptool for all datasets at that index
                backgroundColor: 'rgba(255,255,204,0.8)', //cream
                titleFontColor: 'black',
                bodyFontColor: 'black',
                position: 'custom'
            },

            scales: {
                yAxes: [{
                    position: 'right',
                    ticks: {
                        beginAtZero: true
                    }
                }],
                xAxes: [{
                    type: 'time',
                    time: {
                        unit: 'week',
                        tooltipFormat: "MMM Do"
                    },
                    gridLines: {
                        display: false,
                        drawBorder: true
                    },
                    barThickness: '8',
                    ticks: {
                        maxRotation: '25',
                        autoSkip: true
                    }
                }]
            },
            chartArea: {
                backgroundColor: 'rgba(255, 255, 255,.7)'
            }
        }
    })
}

const DateRange = function () {
    let startDate = moment('2020-03-26T00:00:00').format('YYYY-MM-DD');
    let endDate = moment().format('YYYY-MM-DD'); //today

    return {
        start: startDate,
        end: endDate
    }
}

async function chartData() {

    let range = new DateRange();

    let rows = await getData(range.start, range.end);
    rows.forEach(row => row.report_date = moment(row.report_date));
    let today = rows[rows.length - 1];
    let seven_days_ago = rows[rows.length - 8];

    let currentTotalCases = parseInt(today.total_cases).toLocaleString('en');
    let newCasesOverWeek = today.total_cases - seven_days_ago.total_cases;
    let currentTotalDeaths = parseInt(today.deaths).toLocaleString('en');
    let newDeathsOverWeek = today.deaths - seven_days_ago.deaths;
    let currentTotalHospital = parseInt(today.hospitalizations).toLocaleString('en');
    let newHospitalOverWeek = currentTotalHospital - seven_days_ago.hospitalizations;

    let todaysDate = new Date(today.report_date).toLocaleDateString();
    let weeklyDeathtotals = new Array();
    getDeathsByWeek(rows);
    console.log(weeklyDeathtotals)

    document.getElementById('totalCases').textContent = currentTotalCases;
    document.getElementById('totalDeaths').textContent = currentTotalDeaths;
    document.getElementById('totalHosp').textContent = currentTotalHospital;

    document.getElementById('newCases').textContent = "+" + newCasesOverWeek + " past week";
    document.getElementById('newDeaths').textContent = "+" + newDeathsOverWeek + " past week";
    document.getElementById('newHosp').textContent = "+" + newHospitalOverWeek + " past week";

    drawChart(rows);

    let testingData = await getTestingData();

    //Add the percentPositive property to testing data
    //Handle days with zero tests
    let testingPercents = testingData.map(
        data => ({
            ...data,
            percentPositive: data.number_of_pcr_testing > 0 ? ((data.number_of_positive_pcr_testing / data.number_of_pcr_testing) * 100).toFixed(2) : 0.0
        }));

    // Calculate 7-day moving test averages for all days
    let testingAvgs = getAvgPositives(testingPercents);
    //Return todays moving 7-day average test rate
    let todayTestingAvg = testingAvgs[testingAvgs.length - 1];
    //Post most recent 7-day positive test rate
    document.getElementById('posTest').textContent = todayTestingAvg + '%';


    let poprate = ((currentTotalCases / washingtonCoPopulation) * 100000).toFixed(2);

    let testRateColor = '';
    if (todayTestingAvg < 5) {
        testRateColor = 'rgba(131,218,47,.5)';
    } else if (todayTestingAvg >= 5 && todayTestingAvg < 10) {
        testRateColor = 'rgba(255,255,0,.5)';
    } else if (todayTestingAvg >= 10) {
        testRateColor = 'rgba(255,51,0,1)';
    } else {
        testRateColor = 'white'
    }

    let element = document.getElementById('posTest');
    setbackgroundAndTextColor(element, testRateColor);

    let vaccinationPhase = await getVaccinePhase();
    document.getElementById('phase').textContent = vaccinationPhase;
    console.log(vaccinationPhase);


}

async function getData(start, end) {
    //https://data.virginia.gov/resource/bre9-aqqr.json?$where=(fips='51191' and report_date between '2020-06-12' and '2020-09-10')&$order=report_date asc&$limit=365
    var url = new URL('https://data.virginia.gov/resource/bre9-aqqr.json');

    var params = [
        ['$where', "(fips='51191' and report_date between '" + start + "' and '" + end + "')"],
        ['$order', 'report_date asc'],
        ['$limit', '365']
    ]
    url.search = new URLSearchParams(params).toString();

    let data = await fetch(url)
        .catch(error => {
            console.error("Error getting case data", url)
        })
    let rows = await data.json();

    return rows;

    /* Fields
    "report_date": "2020-07-09T00:00:00.000",
    "fips": "51001",
    "locality": "Accomack",
    "vdh_health_district": "Eastern Shore",
    "total_cases": "1042",
    "hospitalizations": "72",
    "deaths": "14"
    */
};

async function getTestingData() {
    //https://data.virginia.gov/resource/bre9-aqqr.json?
    //$where=(fips='51191' and report_date between '2020-06-12' and '2020-09-10')&$order=report_date asc&$limit=365
    var url = new URL('https://data.virginia.gov/resource/3u5k-c2gr.json');

    var params = [
        ['$where', "health_district='Mount Rogers'"]
    ]
    url.search = new URLSearchParams(params).toString();

    let data = await fetch(url)
        .catch(error => {
            console.error("Error getting testing data", url)
        })
    let rows = await data.json();


    let testingData = rows.sort(function (a, b) {

        if (a.lab_report_date === "Not Reported") {
            a.lab_report_date = new Date(2000, 0, 1, 0, 0, 0, 0);
        }
        if (b.lab_report_date === "Not Reported") {
            b.lab_report_date = new Date(2000, 0, 1, 0, 0, 0, 0);
        }

        dateA = new Date(a.lab_report_date);
        dateB = new Date(b.lab_report_date);

        return dateA - dateB
    });
    // Remove the catch-all "Not Reported" record (the 1st object)
    testingData.shift();

    return testingData;
}

async function getVaccinePhase() {
    var url = new URL('https://data.virginia.gov/resource/hjhd-yn2m.json');

    var params = [
        ['$where', "locality='Washington'"]
    ]
    url.search = new URLSearchParams(params).toString();

    let data = await fetch(url)
        .catch(error => {
            console.error("Error getting vaccination phase data", url)
        })
    let entry = await data.json();

    return entry[0].vaccine_phase;
}

function getAvgCases(counts) {
    const numberToCount = 7
    let n = counts.length;
    let averages = new Array(numberToCount - 1).fill(0); //skip first few days
    for (i = 0; n - i > (numberToCount - 1); i++) {
        let values = counts.slice(-(n - i), numberToCount + i)
        let avg = values.reduce((accumulator, num) => accumulator + num) / numberToCount

        let avgRate = (Math.round(avg * 100) / 100).toFixed(2);
        averages.push(avgRate);
    }

    //Post most recent 7-day case rate
    document.getElementById('currentCaseRate').textContent = parseFloat(averages[averages.length - 1]).toLocaleString('en');

    return averages
}

function getAvgPositives(data) {

    const numberToCount = 7
    let percentages = new Array();
    percentages = data.map(obj => parseFloat(obj.percentPositive));

    let n = percentages.length;
    let posTestAvgs = new Array();

    for (i = 0; n - i > (numberToCount - 1); i++) {
        let pctArray = percentages.slice(-(n - i), numberToCount + i);

        let avg = pctArray.reduce((runningTotal, currentNumber) =>
            runningTotal + currentNumber
        ) / numberToCount;

        let avgRate = (Math.round(avg * 100) / 100).toFixed(1);
        posTestAvgs.push(avgRate);
    }
    return posTestAvgs
}

function getDeathsByWeek(rows) {
    rows.forEach(sumWeeklyDeathTotals);
}

function sumWeeklyDeathTotals(item, index, array) {
    const date = item.report_date;
    const sunday = 0;
    if (date.getDay() === sunday) {
        const week = array.slice(index, 7);
        const totalDeaths = week.map(a => a.deaths).reduce((sum, currentNumber) => sum + currentNumber);
        weeklyDeathtotals.push({
            "date": date,
            "weekTotal": totalDeaths
        })
    }
}

function setbackgroundAndTextColor(element, color) {
    element.style.backgroundColor = color;
    if (color === 'rgba(255,51,0,1)') {
        element.style.color = 'white';
    }
}