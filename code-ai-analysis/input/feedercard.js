//<%
var AutoTimer;

// ==================================================================================================
// functions to handle events
// ==================================================================================================
function RefreshFeederCard()
{
	UpdateFilterMenu(true);
	UpdatePreference();
	
	card_LoadJobHeader();
	
	GetFeederListData(gDivCodes, mFilterCode);
	if ('undefined' != typeof (mCardNo))
	{
		GetCardData(mCardNo, mArchFlag);
	}
	else
	{
		ShowCardArea("");
		ShowJobArea("Select a card to load jobs.");
	}
	
	if (perm_GetPrivilege(gPermString, kperm_ViewFMS) == kperm_FMS_AutoRefresh)
	{
		clearTimeout(AutoTimer);
		AutoTimer = setTimeout("RefreshFeederCard()", 300*1000);	// 5 minutes
	}
}

function UpdatePreference()
{	
	var oAll = pref_GetDivisions();
	
	var sDivs = "";
	var arDivs = gDivCodes.split(";");
	for (var i=0; i<arDivs.length; ++i)
	{
		if ("" != sDivs) sDivs += ",";
		sDivs += oAll[arDivs[i]];
	}	
	mDivNames = sDivs;
	DivID.innerHTML = mDivNames;
	
	if (kISOFilter == mFilterCode) 	// Active ISO
		FilterID.innerHTML = 'Active ISO';
	else
	{
		var oFilters = pref_GetFilters(kdb_App_FMS);	
		FilterID.innerHTML = oFilters[mFilterCode];	
	}
}
function GetFeederListData(divcodes, filter) {
	var iISO = -1, iFilter = -1;
	if (kISOFilter == filter) 	// Active ISO
		iISO = filter;
	else
		iFilter = filter;

	$.ajax({
		url: '../ws/database.asmx/GetActiveFeeders',
		data: { DivCode: divcodes, ISO: iISO, Filter: iFilter },
		dataType: 'json',
		method: 'post',

		beforeSend: function () {
			ShowFeederArea("Loading feeders...");
		},
		success: function (oReturn) {
			if (oReturn.STATUS.NUMBER != 0) {
				alert(oReturn.STATUS.DESCRIPTION);
				return;
			}
			mCardList = oReturn.DATA;
			card_LoadFeederList(mCardList);
			return;
		},
		error: function (xhr, status) {
			alert("Failed to show feeder list:\n" + status + '.' + xhr.responseText);
		},
		complete: function () {
		}
	});	
}

function GetCardData(iCard, fArch)
{
	CardPopup.style.display = "none";

	mCardNo = iCard;
	mArchFlag = fArch;
	UpdateFilterMenu(true);

	$.ajax({
		url: '../ws/fms/feedercard.asmx/LoadCard',
		data: { Card: iCard, Archived: fArch },
		dataType: 'json',
		method: 'post',

		beforeSend: function () {
			window.document.body.style.cursor = 'wait';
			ShowCardArea("Loading card...");
			NoteID.innerHTML = '<span class="Size3">Loading Card Note...</span>';
		},
		success: function (oReturn) {
			if (oReturn.STATUS.NUMBER != 0) {
				mCardData = util_kEmpty;
				ShowCardArea('Error: ' + oReturn.STATUS.DESCRIPTION);

				mJobList = util_kEmpty;
				mFiltered = mJobList;
				ShowJobArea('Error' + oReturn.STATUS.DESCRIPTION);
				return;
			}

			mCardData = oReturn.DATA.Card;
			mJobList = oReturn.DATA.JobList;

			mCardName = mCardData[kFeederName];
			mFeederNo = mCardData[kFeeder];
			card_LoadCardHeader(mCardData);

			mFiltered = mJobList;
			FilterJobs();
			card_LoadJob(mCardNo, mFiltered);
			setTimeout('fmt_SyncTableWidth("D", "H")', 100);
			if (-1 != mWarningJob) {
				card_SelectWarningJob(mWarningJob);
				mWarningJob = -1;
			}
			LastLoad.innerHTML = fmt_GetCurrentDateTime(dtkDefault);
			return;
		},
		error: function (xhr, status) {
			alert("Failed to load card:\n" + status + '.' + xhr.responseText);
		},
		complete: function () {
			window.document.body.style.cursor = 'default';
		}
	});
}
function HandleDivisionMenu(oMenuDiv)
{
	var oAll = pref_GetDivisions();
	var arInit = gDivCodes.split(";");
	var oInit = new Object();
	for (var i=0; i<arInit.length; ++i)
	{
		oInit[arInit[i]] = 1;
	}

	var oDivCtrl = div_CreateControl();
	oDivCtrl.Show(oAll, oInit, 1, oMenuDiv, util_kEmpty, util_kEmpty, Division_OnSelect);
}

function Division_OnSelect(oDivs)
{
	gDivCodes = "";
	for (var x in oDivs)
	{
		if( "" != gDivCodes) gDivCodes += ";";
		gDivCodes += x;
	}
	UpdatePreference();
	GetFeederListData(gDivCodes, mFilterCode);
}

function LoadFeedersByFilter(ifilter)
{
	mFilterCode = ifilter;
	UpdatePreference();
	GetFeederListData(gDivCodes, mFilterCode);
}
function DisplayClosedCards() {
	var oData = new Array('ShowDialog', {"CardName": mCardName});
	util_PutWinTxData('MainFrame', oData);		

	$('#MainFrame').attr('src', "dlgclosedcards.htm");
	var oDialog = $('#MainDialog').dialog('option', { 'width': 620, 'height': 620 }).dialog("open");
}
function card_LoadClosedCard(RetCard)
{
	if (RetCard != null) {
		mCardNo = RetCard;
		GetCardData(mCardNo, 1);
	}
}

function DisplayJobDetails()
{
	if(-1 == mJobNo)
	{
		alert("Please select a move first or simple double click a move for the details.");
		return;
	}
	card_DisplayJobDetails(mJobIdx, mCardNo, mJobNo);
}

function DisplayWorkPermit()
{
	if (!mCardNo)
	{
		alert("Please load an FMS card first.");
		return;
	}

	var oData = new Array('ShowDialog', {
		"App": "FMS",
		"CardNo": mCardNo,
		"CardName": mCardName,
		"ArchFlag": mArchFlag
	});
	util_PutWinTxData('MainFrame', oData);

	$('#MainFrame').attr('src', "../soa/dlgworkpermit.htm");
	$('#MainDialog').dialog('option', { 'width': 1150, 'height': 650 }).dialog("open");
}

function DisplayRegTag()
{
	if (!mCardNo) {
		alert("Please load an FMS card first.");
		return;
	}
	if (mArchFlag) {
		alert("Registered Tags are not available to closed cards.");
		return;
	}
	
	var oData = new Array('ShowDialog', {
		"Feeder": mFeederNo,
		"CardName": mCardName
	});
	util_PutWinTxData('MainFrame', oData);

	$('#MainFrame').attr('src', "dlgregtag.htm");
	$('#MainDialog').dialog('option', { 'width': 1050, 'height': 650 }).dialog("open");
}

function DisplayPhaseCheck()
{
	if (!mCardNo)
	{
		alert("Please load an FMS card first.");
		return;
	}	
	var oData = new Array('ShowDialog', {
		"CardNo" : mCardNo,
		"FeederNo": mFeederNo,
		"CardName": mCardName,
		"ArchFlag": mArchFlag
	});
	util_PutWinTxData('MainFrame', oData);
	
	$('#MainFrame').attr('src', "dlgphasecheck.htm");
	var oDialog = $('#MainDialog').dialog('option', { 'width': 905, 'height': 670 }).dialog("open");
}

