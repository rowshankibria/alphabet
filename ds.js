// database constants
var kdb_Div_X = 20002;
var kdb_Div_B = 20003;
var kdb_Div_M = 20004;
var kdb_Div_Q = 20005;
var kdb_Div_S = 20006;
var kdb_Div_W = 20007;

var kdb_App_TFMS = 1;
var kdb_App_FMS = 2;
var kdb_App_SLC = 3;
var kdb_App_TLS = 4;

// order status
var kdb_Order_Downloaded = 15;
var kdb_Order_Closed = 50;
var kdb_Order_ConfClosed = 60;

// Job related
var kdb_StepPair_OTW = 600;

var kdb_JC_TestLetter = 15000;

var kdb_Category_Normal = 0;
var kdb_Category_Switching = 2;
var kdb_Category_Information = 3;
var kdb_Category_ISWP = 6;
var kdb_Category_Fake = -99;

// FMS card classes
var kdb_FMS_Card_ALLOA = 1;
var kdb_FMS_Card_ISO = 10099;
var kdb_FMS_Card_FOT = 10100;
var kdb_FMS_Card_AUTO = 10116;
var kdb_FMS_Card_CIOA = 10165;
var kdb_FMS_Card_OOE1 = 20090;
var kdb_FMS_Card_OOE2 = 20091;
var kdb_FMS_Card_SCHD = 20092;
var kdb_FMS_Card_WR = 20094;
var kdb_FMS_Card_RAP = 20215;

var kdb_FMS_Card_ALLOA_Name = 'AUTO/CIOA/FOT';
var kdb_FMS_Card_ISO_Name = 'KP-ISO';
var kdb_FMS_Card_FOT_Name = 'FOT';
var kdb_FMS_Card_AUTO_Name = 'Auto';
var kdb_FMS_Card_CIOA_Name = 'CIOA';
var kdb_FMS_Card_OOE1_Name = 'OOE1';
var kdb_FMS_Card_OOE2_Name = 'OOE2';
var kdb_FMS_Card_SCHD_Name = 'SCHD';
var kdb_FMS_Card_WR_Name = 'WR';
var kdb_FMS_Card_RAP_Name = 'RAP';

// TFMS card classes
var kdb_TFMS_Card_AUTO = 12009;
var kdb_TFMS_Card_OOE1 = 12010;
var kdb_TFMS_Card_OOE2 = 22125;
var kdb_TFMS_Card_SCHD = 22123;

var kdb_TFMS_Card_AUTO_Name = 'Auto';
var kdb_TFMS_Card_OOE1_Name = 'OOE1';
var kdb_TFMS_Card_OOE2_Name = 'OOE2';
var kdb_TFMS_Card_SCHD_Name = 'SCHD';

// card types
var kdb_Card_4KV = 10062;

// FMS operating steps
var kdb_FMS_OpSteps = new Array("TotISTA", "TotISL", "TotSTG", "ISTA", "ISO", "STA", "ABF", "DM", "EST", 
                         "TotILOC", "INSP", "LOC", "RG", "TG", "TC", "ID", "RGTC", "PFW",
                         "TotOTW", "OTWR", "OTWS", "OTWPlus",
                         "TotFPFS", "FG", "TEST", "PFSS", "PFSF");
var kdb_FMS_OpSteps_Det = new Array("TotISTA", "TotISL", "TotSTG", "ISTA", "ABF", "DM", "EST", 
                         "TotILOC", "INSP", "LOC", "RG", "TG", "TC", "ID", "RGTC", "PFW",
                         "TotOTW", "OTWR", "OTWS", "OTWPlus",
                         "TotFPFS", "FG", "TEST", "PFSS", "PFSF");
var kdb_FMS_OpSteps_Sum = new Array("TotISTA", "DM", "EST", "TotILOC", "RG", "TG", "TC", "ID", "RGTC", "PFW", "TotOTW", "TotFPFS"); 

// TFMS operating steps
var kdb_TFMS_OpSteps = new Array("CO", "INVS", "PROT", "ISL", "GRND",  
                    "TEST", "LOC", "ID", "TC", "CONT", "HP", "AC",
						  "OTW", "OTWR", "OTWS", "PFS", "PDNX", "RS");

var kdb_TFMS_OpSteps_Det = new Array("CO", "INVS", "PROT", "ISL", "GRND",  
                    "TEST", "LOC", "ID", "TC", "CONT", "HP", "AC",
						  "OTW", "OTWR", "OTWS", "PFS", "PDNX", "RS");

