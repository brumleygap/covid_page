/*
============================
Dependencies:
<script src="https://cdn.rawgit.com/socrata/soda-js/master/lib/soda-js.bundle.js"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/moment.js/2.28.0/moment.min.js"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/Chart.js/2.6.0/Chart.min.js"></script>
============================
*/

const washingtonCoPopulation = 53740;

function getNewCasesPerDay(rows) {
    let cummulativeCases = rows.map(obj => obj.total_cases);
    let casesToday = cummulativeCases[cummulativeCases.length - 1]
    let newCasesPerDay = [0]; //first day (3/26/2020) is zero
    for (i = 1, count = 0; i < cummulativeCases.length; i++) {
        count = cummulativeCases[i] - cummulativeCases[i - 1]
        if (count < 0) {
            count = 0;
        }
        newCasesPerDay.push(count);
    }
    return newCasesPerDay
}

async function displayData() {
    let range = new DateRange();
    let rows = await getCaseData(range.start, range.end);


    let cummulativeCases = rows.map(obj => obj.total_cases);
    let caseCountToday = cummulativeCases[cummulativeCases.length - 1]

    let casesPer100k = (caseCountToday / washingtonCoPopulation) * 100000;
    console.log({
        "cases per 100k": casesPer100k
    });


    let sevenDayCaseAvgs = getAvgCases(rows);
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
    if (element) {
        setbackgroundAndTextColor(element, caseRateColor);
    }

    //Harvard Global Health Institute Color Code
    /*
        Daily new case rate per 100,000:
        A community that has fewer than one daily new case per 100,000 is green.
        One to 9 is yellow;
        between 10 and 24 is orange;
        and 25 and above puts you in the red.
     */

    let today = rows[rows.length - 1];
    let seven_days_ago = rows[rows.length - 8];

    let currentTotalCases = parseInt(today.total_cases).toLocaleString('en');
    // Calculate 7-day moving test averages for all days
    let testingAvgs = await getAvgPCRTests();
    //Return todays moving 7-day average test rate
    let todayTestingAvg = testingAvgs[testingAvgs.length - 1];
    //Post most recent 7-day positive test rate
    document.getElementById('posTest').textContent = todayTestingAvg + '%';
    setTestingAvgColor(todayTestingAvg);

    let newCasesOverWeek = today.total_cases - seven_days_ago.total_cases;
    let currentTotalDeaths = parseInt(today.deaths).toLocaleString('en');
    let newDeathsOverWeek = today.deaths - seven_days_ago.deaths;
    let currentTotalHospital = parseInt(today.hospitalizations).toLocaleString('en');
    let newHospitalOverWeek = currentTotalHospital - seven_days_ago.hospitalizations;
    let vaccinationPhase = await getVaccinePhase();
    let doses = await getDoseCount();

    //let todaysDate = new Date(today.report_date).toLocaleDateString();

    document.getElementById('phase').textContent = vaccinationPhase.toUpperCase();
    document.getElementById('currentCaseRate').textContent = parseFloat(sevenDayCaseAvgs[sevenDayCaseAvgs.length - 1]).toLocaleString('en');
    document.getElementById('doses').textContent = doses.toLocaleString('en')

    document.getElementById('totalCases').textContent = currentTotalCases;
    document.getElementById('totalDeaths').textContent = currentTotalDeaths;
    document.getElementById('totalHosp').textContent = currentTotalHospital;

    document.getElementById('newCases').textContent = "+" + newCasesOverWeek + " past week";
    document.getElementById('newDeaths').textContent = "+" + newDeathsOverWeek + " past week";
    document.getElementById('newHosp').textContent = "+" + newHospitalOverWeek + " past week";


    drawCaseChart(rows);
    drawHospitalChart(rows);
}