function DisplayCardLog()
{
	if (!mCardNo) {
		alert("Please load an FMS card first.");
		return;
	}
	
	if (LogStatus.innerText == "") {
		alert("Feeder Log is empty.");
		return;
	}
		
	var oData = new Array('ShowDialog', {
		"App"	: "FMS",
		"CardNo" : mCardNo,
		"CardName" : mCardName,
		"ArchFlag" : mArchFlag
	});
	util_PutWinTxData('MainFrame', oData);

	$('#MainFrame').attr('src', "../soa/dlgcardlog.htm");
	var oDialog = $('#MainDialog').dialog('option', { 'width': 820, 'height': 620 }).dialog("open"); 
}

function DisplayOperatingHistory()
{
	if (!mCardNo)
	{
		alert("Please load an FMS card first.");
		return;
	}
	
	var oData = new Array('ShowDialog', {
		"App": "FMS",
		"Card": mCardNo,
		"CardName": mCardName,
		"ArchFlag": mArchFlag
	});
	util_PutWinTxData('MainFrame', oData);

	$('#MainFrame').attr('src', "../soa/dlgoperatinghist.htm");
	var oDialog = $('#MainDialog').dialog('option', { 'width': 1020, 'height': 660 }).dialog("open");	 
}

function DisplayMTALines() {
	if (!mCardNo) {
		alert("Please load an FMS card first.");
		return;
	}

	var oData = new Array('ShowDialog', {
		"Feeder": mFeederNo,
		"Card": mCardNo,
		"Name": mCardName,
		"ArchFlag": mArchFlag
	});
	util_PutWinTxData('MainFrame', oData);

	$('#MainFrame').attr('src', "dlgmtalines.htm");
	var oDialog = $('#MainDialog').dialog('option', { 'width': 1145, 'height': 840}).dialog("open");
}
function DisplayTxLog()
{
	if (!mCardNo) {
		alert("Please load an FMS card first.");
		return;
	}
	
	var oData = new Array('ShowDialog', {
		"DBName": document.getElementById("DBNameID").innerHTML,		// use one of the elements on page
		"App": "FMS",
		"CardNo": mCardNo,
		"CardName": mCardName,
		"ArchFlag": mArchFlag
	});
	util_PutWinTxData('MainFrame', oData);

	$('#MainFrame').attr('src', "../soa/dlgtxlog.aspx");
	$('#MainDialog').dialog('option', { 'width': 1140, 'height': 650 }).dialog("open");
}
function card_DisplayTxDetail(oLog) {
	var oData = new Array('ShowDialog', oLog);
	util_PutWinTxData('SubFrame', oData);

	$('#SubFrame').attr('src', "../soa/dlglogdetail.htm");
	$('#SubDialog').dialog('option', { 'width': 540, 'height': 510 }).dialog("open");
}
function card_DisplayTxFilter(oList) {
	if (null == oList) return;
	var oData = new Array('ShowDialog', oList);
	util_PutWinTxData('SubFrame', oData);

	$('#SubFrame').attr('src', "../soa/dlgtxfilters.htm");
	$('#SubDialog').dialog('option', { 'width': (("TLS" == oList['App']) ? 260 : 530), 'height': 440 }).dialog("open");
}
function card_ApplyTxFilter(oFilter) {
	var oData = new Array('ApplyFilter', oFilter);
	util_Send2Frame('MainFrame', oData);
}

function DisplayIncpJobs()
{
	if (!mCardNo)
	{
		alert("Please load an FMS card first.");
		return;
	}
	
	var oData = new Array('ShowDialog', {
		"DBName": document.getElementById('DBNameID').innerHTML,
		"App": "FMS",
		"CardNo": mCardNo,
		"CardName": mCardName,
		"ArchFlag": mArchFlag
	});
	util_PutWinTxData('MainFrame', oData);

	$('#MainFrame').attr('src', "../soa/dlgincompjobs.aspx");
	$('#MainDialog').dialog('option', { 'width': 1150, 'height': 650 }).dialog("open"); 
}

function DisplayOrderSummary()
{
	if (!mCardNo)
	{
		alert("Please load an FMS card first.");
		return;
	}	
	
	var oData = new Array('ShowDialog', {
		"CardNo": mCardNo,
		"CardName": mCardName,
		"ArchFlag": mArchFlag
	});
	util_PutWinTxData('MainFrame', oData);

	$('#MainFrame').attr('src', "dlgordersummary.htm");
	$('#MainDialog').dialog('option', { 'width': 900, 'height': 670 }).dialog("open");
}

function DisplayDelays()
{
	if (!mCardNo)
	{
		alert("Please load an FMS card first.");
		return;
	}
	$.ajax({
		url: '../ws/fms/feedercard.asmx/GetDelays',
		data: { Card: mCardNo, Archived: mArchFlag },
		dataType: 'json',
		method: 'post',

		beforeSend: function () {
			ShowDelayArea("Loading delays...");
			CardPopup.style.display = "block";
			window.document.body.style.cursor = "wait";
		},
		success: function (oReturn) {
			if (oReturn.STATUS.NUMBER != 0) {
				CardPopup.style.display = "none";
				mDelayData = util_kEmpty;
				alert(oReturn.STATUS.DESCRIPTION);
				return;
			}

			mDelayData = oReturn.DATA;
			card_LoadDelays(mDelayData);
		},
		error: function (xhr, status) {
			alert("Failed to show delays:\n" + status + '.' + xhr.responseText);
		},
		complete: function () {
			window.document.body.style.cursor = "default";
		}
	});	
}

function DisplayReportOptions() {
	var oCard = {"Application": "FMS", "CardList": mCardList, "ArchFlag": mArchFlag};
	if (mCardNo)	{
		oCard["CardNo"] = mCardNo;
		oCard["CardName"] = mCardName;
	}

	var oData = new Array('ShowDialog', oCard);
	util_PutWinTxData('MainFrame', oData);

	$('#MainFrame').attr('src', "../soa/dlgreportoption.htm");
	$('#MainDialog').dialog('option', { 'width': 360, 'height': 570 }).dialog("open");
}
function DisplayFaultCorrelation()
{
	if (!mCardNo) {
		alert("Please load an Active AUTO/CIOA FMS card first.");
		return;
	}

	if (1==mArchFlag || ("Auto" != mCardData[kCardClassName] && "Auto+" != mCardData[kCardClassName] && "CIOA" != mCardData[kCardClassName])){
		alert("Fault Correlation data is available only for active AUTO and CIOA cards");
		return;
	}
	var oData = new Array('ShowDialog', {
		"CardNo" : mCardNo,
		"CardName" : mCardName
	});
	util_PutWinTxData('MainFrame', oData);

	$('#MainFrame').attr('src', "dlgfaultcorrelation.htm");
	$('#MainDialog').dialog('option', { 'width': 675, 'height': 700 }).dialog("open");
}
function ToggleFilterOption()
{
	if (!mCardNo) {
		alert("No FMS card is currently loaded.");
		return;
	}
	mJobIdx = -1;
	mJobNo = -1;
	UpdateFilterMenu(mJobFilter);
	FilterJobs();
	
	// reload job list
	card_LoadJob(mCardNo, mFiltered);
	setTimeout('fmt_SyncTableWidth("D", "H")', 100);
	mWarningJob = -1;
}
function ShowFeederArea(strMsg)
{
	FeederListID.innerHTML = '<table id="FdrListTbl" class="TblLiteBdr" border=1 cellspacing=0 width=100% height=100%>' + 
			'<tr><td align=center class="Size2">' + (("" == strMsg)? "&nbsp;" : strMsg) + '</td></tr></table>';
}

