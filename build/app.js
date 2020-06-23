"use strict";
$(document).ready(function () {
    $('#generateReportButton').click(function () {
        var rawData = $('#data').val();
        var data = parseTsv(rawData);
        var filteredData = removeTestRows(data);
        console.log(filteredData);
    });
});
//Convert tab separated string (where first row is headers) to js object.
var parseTsv = function (rawData) {
    var _a;
    //Prepare the array to return.
    var data = [];
    //Parse the input into lines and extract the header row.
    var lines = rawData.split('\n');
    var rawHeaders = (_a = lines.shift()) === null || _a === void 0 ? void 0 : _a.split('\t');
    //Map the header column names to my easy to read names.
    var headerMap = {
        'event title': 'eventTitle',
        'event code': 'eventCode',
        'event type': 'eventType',
        'request status': 'requestStatus',
        'business unit category 1': 'businessUnitCategory1',
        'start date': 'startDate',
        'end date': 'endDate',
        'total attendees expected': 'totalAttendeesExpected',
        'total number attended': 'totalNumberAttended',
        'event location': 'eventLocation',
        'event city': 'eventCity',
        'event state/prov.': 'eventStateProv',
        'planner name': 'plannerName',
        'is this date confirmed': 'dateConfirmed',
        'is this a live, virtual, or hybrid event?': 'liveVirtualOrHybrid',
        'if virtual, what platform(s) are you using?': 'virtualPlatforms',
        'if hybrid, what platform(s) are you using?': 'hybridPlatforms',
        'covid | was this event affected by covid': 'affectedByCovid',
        'covid | if the event was rescheduled...': 'ifRescheduled',
        'covid | if this is a new event due to covid....': 'newCovidEvent',
        'covid | total financial loss': 'totalFinancialLoss',
        'covid | did we pay any fees to vendor(s)': 'feesPaidToVendors',
        'covid | vendor name | vendor1': 'vendor1Name',
        'covid | contracted fee ($) | vendor 1': 'vendor1ContractedFee',
        'covid | fees actually paid ($) | ven 1': 'vendor1FeesPaid',
        'covid | vendor name | vendor 2': 'vendor2Name',
        'covid | contracted fee ($) | vendor 2': 'vendor2ContractedFee',
        'covid | fees actually paid ($) | vendor 2': 'vendor2FeesPaid'
    };
    var headers = rawHeaders === null || rawHeaders === void 0 ? void 0 : rawHeaders.map(function (header) { return headerMap[header.toLowerCase()]; });
    //Loop through the remaining lines and create objects from each row.
    for (var _i = 0, lines_1 = lines; _i < lines_1.length; _i++) {
        var line = lines_1[_i];
        var cells = line.split('\t');
        var row = {};
        for (var i = 0; i < cells.length; i++) {
            row[headers[i]] = cells[i];
        }
        data.push(row);
    }
    return data;
};
//TODO this could cause problems with events that are not test events that contain any of these terms!
var removeTestRows = function (data) {
    return data.filter(function (event) { return (event.eventTitle.toLowerCase().indexOf('test') === -1
        && event.eventTitle.toLowerCase().indexOf('budget') === -1
        && event.eventTitle.toLowerCase().indexOf('template') === -1
        && event.eventTitle.toLowerCase().indexOf('concur') === -1
        && event.eventTitle.toLowerCase().indexOf('cvent') === -1); });
};
