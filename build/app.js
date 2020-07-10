"use strict";
$(document).ready(function () {
    //Button on click listener.
    $('#generateReportButton').click(function () {
        //Show the runInfo div.
        $('#runInfo').show();
        //Empty the results table and logs div to prepare for the new results (or clear in case there's an error).
        $('#logs').empty();
        $('#results tbody tr td').empty();
        try {
            log('##### Preparing to get &#128169; done');
            //Parse tsv to json, exclude test events, and include only events in specified date range.
            log('##### Fetching raw data and date inputs');
            var rawData = $('#data').val();
            var start = $('#startDate').val();
            var end = $('#endDate').val();
            var parsedData = parseTsv(rawData);
            log("##### ALL ROWS: " + parsedData.length);
            var filteredData = removeTestRows(parsedData);
            log("##### FILTERED ROWS: " + filteredData.length);
            var data = getWithinDateRange(filteredData, start, end);
            log("##### ROWS WITHIN DATE RANGE: " + data.length);
            //Get non-cancelled events count.
            log("##### Counting events with a request status of anything other than " + constants.COLUMNS.REQUEST_STATUS.CANCELLED);
            var nonCancelledEvents = data.filter(function (event) { return filters.nonCancelledEvents(event); });
            //Get events cancelled due to covid count.
            log("##### Counting events that contain a request status of " + constants.COLUMNS.REQUEST_STATUS.CANCELLED + " and an affected by COVID value of " + constants.COLUMNS.AFFECTED_BY_COVID.CANCELLED);
            var cancelledDueToCovid = data.filter(function (event) { return filters.cancelledDueToCovid(event); });
            //Get events cancelled not due to covid count
            log("##### Counting events that contain request status of " + constants.COLUMNS.REQUEST_STATUS.CANCELLED);
            var cancelledTotal = data.filter(function (event) { return filters.cancelled(event); });
            //Get non-cancelled events that switched from in-person to virtual count.
            log("##### Counting events that have an affected by COVID value of " + constants.COLUMNS.AFFECTED_BY_COVID.HYBRID_TO_VIRTUAL + " OR " + constants.COLUMNS.AFFECTED_BY_COVID.IN_PERSON_TO_VIRTUAL + " OR BOTH an affected by COVID value of " + constants.COLUMNS.AFFECTED_BY_COVID.RESCHEDULED + " AND if rescheduled value of " + constants.COLUMNS.IF_RESCHEDULED.NOW_VIRTUAL);
            var inPersonToVirtual = data.filter(function (event) { return filters.inPersonToVirtual(event); });
            //Get events created because of covid count.
            log("##### Counting events that have an affected by COVID value of " + constants.COLUMNS.AFFECTED_BY_COVID.NEW_EVENT + " and a request status of " + constants.COLUMNS.REQUEST_STATUS.CANCELLED);
            var newCovidEvents = data.filter(function (event) { return filters.newCovidEvents(event); });
            //Get expected attendees to all new events.
            log("##### Counting expected attendees at events");
            var newEventExpectedAttendees = newCovidEvents
                .map(function (event) {
                //Parse the values of attendees expected, which might not be (but usually is) a simple number in string form.
                var numAttendees;
                //Check for numer in string form, or a string that begins with a number, like '500+'.
                if (!isNaN(parseInt(event.totalAttendeesExpected.replace(/,/g, '').replace(/"/g, '').trim())))
                    numAttendees = parseInt(event.totalAttendeesExpected.replace(/,/g, '').replace(/"/g, '').trim());
                //Check for ranges and take the first value, like '10 - 20' should take 10.
                else if (event.totalAttendeesExpected.indexOf('-') > -1) {
                    var estimates = event.totalAttendeesExpected.split('-');
                    if (!isNaN(parseInt(estimates[0].replace(/,/g, '').replace(/"/g, '').trim())))
                        numAttendees = parseInt(estimates[0].replace(/,/g, '').replace(/"/g, '').trim());
                    else
                        throw new Error(constants.ERRORS.INVALID_ATTENDEES_VALUE(event.eventTitle, event.totalAttendeesExpected));
                }
                else
                    throw new Error(constants.ERRORS.INVALID_ATTENDEES_VALUE(event.eventTitle, event.totalAttendeesExpected));
                return numAttendees;
            })
                .reduce(function (sum, attendees) { return sum + attendees; }, 0);
            //Get rescheduled events count.
            log("##### Counting events with an affected by COVID value of " + constants.COLUMNS.AFFECTED_BY_COVID.RESCHEDULED);
            var rescheduled = data.filter(function (event) { return filters.rescheduledCovid(event); });
            log('##### Populating results table');
            //Put all data into a table.
            var tableData_1 = [
                ['Not cancelled', nonCancelledEvents],
                ['Cancelled due to COVID', cancelledDueToCovid],
                ['Total cancelled', cancelledTotal],
                ['Switched to virtual due to COVID', inPersonToVirtual],
                ['New events due to COVID', newCovidEvents],
                ['Expected attendees for new events', newEventExpectedAttendees],
                ['Rescheduled events', rescheduled]
            ];
            for (var i = 0; i < tableData_1.length; i++) {
                var row = $('#results tbody tr')[i];
                $($(row).children('td')[0]).html(tableData_1[i][0]);
                $($(row).children('td')[1]).html(tableData_1[i][1].length !== undefined ? tableData_1[i][1].length : tableData_1[i][1]);
                $($(row).children('td')[2]).html("<span class='viewAsTable'>Table</span> / <span class='viewAsCsv'>CSV</span>");
            }
            log('##### Results table populated');
            //Clear and re-inialize on click listeners to produce updated results.
            log('##### Initializing on click listeners');
            $('.viewAsTable, .viewAsCsv').off('click');
            var viewAsTable = $('.viewAsTable');
            var viewAsCsv = $('.viewAsCsv');
            var _loop_1 = function (i) {
                $(viewAsTable[i]).click(function () {
                    console.log('1');
                    $('#viewAsModalBody').empty();
                    $('#viewAsModalBody').html(jsonToHtmlTable(tableData_1[i][1]));
                    $('#container').addClass('no-select');
                    $('#viewAsModal').removeClass('hidden').addClass('visible');
                });
                $(viewAsCsv[i]).click(function () {
                    console.log(2);
                    $('#viewAsModalBody').empty();
                    $('#viewAsModalBody').html(jsonToCsv(tableData_1[i][1]));
                    $('#container').addClass('no-select');
                    $('#viewAsModal').removeClass('hidden').addClass('visible');
                });
            };
            for (var i = 0; i < tableData_1.length; i++) {
                _loop_1(i);
            }
            log('##### On click listeners initialized');
            log('##### SUCCESSFULLY GOT &#128169; DONE');
        }
        catch (e) {
            log(e.toString(), LogLevel.ERROR);
        }
    });
    //Configure modal closer.
    $('.close').click(function () {
        $('#container').removeClass('no-select');
        $('#viewAsModal').removeClass('visible').addClass('hidden');
    });
    $(window).click(function (event) {
        if ($(event.target).prop('id') === 'viewAsModal') {
            $('#container').removeClass('no-select');
            $('#viewAsModal').removeClass('visible').addClass('hidden');
        }
    });
    //View logs on click listener.
    $('#viewLogs').click(function () {
        var logsAreHidden = $('#viewLogs').text().indexOf('View') > -1;
        if (logsAreHidden) {
            $('#viewLogs').text('Hide logs');
            $('#logs').show();
        }
        else {
            $('#viewLogs').text('View logs');
            $('#logs').hide();
        }
    });
});
//Convert tab separated string (where first row is headers) to js object.
var parseTsv = function (rawData) {
    var _a;
    log("Preparing to parse raw tsv data into JSON array");
    //Prepare the array to return.
    var data = [];
    //Parse the input into lines and extract the header row.
    log('Parsing raw tsv data into raw JSON array');
    var lines = rawData.split('\n');
    log('Picking out raw header row');
    var rawHeaders = ((_a = lines.shift()) === null || _a === void 0 ? void 0 : _a.split('\t')) || [];
    log("Raw headers parsed as: " + rawHeaders);
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
    log('Mapping raw headers to js friendly headers');
    var headers = rawHeaders.map(function (header) {
        var mappedHeader = headerMap[header.toLowerCase()];
        log("Mapping raw header <span style='font-family: monospace'>" + header + "</span> ---> <span style='font-family: monospace'>" + mappedHeader + "</span>");
        return mappedHeader;
    });
    log("Headers mapped to: " + headers);
    //Loop through the remaining lines and create objects from each row.
    for (var _i = 0, lines_1 = lines; _i < lines_1.length; _i++) {
        var line = lines_1[_i];
        var cells = line.split('\t');
        var row = {};
        for (var i = 0; i < cells.length; i++) {
            row[headers[i]] = cells[i];
        }
        log("Line parsed as: " + JSON.stringify(row));
        data.push(row);
    }
    log('Returning parsed data');
    return data;
};
var jsonToCsv = function (data) {
    if (data.length === 0)
        return "";
    //Put all JSON objects into this array as a string representation.
    var csv = [];
    //Add header row.
    var headerRow = Object.keys(data[0]).join();
    csv.push(headerRow);
    var _loop_2 = function (obj) {
        var str = Object.keys(obj).map(function (key) { return obj[key]; }).join();
        csv.push(str);
    };
    //Add all the objects.
    for (var _i = 0, data_1 = data; _i < data_1.length; _i++) {
        var obj = data_1[_i];
        _loop_2(obj);
    }
    return csv.join('<br />');
};
var jsonToHtmlTable = function (data) {
    if (data.length === 0)
        throw new Error('Empty array provided to #jsonToHtmlTable');
    //Parse out keys from provided JSON objects to use as header row in table.
    var headerRow = Object.keys(data[0]);
    //Create HTML table header row.
    var headerTableRow = headerRow.map(function (header) { return "<td style='border: 1px solid black'>" + header + "</td>"; }).join('');
    //Create the rest of the HTML table rows.
    var restOfTheRows = [];
    for (var _i = 0, data_2 = data; _i < data_2.length; _i++) {
        var event_1 = data_2[_i];
        var row = '<tr>';
        for (var _a = 0, headerRow_1 = headerRow; _a < headerRow_1.length; _a++) {
            var header = headerRow_1[_a];
            row += "<td style='border: 1px solid black'>" + event_1[header] + "</td>";
        }
        row += '</tr>';
        restOfTheRows.push(row);
    }
    return "\n\t\t<table>\n\t\t\t<thead style='font-weight: bold;'>\n\t\t\t\t<tr>\n\t\t\t\t\t" + headerTableRow + "\n\t\t\t\t</tr>\n\t\t\t</thead>\n\t\t\t<tbody>\n\t\t\t\t" + restOfTheRows.join('') + "\n\t\t\t</tbody>\n\t\t</table>\n\t";
};
var removeTestRows = function (data) {
    log('Preparing to remove test rows');
    var testRowNameIndicators = ['test', 'budget', 'template', 'concur', 'cvent', 'trustee meeting - ', 'board meeting - fmr llc board of directors'];
    return data.filter(function (event) { return filters.testRows(event, testRowNameIndicators); });
};
var getWithinDateRange = function (data, start, end) {
    log('Narrowing data down to specified date range');
    if (!start || !end)
        throw new Error('Missing start or end date');
    var startDate = (new Date(start)).valueOf();
    log("Selected start date: " + startDate);
    var endDate = (new Date(end)).valueOf() + (1000 * 60 * 60 * 24);
    log("Selected end date: " + endDate);
    return data.filter(function (event) { return filters.dateRange(event, startDate, endDate); });
};
var log = function (message, level) {
    if (!level)
        level = LogLevel.INFO;
    $('#logs').append("<p>" + level + ": " + message + "</p>");
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
        IF_RESCHEDULED: {
            NOW_VIRTUAL: 'is it now virtual?'
        },
        REQUEST_STATUS: {
            CANCELLED: 'cancelled'
        }
    },
    ERRORS: {
        INVALID_ATTENDEES_VALUE: function (eventTitle, totalAttendeesExpected) { return "Could not parse number of attendees for event titled " + eventTitle + ". Attendees value was set as " + totalAttendeesExpected + "."; }
    }
};
var filters = {
    cancelled: function (event) {
        log("-- Event title: " + event.eventTitle);
        log("-- Event request status: " + event.requestStatus);
        if (event.requestStatus.toLowerCase().indexOf(constants.COLUMNS.REQUEST_STATUS.CANCELLED) > -1) {
            log('---- Including event');
            return true;
        }
        log('---- Excluding event');
        return false;
    },
    cancelledDueToCovid: function (event) {
        log("-- Event title: " + event.eventTitle);
        log("-- Event request status: " + event.requestStatus);
        log("-- Event affected by COVID status: " + event.affectedByCovid);
        if (event.requestStatus.toLowerCase().indexOf(constants.COLUMNS.REQUEST_STATUS.CANCELLED) > -1 && event.affectedByCovid.toLowerCase().indexOf(constants.COLUMNS.AFFECTED_BY_COVID.CANCELLED) > -1) {
            log('---- Including event');
            return true;
        }
        log('---- Excluding event');
        return false;
    },
    dateRange: function (event, startDate, endDate) {
        log("-- Event title: " + event.eventTitle);
        //Check whether or not the event takes place during the provided date range.
        var eventStartDate = (new Date(event.startDate)).valueOf();
        if (eventStartDate >= startDate && eventStartDate <= endDate) {
            log('---- Including event');
            return true;
        }
        else {
            log('---- Excluding event');
            return false;
        }
    },
    inPersonToVirtual: function (event) {
        log("-- Event title: " + event.eventTitle);
        log("-- Event affected by covid: " + event.affectedByCovid);
        log("-- Event if rescheduled: " + event.ifRescheduled);
        if ((event.affectedByCovid.toLowerCase().indexOf(constants.COLUMNS.AFFECTED_BY_COVID.HYBRID_TO_VIRTUAL) > -1 || event.affectedByCovid.toLowerCase().indexOf(constants.COLUMNS.AFFECTED_BY_COVID.IN_PERSON_TO_VIRTUAL) > -1)
            || (event.affectedByCovid.toLowerCase().indexOf(constants.COLUMNS.AFFECTED_BY_COVID.RESCHEDULED) > -1 && event.ifRescheduled.toLowerCase().indexOf(constants.COLUMNS.IF_RESCHEDULED.NOW_VIRTUAL) > -1)) {
            log('---- Including event');
            return true;
        }
        log('---- Excluding event');
        return false;
    },
    newCovidEvents: function (event) {
        log("-- Event title: " + event.eventTitle);
        log("-- Event affected by covid: " + event.affectedByCovid);
        log("-- Event request status: " + event.requestStatus);
        if (event.affectedByCovid.toLowerCase().indexOf(constants.COLUMNS.AFFECTED_BY_COVID.NEW_EVENT) > -1
            && event.requestStatus.toLowerCase().indexOf(constants.COLUMNS.REQUEST_STATUS.CANCELLED) === -1) {
            log('---- Including event');
            return true;
        }
        log('---- Excluding event');
        return false;
    },
    nonCancelledEvents: function (event) {
        log("-- Event title: " + event.eventTitle);
        log("-- Event request status: " + event.requestStatus);
        if (event.requestStatus.toLowerCase().indexOf(constants.COLUMNS.REQUEST_STATUS.CANCELLED) === -1) {
            log('---- Including event');
            return true;
        }
        else {
            log('---- Excluding event');
            return false;
        }
    },
    rescheduledCovid: function (event) {
        log("-- Event title: " + event.eventTitle);
        log("-- Event affected by covid status: " + event.affectedByCovid);
        if (event.affectedByCovid.toLowerCase().indexOf(constants.COLUMNS.AFFECTED_BY_COVID.RESCHEDULED) > -1) {
            log('---- Including event');
            return true;
        }
        else {
            log('---- Excluding event');
            return false;
        }
    },
    testRows: function (event, testRowNameIndicators) {
        log("-- Event title: " + event.eventTitle);
        //Check if the event title starts with any of the test row indicators.
        for (var _i = 0, testRowNameIndicators_1 = testRowNameIndicators; _i < testRowNameIndicators_1.length; _i++) {
            var indicator = testRowNameIndicators_1[_i];
            if (event.eventTitle.toLowerCase().indexOf(indicator) === 0) {
                log("---- Excluding event because it contains a test event indicator");
                log("------ Matching indicator: " + indicator);
                return false;
            }
        }
        //Check if the event is planned by a person whose events should be excluded.
        if (event.plannerName && event.plannerName.toLowerCase().indexOf('n-wright, de') > -1) {
            log("---- Excluding event");
            log("------ Planner value: " + event.plannerName);
            return false;
        }
        //If no conditions match, this is not a test row, so don't remove it.
        log('---- Including event');
        return true;
    }
};
var LogLevel;
(function (LogLevel) {
    LogLevel["INFO"] = "INFO";
    LogLevel["ERROR"] = "ERROR";
})(LogLevel || (LogLevel = {}));
