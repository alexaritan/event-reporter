"use strict";
$(document).ready(function () {
    //Button on click listener.
    $('#generateReportButton').click(function () {
        //Empty the results table and logs div to prepare for the new results (or clear in case there's an error).
        log('##### Emptying results table and logs section');
        $('#results tr td').empty();
        $('#logs').empty();
        try {
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
            log("##### WITHIN DATE RANGE ROWS: " + data.length);
            //Get non-cancelled events count.
            var nonCancelledEvents_1 = data.filter(function (event) {
                log("##### Counting events with a request status of anything other than " + constants.COLUMNS.REQUEST_STATUS.CANCELLED);
                return filters.nonCancelledEvents(event);
            });
            //Get events cancelled due to covid count.
            var cancelledDueToCovid_1 = data.filter(function (event) {
                log("##### Counting events that contain a request status of " + constants.COLUMNS.REQUEST_STATUS.CANCELLED + " and an affected by COVID value of " + constants.COLUMNS.AFFECTED_BY_COVID.CANCELLED);
                return filters.cancelledDueToCovid(event);
            });
            //Get events cancelled not due to covid count.	
            var cancelledTotal_1 = data.filter(function (event) {
                log("##### Counting events that contain request status of " + constants.COLUMNS.REQUEST_STATUS.CANCELLED);
                return filters.cancelled(event);
            });
            //Get non-cancelled events that switched from in-person to virtual count.
            var inPersonToVirtual_1 = data.filter(function (event) {
                log("##### Counting events that have an affected by COVID value of " + constants.COLUMNS.AFFECTED_BY_COVID.HYBRID_TO_VIRTUAL + " OR " + constants.COLUMNS.AFFECTED_BY_COVID.IN_PERSON_TO_VIRTUAL + " OR BOTH an affected by COVID value of " + constants.COLUMNS.AFFECTED_BY_COVID.RESCHEDULED + " AND if rescheduled value of " + constants.COLUMNS.IF_RESCHEDULED.NOW_VIRTUAL);
                return filters.inPersonToVirtual(event);
            });
            //Get events created because of covid count.
            var newCovidEvents_1 = data.filter(function (event) {
                log("##### Counting events that have an affected by COVID value of " + constants.COLUMNS.AFFECTED_BY_COVID.NEW_EVENT + " and a request status of " + constants.COLUMNS.REQUEST_STATUS.CANCELLED);
                return filters.newCovidEvents(event);
            });
            var newCovidEventsCount = newCovidEvents_1.length;
            //Get expected attendees to all new events.
            var newEventExpectedAttendees_1 = newCovidEvents_1
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
            var rescheduled_1 = data.filter(function (event) {
                log("##### Counting events with an affected by COVID value of " + constants.COLUMNS.AFFECTED_BY_COVID.RESCHEDULED);
                return filters.rescheduledCovid(event);
            });
            //Put all data into a table.
            var tableData = [
                ['Not cancelled', nonCancelledEvents_1],
                ['Cancelled due to COVID', cancelledDueToCovid_1],
                ['Total cancelled', cancelledTotal_1],
                ['Switched to virtual due to COVID', inPersonToVirtual_1],
                ['New events due to COVID', newCovidEvents_1],
                ['Expected attendees for new events', newEventExpectedAttendees_1],
                ['Rescheduled events', rescheduled_1]
            ];
            for (var i = 0; i < tableData.length; i++) {
                var row = $('#results tr')[i];
                $($(row).children('td')[0]).html(tableData[i][0]);
                $($(row).children('td')[1]).html(tableData[i][1].length || tableData[i][1]);
            }
            //Clear and re-inialize on-click listeners to produce updated results.
            $('.result').off('click');
            $('#result1').click(function () {
                var _a;
                (_a = window.open()) === null || _a === void 0 ? void 0 : _a.document.write(jsonToCsv(nonCancelledEvents_1));
            });
            $('#result2').click(function () {
                var _a;
                (_a = window.open()) === null || _a === void 0 ? void 0 : _a.document.write(jsonToCsv(cancelledDueToCovid_1));
            });
            $('#result3').click(function () {
                var _a;
                (_a = window.open()) === null || _a === void 0 ? void 0 : _a.document.write(jsonToCsv(cancelledTotal_1));
            });
            $('#result4').click(function () {
                var _a;
                (_a = window.open()) === null || _a === void 0 ? void 0 : _a.document.write(jsonToCsv(inPersonToVirtual_1));
            });
            $('#result5').click(function () {
                var _a;
                (_a = window.open()) === null || _a === void 0 ? void 0 : _a.document.write(jsonToCsv(newCovidEvents_1));
            });
            $('#result6').click(function () {
                var _a;
                (_a = window.open()) === null || _a === void 0 ? void 0 : _a.document.write(newEventExpectedAttendees_1);
            });
            $('#result7').click(function () {
                var _a;
                (_a = window.open()) === null || _a === void 0 ? void 0 : _a.document.write(jsonToCsv(rescheduled_1));
            });
        }
        catch (e) {
            log(e.toString(), LogLevel.ERROR);
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
        log("Mapping raw header << " + header + " >> to << " + mappedHeader + " >>");
        return mappedHeader;
    });
    log("Headers mapped to: " + headers);
    //Loop through the remaining lines and create objects from each row.
    for (var _i = 0, lines_1 = lines; _i < lines_1.length; _i++) {
        var line = lines_1[_i];
        log("Parsing raw line into parsed line: " + line);
        var cells = line.split('\t');
        var row = {};
        for (var i = 0; i < cells.length; i++) {
            row[headers[i]] = cells[i];
        }
        log("Line parsed as: " + row);
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
    var _loop_1 = function (obj) {
        var str = Object.keys(obj).map(function (key) { return obj[key]; }).join();
        csv.push(str);
    };
    //Add all the objects.
    for (var _i = 0, data_1 = data; _i < data_1.length; _i++) {
        var obj = data_1[_i];
        _loop_1(obj);
    }
    return csv.join('<br />');
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