function ShowCardArea(strMsg)
{
	CardStatusID.innerHTML = '<table id="CardTbl" class="TblLiteBdr" border=1 cellspacing=0 width=100% height=100%>' +
		   '<tr><td align=center class="Size2">' + (("" == strMsg) ? "&nbsp;" : strMsg) + '</td></tr></table>';
}
function ShowJobArea(strMsg)
{
	JobDataID.innerHTML = '<table id="JobDataTbl" class="TblLiteBdr" border=1 cellspacing=0 width=100% height=100%>' +
			'<tr><td align=center class="Size2">' + (("" == strMsg) ? "&nbsp;" : strMsg) + '</td></tr></table>';
}
function ShowDelayArea(strMsg)
{
	CardPopup.innerHTML = '<table id="DelayTbl" class="TblLiteBdr" border=1 cellspacing=0 width=100% height=100%>' +
			'<tr><td align=center class="Size2">' + (("" == strMsg) ? "&nbsp;" : strMsg) + '</td></tr></table>';
}

// ==================================================================================================
// functions to process card and job data
// ==================================================================================================
function card_LoadFeederList(oFdr)
{
	try
	{
		oFdr.sort(card_SortFeederName);
	}
	catch(e){}
	
	var HTML = new Array();

	HTML[HTML.length] = '<table id="FdrListTbl" class="TblLiteBdr" style="table-layout:fixed" Width="100%" border=1 cellPadding=1 cellSpacing=0>';
	HTML[HTML.length] = '<col width=70%>';
	HTML[HTML.length] = '<col width=30%>';
	for (var i=0; i< oFdr.length; ++i) {
		HTML[HTML.length] = '<tr height=20  onmouseover="this.style.cursor=\'hand\';" onmouseout="this.style.cursor=\'default\';" onclick="GetCardData(' + oFdr[i][kCard] + ', 0)">'; 
		HTML[HTML.length] = '<td class=Job Title="' + oFdr[i][kFeederName] + '">' + oFdr[i][kFeederName] + '</td>';
		HTML[HTML.length] = '<td class=Job>' + util_ReturnNBSP(oFdr[i][kFeederStatusName]) + '</td>';
		HTML[HTML.length] = '</tr>';
	}			
		
	if (oFdr.length <= 9) 
	{
		for( var i=1;  i <= 9 - oFdr.length; ++i)
		{
			HTML[HTML.length] = '<tr height=20><td align=left>&nbsp;</td><td align=left>&nbsp;</td></tr>';
		}
	}
	HTML[HTML.length] = '</table>';

	FeederListID.innerHTML = HTML.join('');
}

function card_SortFeederName(e1, e2)
{
	return (e1[kFeederName] > e2[kFeederName])? 1 : -1;
}

