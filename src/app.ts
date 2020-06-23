$(document).ready(() => {
	
	$('#generateReportButton').click(() => {
		const rawData = $('#data').val() as string;
		const data = parseTsv(rawData);
		const filteredData = removeTestRows(data);
		console.log(filteredData);
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
		'is this date confirmed': 'dateConfirmed',
		'is this a live, virtual, or hybrid event?': 'liveVirtualOrHybrid',
		'if virtual, what platform(s) are you using?': 'virtualPlatforms',
		'if hybrid, what platform(s) are you using?': 'hybridPlatforms',
		'covid | was this event affected by covid': 'affectedByCovid',
		'covid | if the event was rescheduled...': 'ifRescheduled',
		'covid | if this is a new event due to covid....': 'newCovidEvent',
		'covid | total financial loss': 'totalFinancialLoss',
		'covid | did we pay any fees to vendor(s)' : 'feesPaidToVendors',
		'covid | vendor name | vendor1': 'vendor1Name',
		'covid | contracted fee ($) | vendor 1': 'vendor1ContractedFee',
		'covid | fees actually paid ($) | ven 1': 'vendor1FeesPaid',
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

//TODO this could cause problems with events that are not test events that contain any of these terms!
const removeTestRows = (data: FidEvent[]): FidEvent[] => {
	return data.filter((event) => (
		event.eventTitle.toLowerCase().indexOf('test') === -1
		&& event.eventTitle.toLowerCase().indexOf('budget') === -1
		&& event.eventTitle.toLowerCase().indexOf('template') === -1
		&& event.eventTitle.toLowerCase().indexOf('concur') === -1
		&& event.eventTitle.toLowerCase().indexOf('cvent') === -1
	))
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