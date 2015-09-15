/**
 * Analysis of back ordered sales
 * 
 * Version		Date            Author		Remarks
 * 1.0			8/24/15     	Chris		Begin Development
 * 1.1		    8/26/15			Chris		Created sort by vendor method
 * 1.2			8/31/15			Chris		Removed duplicated vendor names
 */

function backorder(request, response){
	
	if(request.getMethod() == 'GET'){
	
		function1();
		
	}else{					
	
		function2();
	}
}

function function1()
{
	var form = nlapiCreateForm('Back Order Report');
	form.addField('date_start', 'date', 'Start Date').setDefaultValue('1/1/2015');
	form.addField('date_end', 'date', 'End Date').setDefaultValue('8/26/2015');
	var select11 = form.addField('version', 'select', 'Sort Type: ', null, 'bookselect').setLayoutType('normal','startcol');
	select11.addSelectOption('','');
	select11.addSelectOption('a','By Item');
	select11.addSelectOption('b','By Payment Method');
	select11.addSelectOption('c','By Vendor');
	
	form.addField('exkit', 'checkbox', 'Exclude Kit Package(s): ');
		
	form.addSubmitButton('Submit');
	response.writePage(form);
}

function function2()
{
	var setVersion 		= request.getParameter('version');	// Import sort type (by item or by paymentmethod)
	var setStartDate 	= new Date(request.getParameter('date_start'));	// Import start
	var setEndDate 		= new Date(request.getParameter('date_end')); // end
	var setkits 		= request.getParameter('exkit'); 
	
	// Search for Sales Order information (Not including Payment Method)
	var filters = new Array();
	filters[0]  = new nlobjSearchFilter('type', null, 'is', 'SalesOrd');
	filters[1]  = new nlobjSearchFilter('taxline', null, 'is', 'F');
	filters[2]  = new nlobjSearchFilter('shipping', null, 'is', 'F');
	filters[3]  = new nlobjSearchFilter('status', null, 'anyof', ['SalesOrd:D', 'SalesOrd:B']);
	filters[4]  = new nlobjSearchFilter('subsidiary', null, 'is', '2');
	filters[5]  = new nlobjSearchFilter('mainline', null, 'is', 'F');
	filters[6]  = new nlobjSearchFilter('trandate', null, 'within', setStartDate, setEndDate);
	filters[7]  = new nlobjSearchFilter('formulanumeric', null, 'greaterthan', '0').setFormula("{quantity}-nvl({quantitycommitted},0)-nvl({quantityshiprecv},0)");
	filters[8]  = new nlobjSearchFilter('description', 'item', 'doesnotcontain', 'Renewal');

	var columns = new Array();
	columns[0] = new nlobjSearchColumn('internalid').setSort();
	columns[1] = new nlobjSearchColumn('line');
	columns[2] = new nlobjSearchColumn('item').setSort(); 					// getText  || Item Purchased
	columns[3] = new nlobjSearchColumn('description', 'item'); 				// getValue || Item Description
	columns[4] = new nlobjSearchColumn('trandate'); 					// getValue || Sales Order Date
	columns[5] = new nlobjSearchColumn('status'); 						// getText  || Sales Order Status
	columns[6] = new nlobjSearchColumn('tranid'); 						// getValue || Sales Order Number
	columns[7] = new nlobjSearchColumn('entity'); 						// getText  || Customer Name
	columns[8] = new nlobjSearchColumn('location'); 					// getText  || Item Location
	columns[9] = new nlobjSearchColumn('vendorname', 'item'); 				// getText  || Vendor
	columns[10] = new nlobjSearchColumn('quantity'); 					// getValue || Quantity Ordered
	columns[11] = new nlobjSearchColumn('quantityshiprecv'); 				// getValue || Quantity Fulfilled
	columns[12] = new nlobjSearchColumn('formulanumeric').setFormula("{quantity}-nvl({quantitycommitted},0)-nvl({quantityshiprecv},0)"); // getValue || Back Ordered
	columns[13] = new nlobjSearchColumn('lastpurchaseprice', 'item'); 			// getValue || Last Purchase Price
	columns[14] = new nlobjSearchColumn('formulacurrency').setFormula("{quantity}*{rate}"); // getValue || Sales Amount
	columns[15] = new nlobjSearchColumn('type', 'item'); 					// getText || Item Type
	columns[16] = new nlobjSearchColumn('custitem_linked_item', 'item'); 			// getValue || Linked item
	columns[17] = new nlobjSearchColumn('internalid', 'item'); 				// getValue || Item Internal ID
	columns[18] = new nlobjSearchColumn('othervendor', 'item'); 				// getText || Other vendor

	// Search results #0-999
	var results = nlapiSearchRecord('transaction', null, filters, columns);	
	
	// Storage location for complete result set.
	var allResults = new Array();
	allResults = allResults.concat(results);
		
	// Search results #1000+
	while(results.length == 1000)
	{
		var lastId2 = results[999].getValue('internalid');
		var lastLine = results[999].getValue('line');
		
		filters[9] = new nlobjSearchFilter('internalidNumber', null, 'greaterthanorequalto', lastId2);
	
		var results = nlapiSearchRecord('transaction', null, filters, columns);
		
        for(var i = 0; i < results.length; i++){
        	
              var result = results[i];

              if(Number(result.getValue('internalid')) == Number(lastId2) && Number(result.getValue('line')) > Number(lastLine)){

            	  allResults = allResults.concat(result); 
              }
              else if(result.getValue('internalid') > lastId2){
                	  
                  allResults = allResults.concat(result); 
              }
        }
	}
	
	// Create list of unique SO's to find payment method / create new array to be sorted
	var unsortSO = new Array();
	var unsortKIT = new Array();
	
	for(var x = 0; x < allResults.length; x++){
		
		unsortSO = unsortSO.concat(allResults[x].getValue('internalid'));
		
		if(allResults[x].getText('type', 'item') == 'Kit/Package'){
			
			unsortKIT = unsortKIT.concat(allResults[x].getText('internalid', 'item'));
		}
	}
	
	var listSO = new Array();
	listSO = trim(unsortSO);
	listSO.sort();
	
	var listKIT = new Array();
	listKIT = trim(unsortKIT);
	listKIT.sort();
	
	// Search for kit item vendors
	var filters = new Array();
	filters[0] = new nlobjSearchFilter('internalid', null, 'anyof', listKIT);
	
	var columns = new Array();
	columns[0] = new nlobjSearchColumn('internalid').setSort();
	columns[1] = new nlobjSearchColumn('vendorname', 'memberitem');
	columns[2] = new nlobjSearchColumn('memberitem');
	columns[3] = new nlobjSearchColumn('othervendor', 'memberitem'); // getText || Other vendor
	
	var kitsearch = nlapiSearchRecord('item', null, filters, columns);
	for(var c = 0; c < kitsearch.length; c++){
		
		result = kitsearch[c];
		//logx('kit', result.getValue('internalid') + ' \\ ' + result.getText('othervendor', 'memberitem') + ' \\ ' + result.getText('memberitem'));
	}
	
	// Search for Payment Method based on list of unique Sales orders
	var filters = new Array();
	filters[0] = new nlobjSearchFilter('type', null, 'is', 'SalesOrd');
	filters[1] = new nlobjSearchFilter('subsidiary', null, 'is', '2');
	filters[2] = new nlobjSearchFilter('mainline', null, 'is', 'T');
	filters[3] = new nlobjSearchFilter('trandate', null, 'within', setStartDate, setEndDate);
	filters[4] = new nlobjSearchFilter('internalid', null, 'anyof', listSO);
	
	var columns = new Array();
	columns[0] = new nlobjSearchColumn('internalid').setSort();
	columns[1] = new nlobjSearchColumn('line');
	columns[2] = new nlobjSearchColumn('tranid'); 				// getValue || Sales Order Number
	columns[3] = new nlobjSearchColumn('amount'); 				// getValue || Amount
	columns[4] = new nlobjSearchColumn('paymentmethod'); 		// getText 	|| Payment method

	// Search results #0-999
	var results = nlapiSearchRecord('transaction', null, filters, columns);	

	var allResultsPM = new Array();
	allResultsPM = allResultsPM.concat(results);

	// Search results #1000+
	while(results.length == 1000)
	{
		var lastId2 = results[999].getValue('internalid');
		var lastLine = results[999].getValue('line');
		
		filters[5] = new nlobjSearchFilter('internalidNumber', null, 'greaterthanorequalto', lastId2);
	
		var results = nlapiSearchRecord('transaction', null, filters, columns);
		
        for(var i = 0; i < results.length; i++){
        	
              var result = results[i];
              
              if(Number(result.getValue('internalid')) == Number(lastId2) && Number(result.getValue('line')) > Number(lastLine)){

            	  allResultsPM = allResultsPM.concat(result);
              }
              else if(result.getValue('internalid') > lastId2){
            	  
            	  allResultsPM = allResultsPM.concat(result);
              }
        }
	}
	
	// Create list of payment method search result's internal ID's
	var arPM = new Array();
	
	for(var x = 0; x < allResultsPM.length; x++){
		
		arPM = arPM.concat(Number(allResultsPM[x].getValue('internalid')));
	}
	
	var data1 = new Array();
	var data2 = new Array();
	
	val1 = 0;
	val2 = 0;
	
	var testc = 0;
	
	for(var x = 0; x < allResults.length; x++){
				
		if(setkits == 'T'){
			
			if(allResults[x].getText('type', 'item') != 'Kit/Package'){
				
				var kitarray = new Array();
				
				var itemIid	= allResults[x].getValue('internalid');
				var itemPurchased = allResults[x].getText('item');
				var itemDescription = allResults[x].getValue('description', 'item');
				var soDate = allResults[x].getValue('trandate');
				var soStatus = allResults[x].getText('status');
				var soNumber = allResults[x].getValue('tranid');
				var custName = allResults[x].getText('entity');
				var itemLocation = allResults[x].getText('location');
				var vend = allResults[x].getValue('vendorname', 'item');
				var qtyorder = allResults[x].getValue('quantity');
				var qtyfulfill = allResults[x].getValue('quantityshiprecv');
				var qtyBackOrd = allResults[x].getValue('formulanumeric');
				var lastPurchase = allResults[x].getValue('lastpurchaseprice', 'item');
				var saleAmt = allResults[x].getValue('formulacurrency');
				var iType = allResults[x].getText('type', 'item');
				var itemlinked = allResults[x].getText('custitem_linked_item', 'item');	
				var kitID = allResults[x].getValue('internalid', 'item');
				var kitvendor = '';
				var vendor2 = allResults[x].getText('othervendor', 'item');
				
				var iid = Number(allResults[x].getValue('internalid'));
				var ele = arPM.indexOf(iid);
				
				var pmtm = allResultsPM[ele].getText('paymentmethod');
				
				if(allResults[x].getText('type', 'item') == 'Kit/Package'){
					
					for(var y = 0; y < kitsearch.length; y++){
						
						if(kitID == kitsearch[y].getValue('internalid')){
						
							if(kitsearch[y].getText('othervendor', 'memberitem') != ''){
								
								var acheck = isInArray(kitsearch[y].getText('othervendor', 'memberitem'), kitarray);
								if(acheck == true){
									
									// skip if true
								}else{
									
									kitarray = kitarray.concat(kitsearch[y].getText('othervendor', 'memberitem'));
									kitvendor += kitsearch[y].getText('othervendor', 'memberitem');
								}
								
							}else{
								
								kitvendor += '(' + kitsearch[y].getText('memberitem') + ')';
							}
							kitvendor += ' / ';
						}
					}
					vendor2 = kitvendor;
				}
				
				// Create a string of the first 3 letters of item number
				var toexclude = String(itemPurchased)[0] + String(itemPurchased)[1] + String(itemPurchased)[2];
				
		        if(String(toexclude) != 'DPS'){
		        	
		        	if(itemlinked == ''){
		        		data1[val1] = {kitinternalid: kitID, linkeditem: itemlinked, itemType: iType, paymentmethod:pmtm, internalid:itemIid, item:itemPurchased, description:itemDescription, trandate:soDate, status:soStatus, tranid:soNumber, entity:custName, location:itemLocation, vendorname:vendor2, quantity:qtyorder, quantityshiprecv:qtyfulfill, formulanumeric:qtyBackOrd, lastpurchaseprice:lastPurchase, formulacurrency:saleAmt};
		        		val1++;
		        	}else{
		        		data2[val2] = {kitinternalid: kitID, linkeditem: itemlinked, itemType: iType, paymentmethod:pmtm, internalid:itemIid, item:itemPurchased, description:itemDescription, trandate:soDate, status:soStatus, tranid:soNumber, entity:custName, location:itemLocation, vendorname:vendor2, quantity:qtyorder, quantityshiprecv:qtyfulfill, formulanumeric:qtyBackOrd, lastpurchaseprice:lastPurchase, formulacurrency:saleAmt};
		        		val2++;
		        	}

		        }
			}
		}else{
			var kitarray = new Array();

			var itemIid	= allResults[x].getValue('internalid');
			var itemPurchased = allResults[x].getText('item');
			var itemDescription = allResults[x].getValue('description', 'item');
			var soDate = allResults[x].getValue('trandate');
			var soStatus = allResults[x].getText('status');
			var soNumber = allResults[x].getValue('tranid');
			var custName = allResults[x].getText('entity');
			var itemLocation = allResults[x].getText('location');
			var vend = allResults[x].getValue('vendorname', 'item');
			var qtyorder = allResults[x].getValue('quantity');
			var qtyfulfill = allResults[x].getValue('quantityshiprecv');
			var qtyBackOrd = allResults[x].getValue('formulanumeric');
			var lastPurchase = allResults[x].getValue('lastpurchaseprice', 'item');
			var saleAmt = allResults[x].getValue('formulacurrency');
			var iType = allResults[x].getText('type', 'item');
			var itemlinked = allResults[x].getText('custitem_linked_item', 'item');	
			var kitID = allResults[x].getValue('internalid', 'item')
			var vendor2 = allResults[x].getText('othervendor', 'item');
			var kitvendor = '';
			
			var iid = Number(allResults[x].getValue('internalid'));
			var ele = arPM.indexOf(iid);
			
			var pmtm = allResultsPM[ele].getText('paymentmethod');
			
			if(allResults[x].getText('type', 'item') == 'Kit/Package'){
				
				for(var y = 0; y < kitsearch.length; y++){
					
					if(kitID == kitsearch[y].getValue('internalid')){
					
						if(kitsearch[y].getText('othervendor', 'memberitem') != ''){
							
							var acheck = isInArray(kitsearch[y].getText('othervendor', 'memberitem'), kitarray);
							if(acheck == true){
								
							}else{
								
								kitarray = kitarray.concat(kitsearch[y].getText('othervendor', 'memberitem'));
								kitvendor += kitsearch[y].getText('othervendor', 'memberitem');
							}
							
						}else{
							
							kitvendor += '(' + kitsearch[y].getText('memberitem') + ')';
						}
						kitvendor += ' / ';
					}
				}
				vendor2 = kitvendor;
			}
			
			// Create a string of the first 3 letters of item number
			var toexclude = String(itemPurchased)[0] + String(itemPurchased)[1] + String(itemPurchased)[2];
			
	        if(String(toexclude) != 'DPS'){
	        	
	        	if(itemlinked == ''){
	        		
	        		data1[val1] = {kitinternalid: kitID, linkeditem: itemlinked, itemType: iType, paymentmethod:pmtm, internalid:itemIid, item:itemPurchased, description:itemDescription, trandate:soDate, status:soStatus, tranid:soNumber, entity:custName, location:itemLocation, vendorname:vendor2, quantity:qtyorder, quantityshiprecv:qtyfulfill, formulanumeric:qtyBackOrd, lastpurchaseprice:lastPurchase, formulacurrency:saleAmt};
	        		val1++;
	        	}else{
	        		
	        		data2[val2] = {kitinternalid: kitID, linkeditem: itemlinked, itemType: iType, paymentmethod:pmtm, internalid:itemIid, item:itemPurchased, description:itemDescription, trandate:soDate, status:soStatus, tranid:soNumber, entity:custName, location:itemLocation, vendorname:vendor2, quantity:qtyorder, quantityshiprecv:qtyfulfill, formulanumeric:qtyBackOrd, lastpurchaseprice:lastPurchase, formulacurrency:saleAmt};
	        		val2++;
	        	}
	        }
		}
	}
	
	if(setVersion == 'a'){
		ObjSort(data1, 'item', 'description');
		ObjSort(data2, 'item', 'description');
	}
	else if(setVersion == 'b'){
		ObjSort(data1, 'paymentmethod', 'item');
		ObjSort(data2, 'paymentmethod', 'item');
	}
	else if(setVersion == 'c'){
		ObjSort(data1, 'vendorname', 'item');
		ObjSort(data2, 'vendorname', 'item');
	}
	
	logx('Back Ordered Report- Payment Method results: ', allResultsPM.length);
}


