$(document).ready(() => {
	
	//Button on click listener.
	$('#generateReportButton').click(() => {
		//Empty the table to prepare for the new results (or clear in case there's an error).
		$('#results').empty();

		try {
			//Parse tsv to json, exclude test events, and include only events in specified date range.
			const rawData = $('#data').val() as string;
			const start = $('#startDate').val() as string;
			const end = $('#endDate').val() as string;
			const parsedData = parseTsv(rawData);
			console.log(`ALL ROWS: ${parsedData.length}`);
			const filteredData = removeTestRows(parsedData);
			console.log(`FILTERED ROWS: ${filteredData.length}`);
			const data = getWithinDateRange(filteredData, start, end);
			console.log(`WITHIN DATE RANGE ROWS: ${data.length}`);

			//Get non-cancelled events count.
			const nonCancelledEventsCount = data.filter(event => event.requestStatus.toLowerCase().indexOf(constants.COLUMNS.REQUEST_STATUS.CANCELLED) === -1).length;

			//Get events cancelled due to covid count.
			const cancelledDueToCovidCount = data.filter(event => (
				event.requestStatus.toLowerCase().indexOf(constants.COLUMNS.REQUEST_STATUS.CANCELLED) > -1
				&& event.affectedByCovid.toLowerCase().indexOf(constants.COLUMNS.AFFECTED_BY_COVID.CANCELLED) > -1
			)).length;

			//Get events cancelled not due to covid count.	
			const cancelledTotalCount = data.filter(event => (
				event.requestStatus.toLowerCase().indexOf(constants.COLUMNS.REQUEST_STATUS.CANCELLED) > -1
			)).length;

			//Get non-cancelled events that switched from in-person to virtual count.
			const inPersonToVirtualCount = data.filter(event => (
				(event.affectedByCovid.toLowerCase().indexOf(constants.COLUMNS.AFFECTED_BY_COVID.HYBRID_TO_VIRTUAL) > -1 || event.affectedByCovid.toLowerCase().indexOf(constants.COLUMNS.AFFECTED_BY_COVID.IN_PERSON_TO_VIRTUAL) > -1)
				||
				(event.affectedByCovid.toLowerCase().indexOf(constants.COLUMNS.AFFECTED_BY_COVID.RESCHEDULED) > -1 && event.ifRescheduled.toLowerCase().indexOf('is it now virtual?') > -1)
			)).length;

			//Get events created because of covid count.
			const newCovidEvents = data.filter(event => event.affectedByCovid.toLowerCase().indexOf(constants.COLUMNS.AFFECTED_BY_COVID.NEW_EVENT) > -1);
			const newCovidEventsCount = newCovidEvents.length;

			//Get expected attendees to all new events.
			const newEventExpectedAttendees = newCovidEvents
				.map(event => {
					//Parse the values of attendees expected, which might not be (but usually is) a simple number in string form.
					let numAttendees;
					//Check for numer in string form, or a string that begins with a number, like '500+'.
					if(!isNaN(parseInt(event.totalAttendeesExpected.trim()))) numAttendees = parseInt(event.totalAttendeesExpected.trim());
					//Check for ranges and take the first value, like '10 - 20' should take 10.
					else if(event.totalAttendeesExpected.indexOf('-') > -1) {
						const estimates = event.totalAttendeesExpected.split('-');
						if(!isNaN(parseInt(estimates[0].trim()))) numAttendees = parseInt(estimates[0].trim());
						else throw new Error(constants.ERRORS.INVALID_ATTENDEES_VALUE(event.eventTitle, event.totalAttendeesExpected));
					}
					else throw new Error(constants.ERRORS.INVALID_ATTENDEES_VALUE(event.eventTitle, event.totalAttendeesExpected));
					return numAttendees
				})
				.reduce((sum, attendees) => sum + attendees, 0)

			//Get rescheduled events count.
			const rescheduledCount = data.filter(event => event.affectedByCovid.toLowerCase().indexOf(constants.COLUMNS.AFFECTED_BY_COVID.RESCHEDULED) > -1).length;

			//Put all data into a table.
			const tableData = [
				['Not cancelled', nonCancelledEventsCount],
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
			console.log(e.toString());
		}
	});

});

//Convert tab separated string (where first row is headers) to js object.
const parseTsv = (rawData: string): FidEvent[] => {
	//Prepare the array to return.
	const data: FidEvent[] = [];

	//Parse the input into lines and extract the header row.
	const lines = rawData.split('\n');
	const rawHeaders = lines.shift()?.split('\t');

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
	const headers = rawHeaders?.map(header => headerMap[header.toLowerCase()]) as string[];	

	//Loop through the remaining lines and create objects from each row.
	for(const line of lines) {
		const cells = line.split('\t');
		let row: Record<string, string> = {};
		for(let i=0; i<cells.length; i++){
			row[headers[i]] = cells[i];
		}
		data.push((row as unknown) as FidEvent);
	}
	return data;
};

const removeTestRows = (data: FidEvent[]): FidEvent[] => {
	return data.filter((event) => (
		event.eventTitle.toLowerCase().indexOf('test') !== 0
		&& event.eventTitle.toLowerCase().indexOf('budget') !== 0
		&& event.eventTitle.toLowerCase().indexOf('template') !== 0
		&& event.eventTitle.toLowerCase().indexOf('concur') !== 0
		&& event.eventTitle.toLowerCase().indexOf('cvent') !== 0
		&& event.eventTitle.toLowerCase().indexOf('trustee meeting - ') !== 0
		&& event.eventTitle.toLowerCase().indexOf('board meeting - fmr llc board of directors') !== 0
		&& (!event.plannerName || event?.plannerName?.toLowerCase().indexOf('flynn-wright, denise') === -1)
	))
};

const getWithinDateRange = (data: FidEvent[], start: string, end: string) => {
	const startDate = (new Date(start)).valueOf();
	const endDate = (new Date(end)).valueOf();
	return data.filter(event => {
		const eventStartDate = (new Date(event.startDate)).valueOf();
		return eventStartDate >= startDate && eventStartDate <= endDate;
	});
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
		REQUEST_STATUS: {
			CANCELLED: 'cancelled'
		}
	},
	ERRORS: {
		INVALID_ATTENDEES_VALUE(eventTitle, totalAttendeesExpected) {return `Could not parse number of attendees for event titled ${eventTitle}. Attendees value was set as ${totalAttendeesExpected}.`}
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