function card_LoadCardHeader(oCard)
{	
	var oFL = oCard.FL;

	var Col1Width = Math.floor(ksWRatio*130);
	var Col2Width = Math.floor(ksWRatio*70);
	var Col3Width = Math.floor(ksWRatio*70);
	var Col4Width = Math.floor(ksWRatio*130);
	var Col5Width = CardHeaderWidth - (Col1Width + Col2Width + Col3Width + Col4Width) - 16;

	var TVBogey = '';
	if (oCard[kValue1])
		TVBogey = ' class=Head_Reverse style="cursor:hand" title="' + oCard[kReason] + '"';
	else
		TVBogey = ' class=CardField';
	
	var HTML = new Array();

	HTML[HTML.length] = '<table id="CardTbl" class="TblLiteBdr Job" style="table-layout:fixed" border=1 paddingleft=2 paddingright=2 paddingtop=0 paddingbottom=0 cellSpacing=0>';
	HTML[HTML.length] = '<tr height=22>' + 
		    '<td align=center width=' + Col1Width + ' class=CardField onmouseover="this.style.cursor=\'hand\';" onmouseout="this.style.cursor=\'default\';" onclick="card_ExpandCardField()" id=txtCard>' + oCard[kFeederName] + '</td>' + 
		    '<td align=center width=' + Col2Width + ' class=CardField>' + oCard[kPosition] + '</td>' + 
		    '<td align=center width=' + Col3Width + TVBogey + '>' + oCard[kCardClassName] + '</td>' + 
		    '<td align=left colspan=2 class=CardField>' + oCard[kSubstationName] + '</td></tr>';
		    
	HTML[HTML.length] = '<tr height=20>' + 
		    '<td align=right>Cut Out:&nbsp;</td>' + 
		    '<td colspan=2>' + util_ReturnNBSP(fmt_DateTime(oCard[kCutout], dtkDefault)) + '</td>' + 
		    '<td colspan=2 id=txtAddr1>' + util_ReturnNBSP(oCard[kLoop1]) + '</td></tr>';
		    
	HTML[HTML.length] = '<tr height=20 class=Job>' + 
		    '<td align=right>Cut In:&nbsp;</td>' + 
		    '<td colspan=2>' + util_ReturnNBSP(fmt_DateTime(oCard[kCutin], dtkDefault)) + '</td>' + 
		    '<td colspan=2 id=txtAddr2>' + util_ReturnNBSP(oCard[kLoop2]) + '</td></tr>';
		    
	HTML[HTML.length] = '<tr height=20>' + 
		    '<td class=Ground align=right>Station Ground:&nbsp;</td>' + 
		    '<td colspan=2 class=Ground>' + oCard[kStationGround] + '</td>' + 
		    '<td colspan=2 id=txtAddr3>' + util_ReturnNBSP(oCard[kLoop3]) + '</td></tr>';
		    
	HTML[HTML.length] = '<tr height=20>' + 
		    '<td class=Ground align=right>Grounds:&nbsp;</td>' + 
		    '<td colspan=2 class=Ground>' + oCard[kGroundsOn] + '</td>' +
		    '<td colspan=2 id=txtAddr4>' + util_ReturnNBSP(oCard[kLoop4]) + '</td></tr>';
		    
	HTML[HTML.length] = '<tr height=20>' +
		    '<td class=DeadMove align=right>Dead Moves:&nbsp;</td>' +
		    '<td colspan=2 class=DeadMove >' + oCard[kDeadMoves] + '</td>' +
		    '<td colspan=2 id=txtAddr5>' + util_ReturnNBSP(oCard[kAssoc]) + '</td></tr>';
		  
	HTML[HTML.length] = '<tr height=20>' +
		    '<td class=TakeOut align=right>Taken Out:&nbsp;</td>' + 
		    '<td colspan=2 class=TakeOut>' + oCard[kDeadMovesTO] + '</td>' +
		    '<td width=' + Col4Width + ' align=right class=Job>Current <a href="javascript:DisplayDelays()"><span style="color:black">Delay</span></a>:&nbsp;</td>' + 
		    '<td width=' + Col5Width + ' class=Job>&nbsp;<a href="javascript:card_ShowCurrentDelay(true)"><span style="color:black">' + oCard[kCurrentDelayName] + '</span></a></td></tr>';
		
	HTML[HTML.length] = '<tr height=20>';
	if (oCard[kClosed])	{
		HTML[HTML.length] =	'<td align=right class=Job>Card Closed:&nbsp;</td>' + 
							'<td colspan=2 class=Job>' + util_ReturnNBSP(fmt_DateTime(oCard[kClosed], dtkDefault)) + '</td>';
	}
	else if (util_IsDefined(oCard["MTALines"]) || oCard[kISO].length > 0) {
		if (util_IsDefined(oCard["MTALines"]))
			HTML[HTML.length] = '<td align=center class=Job><a href="javascript:DisplayMTALines()"><span style="color:black">MTA Lines</span></a></td>';
		else
			HTML[HTML.length] = '<td class=GrayOut>&nbsp;</td>';

		if (oCard[kISO].length > 0 )
			HTML[HTML.length] = '<td colspan=2 class=Job><a href="javascript:card_ShowISOCards()"><span style="color:black">ISO Feeders</span></a></td>';
		else
			HTML[HTML.length] = '<td colspan=2 class=GrayOut>&nbsp;</td>';
	}
	else
	{
		HTML[HTML.length] = '<td colspan=3 align=right class=GrayOut>&nbsp;</td>';
	}
	HTML[HTML.length] = '<td width=' + Col4Width + ' align=right class=Job>Operating Step:&nbsp;</td>' + 
						'<td width=' + Col5Width + ' class=Job>' + util_ReturnNBSP(oCard[kCurrentStepName]) + '</td></tr>';
	    
	HTML[HTML.length] = '</table>';
	
	CardStatusID.innerHTML = HTML.join('');
	// for card header background color
	CardStatusID.className = (oCard[kTypeOfCard] == kdb_Card_4KV)? "FMS4KV" : "FMSCard";
	
	// expanded fields
	HTML = new Array();
	HTML[HTML.length] = '<table id="CardExpTbl" class="TblLiteBdr" border=1 paddingleft=2 paddingright=2 paddingtop=0 paddingbottom=0 cellSpacing=0 width="' + CardHeaderWidth + '"><tr height=23 onmouseover="this.style.cursor=\'hand\';">';
	for (var i=0; i< oFL.length; ++i) {
		HTML[HTML.length] = '<td id="FDR_' + i + '" onclick="card_ShowFeederDetail(' + i + ')" class=CardField align=center>' + oFL[i][kName] + '</td>' 
	}
	HTML[HTML.length] = '<td width=500 align=left onmouseover="this.style.cursor=\'hand\';" onclick="card_Hide3GFdrName()" class=CardHead><span class="Door">3</span></td></tr></table>';
	Exp3GFdr.innerHTML = HTML.join("");
	Exp3GFdr.style.visibility = "hidden";

	// set colors for feeders
	if (0 < oFL.length) {
		var fSD = false;
		for (var i = 0; i < oFL.length; ++i) {
			if (1 != oFL[i][kType]) fSD = true;

			var oCtrl = document.getElementById("FDR_" + i);
			if (1 == oFL[i][kPosition])
				oCtrl.className = "CardField FMSCard";
			else
				oCtrl.className = "CardField TOMSCard";		
		}
		txtCard.className = "CardField " + ((fSD)? "FMS4KV" : CardStatusID.className);	
	}
	else
		 txtCard.className = "CardField " + CardStatusID.className;	
		 	
	// update card notes
	NoteID.innerHTML = util_RestoreCrLf(oCard[kCardNote]);
	
	// update feeder log
	if ("EMPTY" == oCard[kLogStatus])
		LogStatus.innerHTML = 'Log: EMPTY';
	else
		LogStatus.innerHTML = '<a href="javascript:DisplayCardLog()">Log: ' + oCard[kLogStatus] + '</a>';

	btnFault.style.backgroundColor = util_IsDefined(oCard["FTC"])? "LightGreen" : "";
		
	// delay jobs
	mDelayShown = false;
}
function card_ExpandCardField()
{
	if (0 == mCardData.FL.length) return;
	var oFL = mCardData.FL;
	for (var i = 0; i < oFL.length; ++i) {
		var oCtrl = document.getElementById("FDR_" + i);
		if (oFL[i][kCard] == mCardNo && 2 == oFL[i][kType])
			oCtrl.className = "CardField " + CardStatusID.className;
		else if (2 == oFL[i][kType])
			oCtrl.className = "CardField TOMSCard";
	}

	Exp3GFdr.style.top = "-1px";
	if ('undefined' == typeof CardInfo.filters) {
		Exp3GFdr.style.visibility = "visible";
	}
	else {
		CardInfo.filters[0].Direction = "right";
		CardInfo.filters[0].Apply();
		Exp3GFdr.style.visibility = "visible";
		CardInfo.filters[0].Play();
	}
}
function card_Hide3GFdrName()
{
	if ('undefined' == typeof CardInfo.filters) {
		Exp3GFdr.style.visibility = "hidden";
	}
	else {
		CardInfo.filters[0].Direction = "left";
		CardInfo.filters[0].Apply();
		Exp3GFdr.style.visibility = "hidden";
		CardInfo.filters[0].Play();
	}
}
function card_ShowFeederDetail(idx) 
{
	var oFL = mCardData.FL;
	if (1 == oFL[idx][kType]) {
		for (var i = 0; i < oFL.length; ++i) {
			var oCtrl = document.getElementById("FDR_" + i);
			oCtrl.className = "CardField " + ((idx == i) ? "FMSCard" : "TOMSCard");
		}
		txtAddr1.innerHTML = util_ReturnNBSP(oFL[idx][kLoop1]);
		txtAddr2.innerHTML = util_ReturnNBSP(oFL[idx][kLoop2]);
		txtAddr3.innerHTML = util_ReturnNBSP(oFL[idx][kLoop3]);
		txtAddr4.innerHTML = util_ReturnNBSP(oFL[idx][kLoop4]);
		txtAddr5.innerHTML = util_ReturnNBSP(oFL[idx][kAssoc]);
		if (1 == oFL[idx][kPosition]) {
			txtAddr1.style.color = "black";
			txtAddr2.style.color = "black";
			txtAddr3.style.color = "black";
			txtAddr4.style.color = "black";
			txtAddr5.style.color = "black";
		}
		else {
			txtAddr1.style.color = "gray";
			txtAddr2.style.color = "gray";
			txtAddr3.style.color = "gray";
			txtAddr4.style.color = "gray";
			txtAddr5.style.color = "gray";
		}
	}
	else {
		if (oFL[idx][kCard] != mCardNo) GetCardData(oFL[idx][kCard], 0);	
	}
}
 
var TOIssueWidth = Math.floor(ksWRatio*90);
var TOCompWidth = Math.floor(ksWRatio*90);
var IDWidth = Math.floor(ksWRatio*25);
var TypeWidth = Math.floor(ksWRatio*100);
var EquipWidth = Math.floor(ksWRatio*76);
var GndWidth = Math.floor(ksWRatio*15);
var OriginWidth = Math.floor(ksWRatio*10);
var ResponseWidth = Math.floor(ksWRatio*120);
var RSIssueWidth = Math.floor(ksWRatio*90);
var RSCompWidth = Math.floor(ksWRatio*90);
	