// Log execution
function logx(name, value)
{	
	var context        = nlapiGetContext();
	var usageRemaining = context.getRemainingUsage();
	nlapiLogExecution ('DEBUG', name + ' | ' + usageRemaining, value);
}
var dateFormat = function () {
    var    token = /d{1,4}|m{1,4}|yy(?:yy)?|([HhMsTt])\1?|[LloSZ]|"[^"]*"|'[^']*'/g,
        timezone = /\b(?:[PMCEA][SDP]T|(?:Pacific|Mountain|Central|Eastern|Atlantic) (?:Standard|Daylight|Prevailing) Time|(?:GMT|UTC)(?:[-+]\d{4})?)\b/g,
        timezoneClip = /[^-+\dA-Z]/g,
        pad = function (val, len) {
            val = String(val);
            len = len || 2;
            while (val.length < len) val = "0" + val;
            return val;
        };

    // Regexes and supporting functions are cached through closure
    return function (date, mask, utc) {
        var dF = dateFormat;

        // You can't provide utc if you skip other args (use the "UTC:" mask prefix)
        if (arguments.length == 1 && Object.prototype.toString.call(date) == "[object String]" && !/\d/.test(date)) {
            mask = date;
            date = undefined;
        }

        // Passing date through Date applies Date.parse, if necessary
        date = date ? new Date(date) : new Date;
        if (isNaN(date)) throw SyntaxError("invalid date");

        mask = String(dF.masks[mask] || mask || dF.masks["default"]);

        // Allow setting the utc argument via the mask
        if (mask.slice(0, 4) == "UTC:") {
            mask = mask.slice(4);
            utc = true;
        }

        var    _ = utc ? "getUTC" : "get",
            d = date[_ + "Date"](),
            D = date[_ + "Day"](),
            m = date[_ + "Month"](),
            y = date[_ + "FullYear"](),
            H = date[_ + "Hours"](),
            M = date[_ + "Minutes"](),
            s = date[_ + "Seconds"](),
            L = date[_ + "Milliseconds"](),
            o = utc ? 0 : date.getTimezoneOffset(),
            flags = {
                d:    d,
                dd:   pad(d),
                ddd:  dF.i18n.dayNames[D],
                dddd: dF.i18n.dayNames[D + 7],
                m:    m + 1,
                mm:   pad(m + 1),
                mmm:  dF.i18n.monthNames[m],
                mmmm: dF.i18n.monthNames[m + 12],
                yy:   String(y).slice(2),
                yyyy: y,
                h:    H % 12 || 12,
                hh:   pad(H % 12 || 12),
                H:    H,
                HH:   pad(H),
                M:    M,
                MM:   pad(M),
                s:    s,
                ss:   pad(s),
                l:    pad(L, 3),
                L:    pad(L > 99 ? Math.round(L / 10) : L),
                t:    H < 12 ? "a"  : "p",
                tt:   H < 12 ? "am" : "pm",
                T:    H < 12 ? "A"  : "P",
                TT:   H < 12 ? "AM" : "PM",
                Z:    utc ? "UTC" : (String(date).match(timezone) || [""]).pop().replace(timezoneClip, ""),
                o:    (o > 0 ? "-" : "+") + pad(Math.floor(Math.abs(o) / 60) * 100 + Math.abs(o) % 60, 4),
                S:    ["th", "st", "nd", "rd"][d % 10 > 3 ? 0 : (d % 100 - d % 10 != 10) * d % 10]
            };

        return mask.replace(token, function ($0) {
            return $0 in flags ? flags[$0] : $0.slice(1, $0.length - 1);
        });
    };
}();

