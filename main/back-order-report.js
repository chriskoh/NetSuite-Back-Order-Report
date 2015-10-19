function backorder(request, response) {

    if (request.getMethod() == 'GET') {

        function1();
    } else {

        function2();
    }
}

function function1() {
    var form = nlapiCreateForm('Back Order Report');
    form.addField('date_start', 'date', 'Start Date').setDefaultValue('1/1/2015');
    form.addField('date_end', 'date', 'End Date').setDefaultValue('8/26/2015');
    var select11 = form.addField('version', 'select', 'Sort Type: ', null, 'bookselect').setLayoutType('normal', 'startcol');
    select11.addSelectOption('', '');
    select11.addSelectOption('a', 'By Item');
    select11.addSelectOption('b', 'By Payment Method');
    select11.addSelectOption('c', 'By Vendor');

    form.addField('exkit', 'checkbox', 'Exclude Kit Package(s): ');

    form.addSubmitButton('Submit');
    response.writePage(form);
}

function function2() {
    var setVersion = request.getParameter('version'); // Import sort type (by item or by paymentmethod)
    var setStartDate = new Date(request.getParameter('date_start')); // Import start
    var setEndDate = new Date(request.getParameter('date_end')); // end
    var setkits = request.getParameter('exkit');

    // Search for Sales Order information (Not including Payment Method)
    var filters = new Array();
    filters[0] = new nlobjSearchFilter('type', null, 'is', 'SalesOrd');
    filters[1] = new nlobjSearchFilter('taxline', null, 'is', 'F');
    filters[2] = new nlobjSearchFilter('shipping', null, 'is', 'F');
    filters[3] = new nlobjSearchFilter('status', null, 'anyof', ['SalesOrd:D', 'SalesOrd:B']);
    filters[4] = new nlobjSearchFilter('subsidiary', null, 'is', '2');
    filters[5] = new nlobjSearchFilter('mainline', null, 'is', 'F');
    filters[6] = new nlobjSearchFilter('trandate', null, 'within', setStartDate, setEndDate);
    filters[7] = new nlobjSearchFilter('formulanumeric', null, 'greaterthan', '0').setFormula("{quantity}-nvl({quantitycommitted},0)-nvl({quantityshiprecv},0)");
    filters[8] = new nlobjSearchFilter('description', 'item', 'doesnotcontain', 'Renewal');

    var columns = new Array();
    columns[0] = new nlobjSearchColumn('internalid').setSort();
    columns[1] = new nlobjSearchColumn('line');
    columns[2] = new nlobjSearchColumn('item').setSort(); // getText  || Item Purchased
    columns[3] = new nlobjSearchColumn('description', 'item'); // getValue || Item Description
    columns[4] = new nlobjSearchColumn('trandate'); // getValue || Sales Order Date
    columns[5] = new nlobjSearchColumn('status'); // getText  || Sales Order Status
    columns[6] = new nlobjSearchColumn('tranid'); // getValue || Sales Order Number
    columns[7] = new nlobjSearchColumn('entity'); // getText  || Customer Name
    columns[8] = new nlobjSearchColumn('location'); // getText  || Item Location
    columns[9] = new nlobjSearchColumn('vendorname', 'item'); // getText  || Vendor
    columns[10] = new nlobjSearchColumn('quantity'); // getValue || Quantity Ordered
    columns[11] = new nlobjSearchColumn('quantityshiprecv'); // getValue || Quantity Fulfilled
    columns[12] = new nlobjSearchColumn('formulanumeric').setFormula("{quantity}-nvl({quantitycommitted},0)-nvl({quantityshiprecv},0)"); // getValue || Back Ordered
    columns[13] = new nlobjSearchColumn('lastpurchaseprice', 'item'); // getValue || Last Purchase Price
    columns[14] = new nlobjSearchColumn('formulacurrency').setFormula("{quantity}*{rate}"); // getValue || Sales Amount
    columns[15] = new nlobjSearchColumn('type', 'item'); // getText || Item Type
    columns[16] = new nlobjSearchColumn('custitem_linked_item', 'item'); // getValue || Linked item
    columns[17] = new nlobjSearchColumn('internalid', 'item'); // getValue || Item Internal ID
    columns[18] = new nlobjSearchColumn('othervendor', 'item'); // getText || Other vendor

    // Search results #0-999
    var results = nlapiSearchRecord('transaction', null, filters, columns);

    // Storage location for complete result set.
    var allResults = new Array();
    allResults = allResults.concat(results);

    // Search results #1000+
    while (results.length == 1000) {
        var lastId2 = results[999].getValue('internalid');
        var lastLine = results[999].getValue('line');

        filters[9] = new nlobjSearchFilter('internalidNumber', null, 'greaterthanorequalto', lastId2);

        var results = nlapiSearchRecord('transaction', null, filters, columns);

        for (var i = 0; i < results.length; i++) {

            var result = results[i];

            if (Number(result.getValue('internalid')) == Number(lastId2) && Number(result.getValue('line')) > Number(lastLine)) {

                allResults = allResults.concat(result);
            } else if (result.getValue('internalid') > lastId2) {

                allResults = allResults.concat(result);
            }
        }
    }

    // Create list of unique SO's to find payment method / create new array to be sorted
    var unsortSO = new Array();
    var unsortKIT = new Array();

    for (var x = 0; x < allResults.length; x++) {

        unsortSO = unsortSO.concat(allResults[x].getValue('internalid'));

        if (allResults[x].getText('type', 'item') == 'Kit/Package') {

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
    for (var c = 0; c < kitsearch.length; c++) {

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
    columns[2] = new nlobjSearchColumn('tranid'); // getValue || Sales Order Number
    columns[3] = new nlobjSearchColumn('amount'); // getValue || Amount
    columns[4] = new nlobjSearchColumn('paymentmethod'); // getText 	|| Payment method

    // Search results #0-999
    var results = nlapiSearchRecord('transaction', null, filters, columns);

    var allResultsPM = new Array();
    allResultsPM = allResultsPM.concat(results);

    // Search results #1000+
    while (results.length == 1000) {
        var lastId2 = results[999].getValue('internalid');
        var lastLine = results[999].getValue('line');

        filters[5] = new nlobjSearchFilter('internalidNumber', null, 'greaterthanorequalto', lastId2);

        var results = nlapiSearchRecord('transaction', null, filters, columns);

        for (var i = 0; i < results.length; i++) {

            var result = results[i];

            if (Number(result.getValue('internalid')) == Number(lastId2) && Number(result.getValue('line')) > Number(lastLine)) {

                allResultsPM = allResultsPM.concat(result);
            } else if (result.getValue('internalid') > lastId2) {

                allResultsPM = allResultsPM.concat(result);
            }
        }
    }

    // Create list of payment method search result's internal ID's
    var arPM = new Array();

    for (var x = 0; x < allResultsPM.length; x++) {

        arPM = arPM.concat(Number(allResultsPM[x].getValue('internalid')));
    }

    var data1 = new Array();
    var data2 = new Array();

    val1 = 0;
    val2 = 0;

    var testc = 0;

    for (var x = 0; x < allResults.length; x++) {

        if (setkits == 'T') {

            if (allResults[x].getText('type', 'item') != 'Kit/Package') {

                var kitarray = new Array();

                var itemIid = allResults[x].getValue('internalid');
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

                if (allResults[x].getText('type', 'item') == 'Kit/Package') {

                    for (var y = 0; y < kitsearch.length; y++) {

                        if (kitID == kitsearch[y].getValue('internalid')) {

                            if (kitsearch[y].getText('othervendor', 'memberitem') != '') {

                                var acheck = isInArray(kitsearch[y].getText('othervendor', 'memberitem'), kitarray);
                                if (acheck == true) {

                                    // skip if true
                                } else {

                                    kitarray = kitarray.concat(kitsearch[y].getText('othervendor', 'memberitem'));
                                    kitvendor += kitsearch[y].getText('othervendor', 'memberitem');
                                }

                            } else {

                                kitvendor += '(' + kitsearch[y].getText('memberitem') + ')';
                            }
                            kitvendor += ' / ';
                        }
                    }
                    vendor2 = kitvendor;
                }

                // Create a string of the first 3 letters of item number
                var toexclude = String(itemPurchased)[0] + String(itemPurchased)[1] + String(itemPurchased)[2];

                if (String(toexclude) != 'DPS') {

                    if (itemlinked == '') {
                        data1[val1] = {
                            kitinternalid: kitID,
                            linkeditem: itemlinked,
                            itemType: iType,
                            paymentmethod: pmtm,
                            internalid: itemIid,
                            item: itemPurchased,
                            description: itemDescription,
                            trandate: soDate,
                            status: soStatus,
                            tranid: soNumber,
                            entity: custName,
                            location: itemLocation,
                            vendorname: vendor2,
                            quantity: qtyorder,
                            quantityshiprecv: qtyfulfill,
                            formulanumeric: qtyBackOrd,
                            lastpurchaseprice: lastPurchase,
                            formulacurrency: saleAmt
                        };
                        val1++;
                    } else {
                        data2[val2] = {
                            kitinternalid: kitID,
                            linkeditem: itemlinked,
                            itemType: iType,
                            paymentmethod: pmtm,
                            internalid: itemIid,
                            item: itemPurchased,
                            description: itemDescription,
                            trandate: soDate,
                            status: soStatus,
                            tranid: soNumber,
                            entity: custName,
                            location: itemLocation,
                            vendorname: vendor2,
                            quantity: qtyorder,
                            quantityshiprecv: qtyfulfill,
                            formulanumeric: qtyBackOrd,
                            lastpurchaseprice: lastPurchase,
                            formulacurrency: saleAmt
                        };
                        val2++;
                    }

                }
            }
        } else {
            var kitarray = new Array();

            var itemIid = allResults[x].getValue('internalid');
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

            if (allResults[x].getText('type', 'item') == 'Kit/Package') {

                for (var y = 0; y < kitsearch.length; y++) {

                    if (kitID == kitsearch[y].getValue('internalid')) {

                        if (kitsearch[y].getText('othervendor', 'memberitem') != '') {

                            var acheck = isInArray(kitsearch[y].getText('othervendor', 'memberitem'), kitarray);
                            if (acheck == true) {

                            } else {

                                kitarray = kitarray.concat(kitsearch[y].getText('othervendor', 'memberitem'));
                                kitvendor += kitsearch[y].getText('othervendor', 'memberitem');
                            }

                        } else {

                            kitvendor += '(' + kitsearch[y].getText('memberitem') + ')';
                        }
                        kitvendor += ' / ';
                    }
                }
                vendor2 = kitvendor;
            }

            // Create a string of the first 3 letters of item number
            var toexclude = String(itemPurchased)[0] + String(itemPurchased)[1] + String(itemPurchased)[2];

            if (String(toexclude) != 'DPS') {

                if (itemlinked == '') {

                    data1[val1] = {
                        kitinternalid: kitID,
                        linkeditem: itemlinked,
                        itemType: iType,
                        paymentmethod: pmtm,
                        internalid: itemIid,
                        item: itemPurchased,
                        description: itemDescription,
                        trandate: soDate,
                        status: soStatus,
                        tranid: soNumber,
                        entity: custName,
                        location: itemLocation,
                        vendorname: vendor2,
                        quantity: qtyorder,
                        quantityshiprecv: qtyfulfill,
                        formulanumeric: qtyBackOrd,
                        lastpurchaseprice: lastPurchase,
                        formulacurrency: saleAmt
                    };
                    val1++;
                } else {

                    data2[val2] = {
                        kitinternalid: kitID,
                        linkeditem: itemlinked,
                        itemType: iType,
                        paymentmethod: pmtm,
                        internalid: itemIid,
                        item: itemPurchased,
                        description: itemDescription,
                        trandate: soDate,
                        status: soStatus,
                        tranid: soNumber,
                        entity: custName,
                        location: itemLocation,
                        vendorname: vendor2,
                        quantity: qtyorder,
                        quantityshiprecv: qtyfulfill,
                        formulanumeric: qtyBackOrd,
                        lastpurchaseprice: lastPurchase,
                        formulacurrency: saleAmt
                    };
                    val2++;
                }
            }
        }
    }

    if (setVersion == 'a') {
        ObjSort(data1, 'item', 'description');
        ObjSort(data2, 'item', 'description');
    } else if (setVersion == 'b') {
        ObjSort(data1, 'paymentmethod', 'item');
        ObjSort(data2, 'paymentmethod', 'item');
    } else if (setVersion == 'c') {
        ObjSort(data1, 'vendorname', 'item');
        ObjSort(data2, 'vendorname', 'item');
    }

    logx('Back Ordered Report- Payment Method results: ', allResultsPM.length);
}