var DataWidth = JobDataWidth - 17;
var MoveWidth = DataWidth - TOIssueWidth - TOCompWidth - IDWidth - TypeWidth - EquipWidth 
				- GndWidth - OriginWidth - ResponseWidth - RSIssueWidth - RSCompWidth - 2*12;

function card_LoadJobHeader()
{
	var HTML = new Array();
	HTML[HTML.length] = '<table id="JobHeaderTbl" class="TblLiteBdr TblTitle" align=left border=1 cellPadding=0 cellSpacing=0>';
	HTML[HTML.length] = '<tr>' + 
			'<td align="center" width="' + (TOIssueWidth + TOCompWidth + 2) + '">' + 
				'<table border=0 cellPadding=0 cellSpacing=0>' + 
				'<tr><td colspan="2" align="center" class=TblTitle>Take Out</td></tr>' +
				'<tr>' + 		
					'<td id=H1 align="center" class=TblTitle width="' + TOIssueWidth + '">Issued</td>' + 
					'<td id=H2 align="center" class=TblTitle width="' + TOCompWidth + '">Complete</td>' + 
				'</tr></table></td>';
			
	HTML[HTML.length] = '<td id=H3 align="center" valign="bottom" class=TblTitle width="' + IDWidth + '">ID</td>'+
		    '<td id=H4 align="center" valign="bottom" class=TblTitle width="' + TypeWidth + '">Type</td>'+
		    '<td id=H5 align="center" valign="bottom" class=TblTitle width="' + EquipWidth + '">Equipment</td>'+
		    '<td id=H6 align="center" valign="bottom" class=TblTitle width="' + GndWidth + '">G</td>'+
		    '<td id=H7 align="center" valign="bottom" class=TblTitle width="' + MoveWidth + '">Move</td>'+
		    '<td id=H8 align="center" valign="bottom" class=TblTitle width="' + OriginWidth + '">&nbsp;</td>'+
		    '<td id=H9 align="center" valign="bottom" class=TblTitle width="' + ResponseWidth + '">Response</td>'
		    
	HTML[HTML.length] = '<td align="center" width="' + (RSIssueWidth + RSCompWidth + 2) + '">'+
				'<table border=0 cellPadding=0 cellSpacing=0>'+
				'<tr><td colspan="2" align="center" class=TblTitle>Restore</td></tr>' +
				'<tr>' +		
					'<td id=H10 align="center" class=TblTitle width="' + RSIssueWidth + '">Issued</td>' +
					'<td id=H11 align="center" class=TblTitle width="' + RSCompWidth + '">Complete</td>' +
				'</tr></table></td>';
	HTML[HTML.length] = '</tr></table>';

	JobHeader.innerHTML = HTML.join('');
}