// Some common format strings
dateFormat.masks = {
    "default":      "ddd mmm dd yyyy HH:MM:ss",
    shortDate:      "m/d/yy",
    mediumDate:     "mmm d, yyyy",
    longDate:       "mmmm d, yyyy",
    fullDate:       "dddd, mmmm d, yyyy",
    shortTime:      "h:MM TT",
    mediumTime:     "h:MM:ss TT",
    longTime:       "h:MM:ss TT Z",
    isoDate:        "yyyy-mm-dd",
    isoTime:        "HH:MM:ss",
    isoDateTime:    "yyyy-mm-dd'T'HH:MM:ss",
    isoUtcDateTime: "UTC:yyyy-mm-dd'T'HH:MM:ss'Z'"
};

// Internationalization strings
dateFormat.i18n = {
    dayNames: [
        "Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat",
        "Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"
    ],
    monthNames: [
        "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
        "January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"
    ]
};

// For convenience...
Date.prototype.format = function (mask, utc) {
    return dateFormat(this, mask, utc);
};
function numberWithCommas(x)
{
    var parts = x.toString().split(".");
    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    return parts.join(".");
}
function trim(arr)
{
var i,
len=arr.length,
out=[],
obj={};

for (i=0;i<len;i++) 
{
	obj[arr[i]]=0;
}
for (i in obj) 
{
	out.push(i);
}

return out;
}