function drawCaseChart(rows) {
    let caseAverages = getAvgCases(rows)
    let newCases = getNewCasesPerDay(rows)
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
    let ctx = document.getElementById('caseChart').getContext('2d');
    let caseChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: rows.slice(-90).map(obj => obj.report_date),
            datasets: [{
                    // Keep at top so it is in front of bars
                    label: '7-day Average',
                    data: caseAverages.slice(-90),
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

//Hospitalizations Chart
function drawHospitalChart(rows) {
    let weeklyHospitalAdmissions = getHospitalAdmissions(rows);
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
    let weekly_dates = weeklyHospitalAdmissions.map(obj => obj.week_of);
    let weekly_totals = weeklyHospitalAdmissions.map(obj => obj.weekTotal);

    let hospContext = document.getElementById('weeklyAdmissions').getContext('2d');
    let hospChart = new Chart(hospContext, {
        type: 'bar',
        data: {
            labels: weekly_dates,
            datasets: [{
                label: 'New Admissions',
                data: weekly_totals,
                backgroundColor: 'rgb(22,58,100)',
                borderColor: 'rgb(22,58,100)',
                borderWidth: 0
            }]
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
}


function setTestingAvgColor(todayTestingAvg) {

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
    if (element) {
        setbackgroundAndTextColor(element, testRateColor);
    }
}

const DateRange = function () {
    let startDate = moment('2020-03-26T00:00:00').format('YYYY-MM-DD');
    let endDate = moment().format('YYYY-MM-DD'); //today

    return {
        start: startDate,
        end: endDate
    }
}

async function getCaseData(start, end) {
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

    //Make report_date a Moment.js obj for chart.js to use
    rows.forEach(row => row.report_date = moment(row.report_date));

    return rows;

    // Field Structure in rows
    /* 
    "report_date": a moment object,
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

    //Add a new percentPositive property to testing data
    //Handle days with zero tests
    let testingData_WithPercents = testingData.map(
        obj => ({
            ...obj,
            percentPositive: obj.number_of_pcr_testing > 0 ? ((obj.number_of_positive_pcr_testing / obj.number_of_pcr_testing) * 100).toFixed(2) : 0.0
        }));


    return testingData_WithPercents;
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

async function getDoseCount() {
    var url = new URL('https://data.virginia.gov/resource/28k2-x2rj.json');

    var params = [
        ['$where', "(fips='51191')"],
        ['$order', 'administration_date asc']
    ]
    url.search = new URLSearchParams(params).toString();

    let data = await fetch(url)
        .catch(error => {
            console.error("Error getting dose count data", url)
        })
    const rows = await data.json();

    const reduce_function = (runningTotal, item) => {
        return runningTotal + parseInt(item);
    };

    const total_doses = rows.map(a => a.vaccine_doses_administered)
        .reduce(reduce_function, 0);

    return total_doses;

    //Columns in this Dataset
    /*
    Administration Date	-- Date when the vaccine dose is administered to a person. (Date & Time)
    FIPS -- 5-digit code (51XXX) for the locality (Plain Text)
    Locality -- location where the person lives who was administered the vaccine. (Plain Text)
    Health District -- Name of health district	(Plain Text)
    Facility Type -- for the provider that gave the vaccine. (Plain Text)
    Vaccine Manufacturer -- manufacturing company. (Plain Text)
    Dose Number	-- for the person who gets the vaccine. 1 or 2 (Number)
    Vaccine Doses Administered Count -- Total number of vaccines given. (Number)
    */
};


function getAvgCases(rows) {
    let newCasesPerDay = getNewCasesPerDay(rows);

    const numberToCount = 7
    let n = newCasesPerDay.length;
    let averages = new Array(numberToCount - 1).fill(0); //skip first few days
    for (i = 0; n - i > (numberToCount - 1); i++) {
        let values = newCasesPerDay.slice(-(n - i), numberToCount + i)
        let avg = values.reduce((accumulator, num) => accumulator + num) / numberToCount

        let avgRate = (Math.round(avg * 100) / 100).toFixed(2);
        averages.push(avgRate);
    }
    return averages
}

async function getAvgPCRTests() {

    let testData = await getTestingData();
    const numberToCount = 7
    let percentages = new Array();
    //Make percentages a number object
    percentages = testData.map(obj => parseFloat(obj.percentPositive));

    let length = percentages.length;
    let posTestAvgs = new Array();

    for (i = 0; length - i > (numberToCount - 1); i++) {
        let pctArray = percentages.slice(-(length - i), numberToCount + i);

        let avg = pctArray.reduce((runningTotal, currentNumber) =>
            runningTotal + currentNumber
        ) / numberToCount;

        let avgRate = (Math.round(avg * 100) / 100).toFixed(1);
        posTestAvgs.push(avgRate);
    }
    return posTestAvgs
}


function getHospitalAdmissions(rows) {
    let hospitalInfo = new Array();
    let totalAdmissions = 0
    const sunday = 0;
    let date
    rows.forEach((item, index) => {
        date = item.report_date;
        if (date.day() === sunday && (index + 7) < rows.length) {
            totalAdmissions = rows[index + 7].hospitalizations - rows[index].hospitalizations
            // let week = rows.slice(index, index + 7);
            // let weekArray = week.map(a => parseInt(a.hospitalizations));
            // totalAdmissions = weekArray.reduce((sum, admissionsToday) => sum + admissionsToday);
            hospitalInfo.push({
                "week_of": date,
                "weekTotal": totalAdmissions
            });
        }
    });
    return hospitalInfo;
}


function setbackgroundAndTextColor(element, color) {
    element.style.backgroundColor = color;
    if (color === 'rgba(255,51,0,1)') {
        element.style.color = 'white';
    }
}