var kdb_TFMS_OpSteps_Sum = new Array("CO", "INVS", "PROT", "TEST", "OTW", "PFS", "PDNX", "RS");

// in-service work permit types
var kdb_Type_Substation = 5;
var kdb_Type_UnitSubstn = 10153;
var kdb_Type_Feeder = 40;
var kdb_Type_Circuit = 15000;
var kdb_Type_CCTNWork = 0;
var kdb_Type_LineWork = 1;
var kdb_Type_DSO = 143;
var kdb_ISP_TypeAppMap = {"5":"SLC", "10153":"SLC", "40":"SLC", "15000":"TLS", "0":"TLS", "1":"SLC", "143":"DSO"};

// in-service work permit status
var kdb_ISP_ReqOpen = 1;
var kdb_ISP_Request = 2;
var kdb_ISP_ReqToRCC = 3;
var kdb_ISP_ReqPending = 4;
var kdb_ISP_ReqAccepted = 6; // status selection only
var kdb_ISP_ReqDenied = 8;

var kdb_ISP_Open = 10;	
var kdb_ISP_PendTO = 15;
var kdb_ISP_PendSO = 20;
var kdb_ISP_Denied = 25;
var kdb_ISP_Pending = 30;
var kdb_ISP_CondApproved = 35;
var kdb_ISP_Approved = 40;
var kdb_ISP_Submitted = 45;
var kdb_ISP_Issued = 50;
var kdb_ISP_PullRequest = 54;
var kdb_ISP_Pulled = 55;
var kdb_ISP_Complete = 60;
var kdb_ISP_Incomplete = 65;
var kdb_ISP_Local = 70;
var kdb_ISP_Closed = 100;

// these are group statuses on T.O. screen
var kdb_ISP_AllCurrent = 500;
var kdb_ISP_AllRequests = 502;
var kdb_ISP_AllDO = 509; 
var kdb_ISP_AllReviewed = 530;
var kdb_ISP_AllApproved = 540;
var kdb_ISP_AllIssued = 550;
var kdb_ISP_AllPulled = 555;
var kdb_ISP_AllArchived = 600;

// these are group statuses on SSM screen
var kdb_ISP_SSMCurrent = 580;

// out-of-service work permit status
var kdb_OSP_Open = 1;
var kdb_OSP_Ready = 2;
var kdb_OSP_Request = 3;
var kdb_OSP_Denied = 8;
var kdb_OSP_Acked = 10;
var kdb_OSP_Issued = 50;
var kdb_OSP_Complete = 60;
var kdb_OSP_Incomplete = 65;

var kdb_OSP_AllCurrent = 500;
var kdb_OSP_AllArchived = 600;

// Outage Scheduling System
var kdb_OSS_ReqOpen = 1;
var kdb_OSS_PendAppv1 = 2; // pending on approval by level 1
var kdb_OSS_PendAppv2 = 3;	// approved by level 1 and pending on approval by level 2
var kdb_OSS_PendAppv3 = 4; // pending on approval by level 3
var kdb_OSS_PendAppvSWP = 5; // pending on approval by SWP
var kdb_OSS_ReqDenied = 8;
var kdb_OSS_ReqRescinded = 9;
var kdb_OSS_Approved = 10;      

// tls job class
var kdb_JC_SetupMeet = 21289;
var kdb_JC_ArrAccess = 21310;
var kdb_JC_PSTSupport = 21385;

// OpenRoad colors
var kdb_CC_BLACK		= 1;
var kdb_CC_RED		= 6;
var kdb_CC_GREEN	= 7;
var kdb_CC_BLUE		= 8;
var kdb_CC_YELLOW	= 9;
var kdb_CC_CYAN		= 10;
var kdb_CC_PINK		= 11;
var kdb_CC_BROWN	= 12;
var kdb_CC_ORANGE	= 13;
var kdb_CC_PURPLE	= 14;
var kdb_CC_GRAY		= 15;

var kdb_CC_LIGHT_RED	= 16;
var kdb_CC_LIGHT_GREEN	= 17;
var kdb_CC_LIGHT_BLUE	= 18;
var kdb_CC_LIGHT_YELLOW	= 19;
var kdb_CC_LIGHT_CYAN	= 20;
var kdb_CC_LIGHT_PINK	= 21;
var kdb_CC_LIGHT_BROWN	= 22;
var kdb_CC_LIGHT_ORANGE	= 23;
var kdb_CC_LIGHT_PURPLE	= 24;
var kdb_CC_LIGHT_GRAY	= 25;