function card_LoadJob(cardno, oJob)
{
	// ------------- job moves ---------------------
	var HTML = new Array();

	HTML[HTML.length] = '<table id="JobDataTbl" class="TblLiteBdr FMSCard" align=left border=1 cellPadding=0 cellSpacing=0 width="' + DataWidth + '">';
	HTML[HTML.length] = '<tr height="1">' + 
			'<td id=D1 align="center" width="' + TOIssueWidth + '"></td>'+
			'<td id=D2 align="center" width="' + TOCompWidth + '"></td>'+
			'<td id=D3 align="center" width="' + IDWidth + '"></td>'+
			'<td id=D4 align="center" width="' + TypeWidth + '"></td>'+
			'<td id=D5 align="center" width="' + EquipWidth + '"></td>'+
			'<td id=D6 align="center" width="' + GndWidth + '"></td>'+
			'<td id=D7 align="center" width="' + MoveWidth + '"></td>'+
			'<td id=D8 align="center" width="' + OriginWidth + '"></td>'+
			'<td id=D9 align="center" width="' + ResponseWidth + '"></td>'+
			'<td id=D10 align="center" width="' + RSIssueWidth + '"></td>'+
			'<td id=D11 align="center" width="' + RSCompWidth + '"></td>'+
			'</tr>';

	for(var i=0; i< oJob.length; ++i)
	{	
		HTML[HTML.length] = '<tr class=Job height=20>';
		
		var TimeStyle;
		if (oJob[i][kMoveOrigin] == 'N')
		{
			HTML[HTML.length] = '<td class=GrayOut>' + util_ReturnNBSP(fmt_DateTime(oJob[i][kTOIssued], dtkDefault)) + '</td>';
			HTML[HTML.length] = '<td class=GrayOut>' + util_ReturnNBSP(fmt_DateTime(oJob[i][kTOComplete], dtkDefault)) + '</td>';
		}
		else
		{
			if (oJob[i][kTOIssued] == '')
			{
				HTML[HTML.length] = '<td class=GrayOut>&nbsp;</td>';
			}
			else
			{
				TimeStyle =  (0 == oJob[i][kTOIssuedBG]) ? '' : 'background-color:' + db_GetMappedColor(oJob[i][kTOIssuedBG]) + ';';
				TimeStyle += (0 == oJob[i][kTOIssuedFG]) ? '' : 'color:' + db_GetMappedColor(oJob[i][kTOIssuedFG]) + ';';
				TimeStyle = ('' == TimeStyle)? '' : 'style="' + TimeStyle + '"';
				HTML[HTML.length] = '<td class=Job ' + TimeStyle + ' align=left>' + util_ReturnNBSP(fmt_DateTime(oJob[i][kTOIssued], dtkDefault)) + '</td>';
			}
			
			if (oJob[i][kTOComplete] == '')
			{
				HTML[HTML.length] = '<td class=GrayOut>&nbsp;</td>';
			}
			else
			{
				TimeStyle =  (0 == oJob[i][kTOCompleteBG]) ? '' : 'background-color:' + db_GetMappedColor(oJob[i][kTOCompleteBG]) + ';';
				TimeStyle += (0 == oJob[i][kTOCompleteFG]) ? '' : 'color:' + db_GetMappedColor(oJob[i][kTOCompleteFG]) + ';';
				TimeStyle = ('' == TimeStyle)? '' : 'style="' + TimeStyle + '"';
				HTML[HTML.length] = '<td class=Job ' + TimeStyle + ' align=left>' + util_ReturnNBSP(fmt_DateTime(oJob[i][kTOComplete], dtkDefault)) + '</td>';
			}
		}
		
		HTML[HTML.length] = '<td class=Job align=center>' + util_ReturnNBSP(oJob[i][kPrintID]) + '</td>';
		HTML[HTML.length] = '<td class=Job align=left>' + util_ReturnNBSP(oJob[i][kEquipClassName]) + '</td>';
		HTML[HTML.length] = '<td class=Job align=left>' + util_ReturnNBSP(oJob[i][kEquipName]) + '</td>';
		
		var strMoveID = 'MID' + i;
		var strGClass = 'class=Job';
		var strMoveClass = 'align=left class=Job';
		var strPopup = 'onclick="javascript:card_SelectJob('+ i + ')" ' + 
					   'ondblclick="javascript:card_DisplayJobDetails('+ i +',' + cardno + ',' + oJob[i][kJob] + ')" ' +
					   'onmouseover="this.style.cursor = \'hand\';" onmouseout="this.style.cursor = \'default\';" ';
		
		if (card_IsStepHeading(oJob[i]))
		{
			strMoveClass = 'align=center class=StepHead';
			strPopup = '';
		}
		else if (oJob[i][kMoveType] == 'Dead')
		{
			strMoveClass = 'align=left class=DeadMove';
		}
		else if (("undefined" != typeof(oJob[i][kG]) && 0 < oJob[i][kG]) && "undefined" != typeof(oJob[i][kGroundsOn]))
		{
			strGClass = 'class=Ground';
			strMoveClass = 'align=left class=Ground';
		}
		HTML[HTML.length] = '<td align=center ' + strGClass + '>' + util_ReturnNBSP(oJob[i][kG]) + '</td>';
		HTML[HTML.length] = '<td id="'+ strMoveID + '" ' + strMoveClass + ' ' + strPopup + '>&nbsp;' + util_ReturnNBSP(oJob[i][kTOMove]) + '</td>';
		
		if (oJob[i][kPhaseCheckColor] == kdb_CC_RED) 
		{
			HTML[HTML.length] = '<td align=center class=PhaseCheck>' + util_ReturnNBSP(oJob[i][kMoveOrigin]) + '</td>';
		}
		else if (oJob[i][kPhaseCheckColor] == kdb_CC_PALE_RED) 
		{
			HTML[HTML.length] = '<td align=center class=AltPhaseCheck>' + util_ReturnNBSP(oJob[i][kMoveOrigin]) + '</td>';
		}
      else if (oJob[i][kMoveOrigin] == 'N')
	   {
   		HTML[HTML.length] = '<td class=GrayOut>N</td>';
      }
		else
		{
			var strShare = '';
			var sOrigin = '';
			if ("S" == oJob[i][kMoveOrigin])
			{
				if (0 == mArchFlag)
				{
					strShare = 'onclick="javascript:card_ShareJob('+ i + ')" ' + 
						   'onmouseover="this.style.cursor = \'hand\';" onmouseout="this.style.cursor = \'default\';" ';
					sOrigin = oJob[i][kMoveOrigin];
				}
			}
			else
			{
				sOrigin = oJob[i][kMoveOrigin];
			}

			HTML[HTML.length] = '<td class=Job align=center ' + strShare + '>' + util_ReturnNBSP(sOrigin) + '</td>';
		}
		HTML[HTML.length] = '<td class=Job align=left>' + util_ReturnNBSP(oJob[i][kResponse]) + '</td>';

		if (oJob[i][kMoveOrigin] == 'N')
		{
			HTML[HTML.length] = '<td class=GrayOut>' + util_ReturnNBSP(fmt_DateTime(oJob[i][kRSIssued], dtkDefault)) + '</td>';
			HTML[HTML.length] = '<td class=GrayOut>' + util_ReturnNBSP(fmt_DateTime(oJob[i][kRSComplete], dtkDefault)) + '</td>';
		}
		else
		{
			if (oJob[i][kRSIssued] == '')
			{
				HTML[HTML.length] = '<td class=GrayOut>&nbsp;</td>';
			}
			else
			{
				TimeStyle =  (0 == oJob[i][kRSIssuedBG]) ? '' : 'background-color:' + db_GetMappedColor(oJob[i][kRSIssuedBG]) + ';';
				TimeStyle += (0 == oJob[i][kRSIssuedFG]) ? '' : 'color:' + db_GetMappedColor(oJob[i][kRSIssuedFG]) + ';';
				TimeStyle = ('' == TimeStyle)? '' : 'style="' + TimeStyle + '"';
				HTML[HTML.length] = '<td class=Job ' + TimeStyle + ' align=left>' + util_ReturnNBSP(fmt_DateTime(oJob[i][kRSIssued], dtkDefault)) + '</td>';
			}
			if (oJob[i][kRSComplete] == '')
			{
				HTML[HTML.length] = '<td class=GrayOut>&nbsp;</td>';
			}
			else
			{
				TimeStyle =  (0 == oJob[i][kRSCompleteBG]) ? '' : 'background-color:' + db_GetMappedColor(oJob[i][kRSCompleteBG]) + ';';
				TimeStyle += (0 == oJob[i][kRSCompleteFG]) ? '' : 'color:' + db_GetMappedColor(oJob[i][kRSCompleteFG]) + ';';
				TimeStyle = ('' == TimeStyle)? '' : 'style="' + TimeStyle + '"';
				HTML[HTML.length] = '<td class=Job ' + TimeStyle + ' align=left>' + util_ReturnNBSP(fmt_DateTime(oJob[i][kRSComplete], dtkDefault)) + '</td>';
			}
		}
		HTML[HTML.length] = '</tr>';
	}
	
	// fill up space
	var nRows = (ksWRatio == 1)? 29 : 17;
	if (nRows > oJob.length)
	{
		for(var i=0; i< nRows - oJob.length; ++i)
		{	
			HTML[HTML.length] = '<tr height=20>';
			HTML[HTML.length] = '<td align="center" >&nbsp;</td>';
			HTML[HTML.length] = '<td align="center" >&nbsp;</td>';
			HTML[HTML.length] = '<td align="center" >&nbsp;</td>';
			HTML[HTML.length] = '<td align="center" >&nbsp;</td>';
			HTML[HTML.length] = '<td align="center" >&nbsp;</td>';
			HTML[HTML.length] = '<td align="center" >&nbsp;</td>';
			HTML[HTML.length] = '<td align="center" >&nbsp;</td>';
			HTML[HTML.length] = '<td align="center" >&nbsp;</td>';
			HTML[HTML.length] = '<td align="center" >&nbsp;</td>';
			HTML[HTML.length] = '<td align="center" >&nbsp;</td>';
			HTML[HTML.length] = '<td align="center" >&nbsp;</td>';
			HTML[HTML.length] = '</tr>';
		}
	}		

	HTML[HTML.length] = '</table>';

	JobDataID.innerHTML = HTML.join('');
	
	// reset
	mJobIdx = -1;
	mJobNo = -1;
}

function card_IsStepHeading(oJobRow)
{
	return ((oJobRow[kFGColor] == 8 && oJobRow[kJobClass] == 0)? true : false);
}

function card_SelectJob(idx)
{
	if (mDelayShown) card_ShowCurrentDelay(false);
	
	if (-1 != mJobNo)
	{
		var oOldRow = window.document.getElementById("MID" + mJobIdx);
		oOldRow.className = card_GetJobCSSClass(mJobIdx);
	}
	
	if (idx == mJobIdx || -1 == idx)
	{
		mJobIdx = -1;
		mJobNo = -1;
	}
	else
	{
		// highlight the row	
		var oNewRow = window.document.getElementById("MID" + idx);
		oNewRow.className = "HiLite";
	
		mJobIdx = idx;
		mJobNo = mFiltered[mJobIdx][kJob];	
	}
}

function card_GetJobCSSClass(i)
{
	var oJob = mFiltered;

	var strMoveClass = 'Job';
	
	if (card_IsStepHeading(oJob[i]))
	{
		strMoveClass = 'StepHead';
	}
	else if (oJob[i][kMoveType] == 'Dead')
	{
		strMoveClass = 'DeadMove';
	}
	else if (("undefined" != typeof(oJob[i][kG]) && 0 < oJob[i][kG]) && "undefined" != typeof(oJob[i][kGroundsOn]))
	{
		strMoveClass = 'Ground';
	}
	return strMoveClass;
}

