"use strict";
$(document).ready(function () {
    //Button on click listener.
    $('#generateReportButton').click(function () {
        //Parse tsv to json, exclude test events, and include only events in specified date range.
        var rawData = $('#data').val();
        var start = $('#startDate').val();
        var end = $('#endDate').val();
        var data = getWithinDateRange(removeTestRows(parseTsv(rawData)), start, end);
        //Get non-cancelled events count.
        var nonCancelledEventsCount = data.filter(function (event) { return event.requestStatus.toLowerCase().indexOf(constants.COLUMNS.REQUEST_STATUS.CANCELLED) === -1; }).length;
        //Get events cancelled due to covid count.
        var cancelledDueToCovidCount = data.filter(function (event) { return (event.requestStatus.toLowerCase().indexOf(constants.COLUMNS.REQUEST_STATUS.CANCELLED) > -1
            && event.affectedByCovid.toLowerCase().indexOf(constants.COLUMNS.AFFECTED_BY_COVID.CANCELLED) > -1); }).length;
        //Get events cancelled not due to covid count.	
        var cancelledNotDueToCovidCount = data.filter(function (event) { return (event.requestStatus.toLowerCase().indexOf(constants.COLUMNS.REQUEST_STATUS.CANCELLED) > -1
            && event.affectedByCovid.toLowerCase().indexOf(constants.COLUMNS.AFFECTED_BY_COVID.NOT_AFFECTED) > -1); }).length;
        //Get non-cancelled events that switched from in-person to virtual count.
        var inPersonToVirtualCount = data.filter(function (event) { return ((event.affectedByCovid.toLowerCase().indexOf(constants.COLUMNS.AFFECTED_BY_COVID.HYBRID_TO_VIRTUAL) > -1 || event.affectedByCovid.toLowerCase().indexOf(constants.COLUMNS.AFFECTED_BY_COVID.IN_PERSON_TO_VIRTUAL) > -1)
            ||
                (event.affectedByCovid.toLowerCase().indexOf(constants.COLUMNS.AFFECTED_BY_COVID.RESCHEDULED) > -1 && event.ifRescheduled.toLowerCase().indexOf('is it now virtual?') > -1)); }).length;
        //Get events created because of covid count.
        var newCovidEvents = data.filter(function (event) { return event.affectedByCovid.toLowerCase().indexOf(constants.COLUMNS.AFFECTED_BY_COVID.NEW_EVENT) > -1; });
        var newCovidEventsCount = newCovidEvents.length;
        //Get expected attendees to all new events.
        var newEventExpectedAttendees = newCovidEvents
            .map(function (event) { return +event.totalAttendeesExpected; })
            .reduce(function (sum, attendees) { return sum + attendees; }, 0);
        //Get rescheduled events count.
        var rescheduledCount = data.filter(function (event) { return event.affectedByCovid.toLowerCase().indexOf(constants.COLUMNS.AFFECTED_BY_COVID.RESCHEDULED) > -1; }).length;
        //Put all data into a table.
        var tableData = [
            ['Not cancelled', nonCancelledEventsCount],
            ['Cancelled due to COVID', cancelledDueToCovidCount],
            ['Cancelled <i>not</i> due to COVID', cancelledNotDueToCovidCount],
            ['Switched to virtual due to COVID', inPersonToVirtualCount],
            ['New events due to COVID', newCovidEventsCount],
            ['Expected attendees for new events', newEventExpectedAttendees],
            ['Rescheduled events', rescheduledCount]
        ];
        $('#results').empty();
        for (var _i = 0, tableData_1 = tableData; _i < tableData_1.length; _i++) {
            var td = tableData_1[_i];
            $('#results').append("<tr>\n\t\t\t\t<td style='border: 1px solid #aaaaaa;'>" + td[0] + "</td>\n\t\t\t\t<td style='border: 1px solid #aaaaaa;'>" + td[1] + "</td>\n\t\t\t</tr>");
        }
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
        'is this date confirmed?': 'dateConfirmed',
        'is this a live, virtual, or hybrid event?': 'liveVirtualOrHybrid',
        'if virtual, what platform(s) are you using?': 'virtualPlatforms',
        'if hybrid, what platform(s) are you using?': 'hybridPlatforms',
        'covid | was this event affected by covid?': 'affectedByCovid',
        'covid | if the event was rescheduled...': 'ifRescheduled',
        'covid | if this is a new event due to covid....': 'newCovidEvent',
        'covid | total financial loss': 'totalFinancialLoss',
        'covid | did we pay any fees to vendor(s)?': 'feesPaidToVendors',
        'covid | vendor name | vendor1': 'vendor1Name',
        'covid | contracted fee ($) | vendor 1': 'vendor1ContractedFee',
        'covid | fees actually paid ($) | ven1': 'vendor1FeesPaid',
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
var getWithinDateRange = function (data, start, end) {
    var startDate = (new Date(start)).valueOf();
    var endDate = (new Date(end)).valueOf();
    return data.filter(function (event) {
        var eventStartDate = (new Date(event.startDate)).valueOf();
        var eventEndDate = (new Date(event.endDate)).valueOf();
        return eventStartDate > startDate && eventEndDate < endDate;
    });
};
var constants = {
    COLUMNS: {
        AFFECTED_BY_COVID: {
            CANCELLED: 'yes, this event was cancelled',
            HYBRID_TO_VIRTUAL: 'this event was hybrid & is now virtual due to covid',
            IN_PERSON_TO_VIRTUAL: 'this event was in-person & is now virtual due to covid',
            NEW_EVENT: 'yes, this is a new event created due to covid',
            NOT_AFFECTED: 'no, this event was not affected by covid',
            RESCHEDULED: 'yes, this event was rescheduled'
        },
        REQUEST_STATUS: {
            CANCELLED: 'cancelled'
        }
    }
};