/*-------------------------------------------------------------------------------------------------
Function: ObjSort()
Purpose:  Sort object of arrays by multiple keys
-------------------------------------------------------------------------------------------------*/
function ObjSort() 
{
var args = arguments,
array = args[0],
case_sensitive, keys_length, key, desc, a, b, i;

if (typeof arguments[arguments.length - 1] === 'boolean') 
{
	case_sensitive = arguments[arguments.length - 1];
	keys_length = arguments.length - 1;
} 
else 
{
	case_sensitive = false;
	keys_length = arguments.length;
}

return array.sort(function (obj1, obj2)
{
	for (i = 1; i < keys_length; i++)
	{
		key = args[i];
		if (typeof key !== 'string') 
		{
			desc = key[1];
			key = key[0];
			a = obj1[args[i][0]];
			b = obj2[args[i][0]];
		} 
		else
		{
			desc = false;
			a = obj1[args[i]];
			b = obj2[args[i]];
		}
		if (case_sensitive === false && typeof a === 'string')
		{
			a = a.toLowerCase();
			b = b.toLowerCase();
		}
		if (! desc)
		{
			if (a < b) return -1;
			if (a > b) return 1;
		} 
		else
		{
			if (a > b) return -1;
			if (a < b) return 1;
		}
	}
	return 0;
});
}
function isInArray(value, array) {
	  return array.indexOf(value) > -1;
}