function card_DisplayJobDetails(i, cardno, jobid)
{
	card_SelectJob(i);

	var oData = new Array('ShowDialog', {
		"AppName": "FMS",
		"CardNo": cardno,
		"JobID": jobid,
		"ArchFlag": mArchFlag,
		"PermString": gPermString
	});
	util_PutWinTxData('MainFrame', oData); // document.getElementById("MainFrame")

	$('#MainFrame').attr('src', "../soa/dlgjobdetail.htm");
	$('#MainDialog').dialog('option', { 'width': 550, 'height': 700 }).dialog("open");
}
function card_DisplayRules(oJob) {

	var oData = new Array('ShowDialog', oJob);
	util_PutWinTxData('SubFrame', oData);

	$('#SubFrame').attr('src', "../soa/dlgjobrules.htm");
	$('#SubDialog').dialog('option', { 'width': 920, 'height': 420 }).dialog("open");
}
function card_ShowCurrentDelay(fShow)
{
	card_ShowDelay(fShow, mCardData[kDelayLink]);	
}

function card_ShowDelay(fShow, sLinks)
{
	mDelayShown = fShow;
	
	var oJob = mFiltered;
	if (!fShow)
	{
		for(var i=0; i< oJob.length; ++i)
		{
			var oRow = window.document.getElementById("MID" + i);
			if ("DelayHiLite" == oRow.className) oRow.className = card_GetJobCSSClass(i);
		}
	}
	else
	{
		var oDlyJobs = sLinks.split(";");
		if (0 == oDlyJobs.length) return;
	
		for(var j=0; j< oDlyJobs.length-1; ++j)
		{
			for(var i=0; i< oJob.length; ++i)
			{
				if (oJob[i][kJob] == oDlyJobs[j])
				{
					break;
				}
			}
			
			if (i< oJob.length)		// found
			{
				// highlight the row	
				var oRow = window.document.getElementById("MID" + i);
				oRow.className = (fShow)? "DelayHiLite" : card_GetJobCSSClass(i);
			}
		}
	}
}

function card_LoadDelays(oDList)
{
	var HTML = new Array();
	var DataWidth = DelayWidth - 17;
	
	var DurationWidth = Math.floor(ksWRatio*72);
	var StartWidth = Math.floor(ksWRatio*120);
	var EndWidth = Math.floor(ksWRatio*120);
	
	// header
	var NameWidth = DataWidth - DurationWidth - EndWidth - StartWidth - 2*5;
	
   HTML[HTML.length] = '<div Style="display:block; position:absolute; left:0px; top:0px; height:20px; width:' + DelayWidth + 'px; z-index:0">';
   HTML[HTML.length] = '<table id="DelayHdrTbl"  class="TblLiteBdr TblTitle" align=left border=1 cellPadding=0 cellSpacing=0 width=' + DataWidth + '>';
	HTML[HTML.length] = '<tr>';
	HTML[HTML.length] = '<td align="center" width="' + DurationWidth + '">Duration</td>';
	HTML[HTML.length] = '<td align="center" width="' + NameWidth + '">Name</td>';
	HTML[HTML.length] = '<td align="center" width="' + StartWidth + '">Start</td>';
	HTML[HTML.length] = '<td align="center" width="' + EndWidth + '">End</td>';
	HTML[HTML.length] = '</tr></table>';
	HTML[HTML.length] = '</div>';
	
	// list of delays
	HTML[HTML.length] = '<div Style="display:block; position:absolute; left:0px; top:18px; overflow:auto; height:122px; width:' + DelayWidth + 'px; z-index:0">';
	HTML[HTML.length] = '<table id="DelayDataTbl"  class="TblLiteBdr Job" style="table-layout:fixed" border=1 cellPadding=1 cellSpacing=0 width=' + DataWidth + '>';
	HTML[HTML.length] = '<col width=' + (DurationWidth +2)+ '>';
	HTML[HTML.length] = '<col width=' + (NameWidth +2)+ '>';
	HTML[HTML.length] = '<col width=' + (StartWidth +2)+ '>';
	HTML[HTML.length] = '<col width=' + (EndWidth +2)+ '>';

	for (var i=0; i<oDList.length; ++i)
	{
		HTML[HTML.length] = '<tr id="DLY'+ i + '" height=20 onclick="card_DelayMoves(' + i + ')" ' + 
							'onmouseover="this.style.cursor = \'hand\';" onmouseout="this.style.cursor = \'default\';">'; 
		HTML[HTML.length] = '<td align=center>' + oDList[i][kchar_Duration] + '</td>';
		HTML[HTML.length] = '<td align=left>' + oDList[i][kDelayName] + '</td>';
		HTML[HTML.length] = '<td align=left>' + util_ReturnNBSP(fmt_DateTime(oDList[i][kStart], dtkDefault)) + '</td>';
		HTML[HTML.length] = '<td align=left>' + util_ReturnNBSP(fmt_DateTime(oDList[i][kEnd], dtkDefault)) + '</td>';
		HTML[HTML.length] = '</tr>';
	}			
	
	if (7 > oDList.length)
	{	
		for (var i=0; i<7 - oDList.length; ++i)
		{
			HTML[HTML.length] = '<tr height=20>';
			for(var k=0; k<4; ++k)
			{
				HTML[HTML.length] = '<td>&nbsp;</td>';
			}
			HTML[HTML.length] = '</tr>'; 
		}	
	}
	HTML[HTML.length] = '</table>';
	HTML[HTML.length] = '</div>';
	
	// close button	
	HTML[HTML.length] = '<input id=btncancel type=button value="Close Delays" onclick="btnCancel_Click()" Style="display:block; position:absolute; left:' + (DelayWidth+10) + 'px;top:113px;">';
	
	CardPopup.innerHTML = HTML.join("");
}

function card_ShowISOCards()
{
	var oISOList = mCardData[kISO];

	var HTML = new Array();

	var DataWidth = 134;
		
	// header
	var NameWidth = DataWidth - 2*2;
		
   HTML[HTML.length] = '<div Style="display:block; position:absolute; left:0px; top:0px; height:20px; width:' + DataWidth + 'px; z-index:0">';
   HTML[HTML.length] = '<table  class="TblLiteBdr TblTitle" align=left border=1 cellPadding=0 cellSpacing=0 width=' + DataWidth + '>';
	HTML[HTML.length] = '<tr>';
	HTML[HTML.length] = '<td align="center" width="' + NameWidth + '">ISO Feeder</td>';
	HTML[HTML.length] = '</tr></table>';
	HTML[HTML.length] = '</div>';

	// list of iso cards	
	HTML[HTML.length] = '<div Style="display:block; position:absolute; left:0px; top:18px; overflow:auto; height:122px; width:' + (DataWidth+16) + 'px; z-index:0">';
	HTML[HTML.length] = '<table  class="TblLiteBdr Job" style="table-layout:fixed" border=1 cellPadding=1 cellSpacing=0 width=' + DataWidth + '>';
	HTML[HTML.length] = '<col width=' + (NameWidth +2)+ '>';
   
	for (var i=0; i< oISOList.length; ++i)
	{
		HTML[HTML.length] = '<tr height=20  onmouseover="this.style.cursor=\'hand\';" onmouseout="this.style.cursor=\'default\';" onclick="card_LoadISOCard(' + oISOList[i][kCard] + ')">'; 
		HTML[HTML.length] = '<td class=Job><u>' + oISOList[i][kFeederName] + '</u></td>';
		HTML[HTML.length] = '</tr>';
	}			
	
	if (6 > oISOList.length)
	{	
		for (var i=0; i<6 - oISOList.length; ++i)
		{
			HTML[HTML.length] = '<tr height=20>';
			HTML[HTML.length] = '<td>&nbsp;</td>';
			HTML[HTML.length] = '</tr>'; 
		}	
	}
	HTML[HTML.length] = '</table>';
	HTML[HTML.length] = '</div>';
	
	// close button
	HTML[HTML.length] = '<input id=btncancel type=button value="Close" onclick="btnCancel_Click()" Style="display:block; position:absolute; left:' + (DataWidth+16+10) + 'px;top:113px;">';
	
	CardPopup.innerHTML = HTML.join("");

	CardPopup.style.display = "block";
}