var kdb_CC_PALE_RED		= 26;
var kdb_CC_PALE_GREEN	= 27;
var kdb_CC_PALE_BLUE	= 28;
var kdb_CC_PALE_YELLOW	= 29;
var kdb_CC_PALE_CYAN	= 30;
var kdb_CC_PALE_PINK	= 31;
var kdb_CC_PALE_BROWN	= 32;
var kdb_CC_PALE_ORANGE	= 33;
var kdb_CC_PALE_PURPLE	= 34;
var kdb_CC_PALE_GRAY	= 35;

function db_GetMappedColor(ORColor) 
{
	var HTMLColor = "";

	var AdjColor = ORColor;

	switch(AdjColor)
	{
		case kdb_CC_BLACK:
			HTMLColor = "#000000";
			break;
		case kdb_CC_RED:
			HTMLColor = "#ff0000";
			break;
		case kdb_CC_GREEN:
			HTMLColor = "#008000";
			break;
		case kdb_CC_BLUE:	
			HTMLColor = "#0000ff";
			break;
		case kdb_CC_YELLOW:
			HTMLColor = "#ffff00";
			break;
		case kdb_CC_CYAN:	
			HTMLColor = "#00ffff";
			break;
		case kdb_CC_PINK:	
			HTMLColor = "#ffc0c0";
			break;
		case kdb_CC_BROWN:
			HTMLColor = "#8B4513";		// SaddleBrown
			break;
		case kdb_CC_ORANGE:
			HTMLColor = "#ff8c00";		// DarkOrange
			break;
		case kdb_CC_PURPLE:
			HTMLColor = "#800080";		// Purple
			break;
		case kdb_CC_GRAY:
			HTMLColor = "#696969";		// DimGray
			break;

		case kdb_CC_LIGHT_RED:
			HTMLColor = "#ff4500";		// OrangeRed
			break;
		case kdb_CC_LIGHT_GREEN:		// MediumSeaGreen
			HTMLColor = "#3cb371";
			break;
		case kdb_CC_LIGHT_BLUE:			// CornflowerBlue
			HTMLColor = "#6495ed";
			break;
		case kdb_CC_LIGHT_YELLOW:		// Khaki
			HTMLColor = "#f0e68c";
			break;
		case kdb_CC_LIGHT_CYAN:			// PowderBlue
			HTMLColor = "#b0e0e6";
			break;
		case kdb_CC_LIGHT_PINK:			// Violet
			HTMLColor = "#ee82ee";
			break;
		case kdb_CC_LIGHT_BROWN:		// Tan
			HTMLColor = "#d2b48c";
			break;
		case kdb_CC_LIGHT_ORANGE:		// Orange
			HTMLColor = "#ffa500";
			break;
		case kdb_CC_LIGHT_PURPLE:		// BlueViolet
			HTMLColor = "#8a2be2";
			break;
		case kdb_CC_LIGHT_GRAY:	
			HTMLColor = "#808080";		// Gray
			break;

		case kdb_CC_PALE_RED:		
			HTMLColor = "#ffb6c1";	// light pink
			break;
		case kdb_CC_PALE_GREEN:		// LightGreen
			HTMLColor = "#90ee90";
			break;
		case kdb_CC_PALE_BLUE:		// LightSkyBlue
			HTMLColor = "#87cefa"; 
			break;
		case kdb_CC_PALE_YELLOW:	// LightGoldenrodYellow
			HTMLColor = "#fafad2";
			break;
		case kdb_CC_PALE_CYAN:		// LightCyan
			HTMLColor = "#e0ffff";
			break;
		case kdb_CC_PALE_PINK:		// Thistle
			HTMLColor = "#d8bfd8";
			break;
		case kdb_CC_PALE_BROWN:		// Burlywood
			HTMLColor = "#deb887";
			break;
		case kdb_CC_PALE_ORANGE:	// Gold
			HTMLColor = "#ffd700";
			break;
		case kdb_CC_PALE_PURPLE:	// Lavender
			HTMLColor = "#e6e6fa";
			break;
		case kdb_CC_PALE_GRAY:		// DarkGray
			HTMLColor = "#a9a9a9";
			break;
	}
	return HTMLColor;
}
