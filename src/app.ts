$(document).ready(() => {
	
	//Button on click listener.
	$('#generateReportButton').click(() => {
		//Empty the results table and logs div to prepare for the new results (or clear in case there's an error).
		log('##### Emptying results table and logs section');
		$('#results').empty();
		$('#logs').empty();

		try {
			//Parse tsv to json, exclude test events, and include only events in specified date range.
			log('##### Fetching raw data and date inputs');
			const rawData = $('#data').val() as string;
			const start = $('#startDate').val() as string;
			const end = $('#endDate').val() as string;
			const parsedData = parseTsv(rawData);
			log(`##### ALL ROWS: ${parsedData.length}`);
			const filteredData = removeTestRows(parsedData);
			log(`##### FILTERED ROWS: ${filteredData.length}`);
			const data = getWithinDateRange(filteredData, start, end);
			log(`##### WITHIN DATE RANGE ROWS: ${data.length}`);

			//Get non-cancelled events count.
			const nonCancelledEvents = data.filter(event => {
				log(`##### Counting events with a request status of anything other than ${constants.COLUMNS.REQUEST_STATUS.CANCELLED}`);
				return filters.nonCancelledEvents(event);
			});

			//Get events cancelled due to covid count.
			const cancelledDueToCovidCount = data.filter(event => {
				log(`##### Counting events that contain a request status of ${constants.COLUMNS.REQUEST_STATUS.CANCELLED} and an affected by COVID value of ${constants.COLUMNS.AFFECTED_BY_COVID.CANCELLED}`);
				return filters.cancelledDueToCovid(event);
			}).length;

			//Get events cancelled not due to covid count.	
			const cancelledTotalCount = data.filter(event => {
				log(`##### Counting events that contain request status of ${constants.COLUMNS.REQUEST_STATUS.CANCELLED}`);
				return filters.cancelled(event);
			}).length;

			//Get non-cancelled events that switched from in-person to virtual count.
			const inPersonToVirtualCount = data.filter(event => {
				log(`##### Counting events that have an affected by COVID value of ${constants.COLUMNS.AFFECTED_BY_COVID.HYBRID_TO_VIRTUAL} OR ${constants.COLUMNS.AFFECTED_BY_COVID.IN_PERSON_TO_VIRTUAL} OR BOTH an affected by COVID value of ${constants.COLUMNS.AFFECTED_BY_COVID.RESCHEDULED} AND if rescheduled value of ${constants.COLUMNS.IF_RESCHEDULED.NOW_VIRTUAL}`);
				return filters.inPersonToVirtual(event);
			}).length;

			//Get events created because of covid count.
			const newCovidEvents = data.filter(event => {
				log(`##### Counting events that have an affected by COVID value of ${constants.COLUMNS.AFFECTED_BY_COVID.NEW_EVENT} and a request status of ${constants.COLUMNS.REQUEST_STATUS.CANCELLED}`);
				return filters.newCovidEvents(event);
			});
			const newCovidEventsCount = newCovidEvents.length;

			//Get expected attendees to all new events.
			const newEventExpectedAttendees = newCovidEvents
				.map(event => {
					//Parse the values of attendees expected, which might not be (but usually is) a simple number in string form.
					let numAttendees;
					//Check for numer in string form, or a string that begins with a number, like '500+'.
					if(!isNaN(parseInt(event.totalAttendeesExpected.replace(/,/g, '').replace(/"/g, '').trim()))) numAttendees = parseInt(event.totalAttendeesExpected.replace(/,/g, '').replace(/"/g, '').trim());
					//Check for ranges and take the first value, like '10 - 20' should take 10.
					else if(event.totalAttendeesExpected.indexOf('-') > -1) {
						const estimates = event.totalAttendeesExpected.split('-');
						if(!isNaN(parseInt(estimates[0].replace(/,/g, '').replace(/"/g, '').trim()))) numAttendees = parseInt(estimates[0].replace(/,/g, '').replace(/"/g, '').trim());
						else throw new Error(constants.ERRORS.INVALID_ATTENDEES_VALUE(event.eventTitle, event.totalAttendeesExpected));
					}
					else throw new Error(constants.ERRORS.INVALID_ATTENDEES_VALUE(event.eventTitle, event.totalAttendeesExpected));
					return numAttendees
				})
				.reduce((sum, attendees) => sum + attendees, 0)

			//Get rescheduled events count.
			const rescheduledCount = data.filter(event => {
				log(`##### Counting events with an affected by COVID value of ${constants.COLUMNS.AFFECTED_BY_COVID.RESCHEDULED}`);
				return filters.rescheduledCovid(event);
			}).length;

			//Put all data into a table.
			const tableData = [
				[`<span onClick="document.write('${JSON.stringify(nonCancelledEvents)}')">Not cancelled</span>`, nonCancelledEvents.length],
				['Cancelled due to COVID', cancelledDueToCovidCount],
				['Total cancelled', `${cancelledTotalCount + 2} (including 2 cancelled events with blank status)`],
				['Switched to virtual due to COVID', inPersonToVirtualCount],
				['New events due to COVID', newCovidEventsCount],
				['Expected attendees for new events', newEventExpectedAttendees],
				['Rescheduled events', rescheduledCount]
			];
			for(const td of tableData) {
				$('#results').append(`<tr>
					<td style='border: 1px solid #aaaaaa;'>${td[0]}</td>
					<td style='border: 1px solid #aaaaaa;'>${td[1]}</td>
				</tr>`);
			}
		}
		catch(e) {
			log(e.toString(), LogLevel.ERROR);
		}
	});

});

//Convert tab separated string (where first row is headers) to js object.
const parseTsv = (rawData: string): FidEvent[] => {
	log(`Preparing to parse raw tsv data into JSON array`);

	//Prepare the array to return.
	const data: FidEvent[] = [];

	//Parse the input into lines and extract the header row.
	log('Parsing raw tsv data into raw JSON array');
	const lines = rawData.split('\n');
	log('Picking out raw header row');
	const rawHeaders = lines.shift()?.split('\t') || [];
	log(`Raw headers parsed as: ${rawHeaders}`);

	//Map the header column names to my easy to read names.
	const headerMap = {
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
		'covid | did we pay any fees to vendor(s)?' : 'feesPaidToVendors',
		'covid | vendor name | vendor1': 'vendor1Name',
		'covid | contracted fee ($) | vendor 1': 'vendor1ContractedFee',
		'covid | fees actually paid ($) | ven1': 'vendor1FeesPaid',
		'covid | vendor name | vendor 2' : 'vendor2Name',
		'covid | contracted fee ($) | vendor 2': 'vendor2ContractedFee',
		'covid | fees actually paid ($) | vendor 2': 'vendor2FeesPaid'
	};
	log('Mapping raw headers to js friendly headers');
	const headers = rawHeaders.map(header => {
		const mappedHeader = headerMap[header.toLowerCase()]
		log(`Mapping raw header << ${header} >> to << ${mappedHeader} >>`);
		return mappedHeader;
	});
	log(`Headers mapped to: ${headers}`);

	//Loop through the remaining lines and create objects from each row.
	for(const line of lines) {
		log(`Parsing raw line into parsed line: ${line}`)
		const cells = line.split('\t');
		let row: Record<string, string> = {};
		for(let i=0; i<cells.length; i++){
			row[headers[i]] = cells[i];
		}
		log(`Line parsed as: ${row}`);
		data.push((row as unknown) as FidEvent);
	}
	log('Returning parsed data');
	return data;
};

const removeTestRows = (data: FidEvent[]): FidEvent[] => {
	log('Preparing to remove test rows');
	const testRowNameIndicators = ['test', 'budget', 'template', 'concur', 'cvent', 'trustee meeting - ', 'board meeting - fmr llc board of directors'];
	return data.filter(event => filters.testRows(event, testRowNameIndicators))
};

const getWithinDateRange = (data: FidEvent[], start: string, end: string) => {
	log('Narrowing data down to specified date range');
	if(!start || !end) throw new Error('Missing start or end date');
	const startDate = (new Date(start)).valueOf();
	log(`Selected start date: ${startDate}`);
	const endDate = (new Date(end)).valueOf() + (1000 * 60 * 60 * 24);
	log(`Selected end date: ${endDate}`);
	return data.filter(event => filters.dateRange(event, startDate, endDate));
};

const log = (message: string, level?: LogLevel) => {
	if(!level) level = LogLevel.INFO;
	$('#logs').append(`<p>${level}: ${message}</p>`);
};

const constants = {
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
		INVALID_ATTENDEES_VALUE(eventTitle, totalAttendeesExpected) {return `Could not parse number of attendees for event titled ${eventTitle}. Attendees value was set as ${totalAttendeesExpected}.`}
	}
};

const filters = {
	cancelled(event: FidEvent) {
		log(`-- Event title: ${event.eventTitle}`);
		log(`-- Event request status: ${event.requestStatus}`);
		if(event.requestStatus.toLowerCase().indexOf(constants.COLUMNS.REQUEST_STATUS.CANCELLED) > -1) {
			log('---- Including event');
			return true;
		}
		log('---- Excluding event');
		return false;
	},
	cancelledDueToCovid(event: FidEvent) {
		log(`-- Event title: ${event.eventTitle}`);
		log(`-- Event request status: ${event.requestStatus}`);
		log(`-- Event affected by COVID status: ${event.affectedByCovid}`);
		if(event.requestStatus.toLowerCase().indexOf(constants.COLUMNS.REQUEST_STATUS.CANCELLED) > -1 && event.affectedByCovid.toLowerCase().indexOf(constants.COLUMNS.AFFECTED_BY_COVID.CANCELLED) > -1) {
			log('---- Including event');
			return true;
		}
		log('---- Excluding event');
		return false;
	},
	dateRange(event: FidEvent, startDate: number, endDate: number) {
		log(`-- Event title: ${event.eventTitle}`);

		//Check whether or not the event takes place during the provided date range.
		const eventStartDate = (new Date(event.startDate)).valueOf();
		if(eventStartDate >= startDate && eventStartDate <= endDate) {
			log('---- Including event');
			return true;
		}
		else {
			log('---- Excluding event');
			return false;
		}
	},
	inPersonToVirtual(event: FidEvent) {
		log(`-- Event title: ${event.eventTitle}`);
		log(`-- Event affected by covid: ${event.affectedByCovid}`);
		log(`-- Event if rescheduled: ${event.ifRescheduled}`);
		if((event.affectedByCovid.toLowerCase().indexOf(constants.COLUMNS.AFFECTED_BY_COVID.HYBRID_TO_VIRTUAL) > -1 || event.affectedByCovid.toLowerCase().indexOf(constants.COLUMNS.AFFECTED_BY_COVID.IN_PERSON_TO_VIRTUAL) > -1)
		|| (event.affectedByCovid.toLowerCase().indexOf(constants.COLUMNS.AFFECTED_BY_COVID.RESCHEDULED) > -1 && event.ifRescheduled.toLowerCase().indexOf(constants.COLUMNS.IF_RESCHEDULED.NOW_VIRTUAL) > -1)) {
			log('---- Including event');
			return true;
		}
		log('---- Excluding event');
		return false;
	},
	newCovidEvents(event: FidEvent) {
		log(`-- Event title: ${event.eventTitle}`);
		log(`-- Event affected by covid: ${event.affectedByCovid}`);
		log(`-- Event request status: ${event.requestStatus}`);
		if(event.affectedByCovid.toLowerCase().indexOf(constants.COLUMNS.AFFECTED_BY_COVID.NEW_EVENT) > -1
		&& event.requestStatus.toLowerCase().indexOf(constants.COLUMNS.REQUEST_STATUS.CANCELLED) === -1) {
			log('---- Including event');
			return true;
		}
		log('---- Excluding event');
		return false;
	},
	nonCancelledEvents(event: FidEvent) {
		log(`-- Event title: ${event.eventTitle}`);
		log(`-- Event request status: ${event.requestStatus}`);
		if(event.requestStatus.toLowerCase().indexOf(constants.COLUMNS.REQUEST_STATUS.CANCELLED) === -1) {
			log('---- Including event');
			return true;
		}
		else {
			log('---- Excluding event');
			return false;
		}
	},
	rescheduledCovid(event: FidEvent) {
		log(`-- Event title: ${event.eventTitle}`);
		log(`-- Event affected by covid status: ${event.affectedByCovid}`);
		if(event.affectedByCovid.toLowerCase().indexOf(constants.COLUMNS.AFFECTED_BY_COVID.RESCHEDULED) > -1) {
			log('---- Including event');
			return true;
		}
		else {
			log('---- Excluding event');
			return false;
		}
	},
	testRows(event: FidEvent, testRowNameIndicators) {
		log(`-- Event title: ${event.eventTitle}`);
		
		//Check if the event title starts with any of the test row indicators.
		for(const indicator of testRowNameIndicators) {
			if(event.eventTitle.toLowerCase().indexOf(indicator) === 0) {
				log(`---- Excluding event because it contains a test event indicator`);
				log(`------ Matching indicator: ${indicator}`);
				return false;
			}
		}

		//Check if the event is planned by a person whose events should be excluded.
		if(event.plannerName && event.plannerName.toLowerCase().indexOf('n-wright, de') > -1) {
			log(`---- Excluding event`);
			log(`------ Planner value: ${event.plannerName}`)
			return false;
		}

		//If no conditions match, this is not a test row, so don't remove it.
		log('---- Including event');
		return true;
	}
};

interface FidEvent {
	eventTitle: string,
	eventCode: string,
	eventType: string,
	requestStatus: string,
	businessUnitCategory1: string,
	startDate: string,
	endDate: string,
	totalAttendeesExpected: string,
	totalNumberAttended: string,
	eventLocation: string,
	eventCity: string,
	eventStateProv: string,
	plannerName: string,
	dateConfirmed: string,
	liveVirtualOrHybrid: string,
	virtualPlatforms: string,
	hybridPlatforms: string,
	affectedByCovid: string,
	ifRescheduled: string,
	newCovidEvent: string,
	totalFinancialLoss: string,
	feesPaidToVendors: string,
	vendor1Name: string,
	vendor1ContractedFee: string,
	vendor1FeesPaid: string,
	vendor2Name: string,
	vendor2ContractedFee: string,
	vendor2FeesPaid: string
}

enum LogLevel {
	INFO = 'INFO',
	ERROR = 'ERROR'
}