function btnCancel_Click()
{
	CardPopup.style.display = "none";
}

function card_LoadISOCard(iCard)
{
	GetCardData(iCard,0);
}

function card_DelayMoves(idx)
{
	// hightlight the selected delay
	var oRow;
	for (var i=0; i< mDelayData.length; ++i)
	{
		oRow = window.document.getElementById("DLY" + i);
		oRow.className = (i == idx)? "HiLite" : "";
	}	
	
	// reset previous delay moves
	if (mDelayShown) card_ShowDelay(false);
	
	// highlight the moves
	card_ShowDelay(true, mDelayData[idx][kDelayLink]);
}

function card_ShareJob(i)
{
	var oData = new Array('ShowDialog', {"COMMONJOB": mFiltered[i][kJob]});
	util_PutWinTxData('MainFrame', oData);

	$('#MainFrame').attr('src', "../soa/dlgcommoncards.htm");
	$('#MainDialog').dialog('option', { 'width': 320, 'height': 330 }).dialog("open");
}
function card_ShowShareCard(oRet)
{
	if (null != oRet)
	{
		switch(oRet[kApplication])
		{
			case "FMS":
				window.location = '../fms/feedercard.aspx?card=' + oRet[kCard];
				break;
			case "SLC":
				if (perm_GetPrivilege(gPermString, kperm_ViewTOMS) >= kperm_TOMS_View)
					window.location = '../toms/slccard.aspx?card=' + oRet[kCard];
				else
					alert("You don't have access permission to TOMS Online. Please contact the FMS administrator.");
				break;
			case "TFMS":
				if (perm_GetPrivilege(gPermString, kperm_ViewTOMS) >= kperm_TOMS_View)
					window.location = '../toms/tfmscard.aspx?card=' + oRet[kCard];
				else
					alert("You don't have access permission to TOMS Online. Please contact the FMS administrator.");
				break;
		}
	}
}

function card_SelectWarningJob(jobid)
{
	if (0 == jobid)
	{
		card_SelectJob(-1);	// clear any selection
	}
	else
	{	
		var oJob = mFiltered;
		for(var i=0; i< oJob.length; ++i)
		{
			if (jobid == oJob[i][kJob])
			{
				card_SelectJob(i);
				var oNewRow = window.document.getElementById("MID" + i);
				oNewRow.scrollIntoView();
				return;
			}
		}
	}
}
function DisplayRelay()
{
	if (-1 == mCardNo)	{
		alert("Please select an FMS card first.");
		return;
	}
	
	var oData = new Array('ShowDialog', {
		"DBName": document.getElementById("DBNameID").innerHTML,
		"App": "FMS",
		"CardNo": mCardNo,
		"CardName": mCardName,
		"ArchFlag": mArchFlag,
		"Item": 0,
		"Substation": mCardData[kSubstationName]
	});
	util_PutWinTxData('MainFrame', oData);

	$('#MainFrame').attr('src', "dlgrelay.htm");
	var oDialog = $('#MainDialog').dialog('option', { 'width': 1020, 'height': 470 }).dialog("open");
}
function FindCard()
{
	var oData = new Array('ShowDialog', {"App": "FMS"});
	util_PutWinTxData('MainFrame', oData);

	$('#MainFrame').attr('src', "dlgfindcards.htm");
	$('#MainDialog').dialog('option', { 'width': 340, 'height': 410 }).dialog("open");
}
function card_LoadFoundCard(RetCard)
{	
	if (RetCard != null)	{
		var iFilter;
		switch(RetCard[kCardStatus]) {
			case 20:
				iFilter	= 1;
				break;
			case 30:
				iFilter = 4;
				break;
			case 40:
				iFilter = 3;
				break;
		}
		if (iFilter != mFilterCode || "0" != gDivCodes) {	
			gDivCodes = "0";		
			mFilterCode = iFilter;			
			UpdatePreference();
			GetFeederListData(gDivCodes, iFilter);
		}
		
		mCardNo = RetCard[kCard];
		GetCardData(mCardNo, 0);
	}
}
function UpdateFilterMenu(bReset)
{
	if (bReset) {
		mJobFilter = false;
		btnFilter.value = "Filter";
		btnFilter.style.color = "black";
		btnFilter.title = "Filter out returned moves";
	}
	else {
		mJobFilter = true;
		btnFilter.value = "Unfilter";
		btnFilter.style.color = "red";
		btnFilter.title = "Show all moves including completed moves";
	}
}
function FilterJobs()
{
	if (!mJobFilter) {
		mFiltered = mJobList;
	}
	else {
		var bShow, bATSGMove;
		mFiltered = new Array();
		
		for(var i=0; i< mJobList.length; ++i) {
			bATSGMove = false;
			bShow = true;
			
			// Don't filter out ATS Grouper equipment moves
			for (var m=0; m< mATSTypes.length; ++m) {
				if (mATSTypes[m][kType] == mJobList[i][kEquipType]) {
					bATSGMove = true;
					break;
				}
			}
			if (kdb_Category_Fake == mJobList[i][kCategory] && !bATSGMove) {
				if (util_IsDefined(mJobList[i][kTOComplete]) && util_IsDefined(mJobList[i][kRSComplete])) {
				   bShow = false;
				}
			}
			else if (util_IsDefined(mJobList[i][kTOComplete]) && 
				util_IsDefined(mJobList[i][kRSComplete]) && 
				!bATSGMove && 
            mJobList[i][kTOCompleteFG]!= kdb_CC_PALE_GRAY &&
            mJobList[i][kRSCompleteFG]!= kdb_CC_PALE_GRAY) {
				   bShow = false;
			}
			if (bShow) mFiltered[mFiltered.length] = mJobList[i];
		}
	}
}
function GetATSTypesFromDB()
{
	mATSTypes = new Array();

	$.ajax({
		url: '../ws/database.asmx/GetSubTree',
		data: { "UDBType": 20220, "MaxLevel": 0 },
		dataType: 'json',
		method: 'post',

		beforeSend: function () {
			window.document.body.style.cursor = "wait";
		},
		success: function (oReturn) {
			if (oReturn.STATUS.NUMBER != 0) {
				alert(oReturn.STATUS.DESCRIPTION);
				return;
			}
			mATSTypes = oReturn.DATA;
		},
		error: function (xhr, status) {
			alert("Failed to retrieve ATS types:\n" + status + '.' + xhr.responseText); 
		},
		complete: function () {
			window.document.body.style.cursor = "default";
		}
	});		
}
function ShowPerformanceTest() {
	var oData = new Array('ShowDialog', {App: "FMS", CardList: mCardList});

	util_PutWinTxData('dlgtesttool.htm', oData);
	var oWin = window.open("dlgtesttool.htm", "Performance", "width=320, height=200");
}
