/* global evothings:true */
/* global Uint8Array */
sap.ui.define([
	"sap/ui/core/mvc/Controller",
	"sap/ui/model/json/JSONModel",
	"motoui5/motoui5/libs/evothings/evothings",
	"sap/m/MessageToast",
	"sap/ui/model/Filter"
], function (Controller, JSONModel, evothingsjs, MessageToast, Filter) {
	"use strict";
	var ble = null;
	var that = null;
	var sInfoV1 = "KM Total";
	var sInfoV2 = "Trip 1";
	var sInfoV3 = "Trip 2";
	var sInfoV4 = "Tilt angle";
	var sInfoV5 = "GPS Speed";
	var sInfoV6 = "GPS Pos";
	var sInfoV7 = "Altimet";
	var sInfoK1 = "KmTotal";
	var sInfoK2 = "Trip1";
	var sInfoK3 = "Trip2";
	var sInfoK4 = "TiltAngle";
	var sInfoK5 = "GpsSpeed";
	var sInfoK6 = "GpsPosition";
	var sInfoK7 = "Altimeter";

	return Controller.extend("motoui5.motoui5.controller.View1", {
		onInit: function () {
			
			that = this;
			// Init logger
			var aLogger = [];
			var oModelLogger = this.getOwnerComponent().getModel("logger");
			oModelLogger.setData(aLogger);

			// document.addEventListener("deviceready", function () {
			// 	evothings.scriptsLoaded(that.onDeviceReady);
			// }, false);

			// Discovered devices.
			this.knownDevices = {};
			// Reference to the device we are connecting to.
			this.connectee = null;
			// Handle to the connected device.
			this.deviceHandle = null;
			// Handles to characteristics and descriptor for reading and
			// writing data from/to the Arduino using the BLE shield.
			this.characteristicRead = null;
			this.characteristicWrite = null;
			this.descriptorNotification = null;

			this.iRpmMax = 6000;
			this.iRpmLimit = 5000;
			this.iKmLast = 0;
			this.iKm = 0;
			//Models for Table rows of moto dashboard
			var oTableRow1 = new JSONModel();
			var oTableRow2 = new JSONModel();
			var oTableRow3 = new JSONModel();
			var oTableInfo = new JSONModel();
			var oInfoListModel = new JSONModel();
			this.getView().setModel(oTableRow1, "TableRow1");
			this.getView().setModel(oTableRow2, "TableRow2");
			this.getView().setModel(oTableRow3, "TableRow3");
			this.getView().setModel(oTableInfo, "TableInfo");
			this.getView().setModel(oInfoListModel, "InfoList");
			var oTableRowList1 = {
				results: []
			};
			var oTableRowList2 = {
				results: []
			};
			var oTableRowList3 = {
				results: []
			};
			var oInfoList = {
				results: []
			};

			oTableRowList1.results[0] = {
				visibleIndicatorLeft: false,
				visibleIndicatorRight: false,
				visibleHighBeam: false,
				visibleChoke: false,
				visibleOilTemp: false,
				visibleWaterTemp: false,
				visibleBatteryPower: false
			};
			oTableRowList2.results[0] = {
				rpmPercentValue: 0,
				rpmDisplayValue: "0 rpm",
				rpmState: "Success",
				gearValue: "N"
			};
			oTableRowList3.results[0] = {
				fuelValue: "0",
				speedValue: "0",
				info1: []
					//info2: []
			};

			// Set InfoList
			oInfoList.results[0] = {
				id: sInfoK1,
				title: sInfoV1,
				method: "getOfflineData"
			};
			oInfoList.results[1] = {
				id: sInfoK2,
				title: sInfoV2,
				method: "getOfflineData"
			};
			oInfoList.results[2] = {
				id: sInfoK3,
				title: sInfoV3,
				method: "getOfflineData"
			};
			oInfoList.results[3] = {
				id: sInfoK4,
				title: sInfoV4,
				method: "getOnlineData"
			};
			oInfoList.results[4] = {
				id: sInfoK5,
				title: sInfoV5,
				method: "getOnlineData"
			};
			oInfoList.results[5] = {
				id: sInfoK6,
				title: sInfoV6,
				method: "getOnlineData"
			};
			oInfoList.results[6] = {
				id: sInfoK7,
				title: sInfoV7,
				method: "getOnlineData"
			};

			oTableRow1.setData(oTableRowList1);
			oTableRow2.setData(oTableRowList2);
			oTableRow3.setData(oTableRowList3);
			oInfoListModel.setData(oInfoList);

			// Get moto data from offline storage
			this.getMotoData();

			//Build Info list table
			this.updateTableInfoList();

			//Initialization process is done, run startup
			this.onStartUp();

			//Perform BLE connection
			this.onDeviceReady();

		},

		onBeforeRendering: function () {},

		onAfterRendering: function () {

			var oTableRow3 = this.getView().byId("idTableRow3");
			var aTableRow3Items = oTableRow3.getItems();
			var aTableRow3Cells = aTableRow3Items[0].getCells();
			var aTableRow3InfoItems = aTableRow3Cells[1].getItems();
			var oTableInfo1 = aTableRow3InfoItems[0];
			//var oTableInfo2 = aTableRow3InfoItems[1];
			var aInfoItems1 = oTableInfo1.getItems();
			//var aInfoItems2 = oTableInfo2.getItems();

			aInfoItems1[0].addStyleClass("customMLIBShowSeparatorFirst");
			//aInfoItems2[0].addStyleClass("customMLIBShowSeparatorFirst");
		},

		setLog: function (sType, sMessage) {
			// Get logger model
			var oModelLogger = this.getOwnerComponent().getModel("logger");
			// Get actual logs
			var aLogger = oModelLogger.getData();
			
			// Build message object
			var oMessage = {
				type: sType,
				title: sMessage
			};

			//Add new message to log
			aLogger.push(oMessage);
			oModelLogger.setData(aLogger);
		},

		onDeviceReady: function () {
			ble = evothings.ble;
			// Evothings BLE plugin
			this.startScan();
		},

		getMotoData: function () {
			//Get offline Storage object to use
			this.oStorage = jQuery.sap.storage(jQuery.sap.storage.Type.local);
			//Get data from Storage
			var oMotoData;
			if (this.oStorage.get("moto")) {
				//Get data from offline storage
				oMotoData = this.oStorage.get("moto");
			} else {
				//Init offline storage
				oMotoData = {
					KmTotal: 0,
					Trip1: 0,
					Trip2: 0,
					KmOffset: 0,
					SpeedOffset: 0,
					RpmOffset: 0,
					Info: []
				};
				//Set data into Storage
				this.oStorage.put("moto", oMotoData);
				//Get data from offline storage
				oMotoData = this.oStorage.get("moto");
			}

			//Return moto data	
			return oMotoData;
		},

		setMotoData: function (oMotoData) {
			//Get offline Storage object to use
			this.oStorage = jQuery.sap.storage(jQuery.sap.storage.Type.local);
			//Set data into Storage
			this.oStorage.put("moto", oMotoData);
		},

		getOfflineData: function (sId) {
			var oMotoData = this.getMotoData();
			var sValueId = sId;
			var value = oMotoData[sValueId];
			return value;
		},

		getOnlineData: function (sId) {
			return 0;
		},

		updateTableInfoList: function () {
			var iInfoCounter = 0;
			//Get Table3 model
			var oTableRow3Model = this.getView().getModel("TableRow3");
			if (!oTableRow3Model) {
				return;
			}

			// Get moto offline data
			var oMotoData = this.getMotoData();
			if (!oMotoData) {
				return;
			}

			// Get info list Model
			var oInfoListModel = this.getView().getModel("InfoList");
			if (!oInfoListModel) {
				return;
			}
			var aInfoList = oInfoListModel.getProperty("/results");
			var oInfoList;

			//Build new info list
			var aInfo1 = new Array(3);
			//var aInfo2 = new Array(3);
			for (var i = 0; i < oMotoData.Info.length; i++) {
				for (var j = 0; j < aInfoList.length; j++) {
					oInfoList = aInfoList[j];
					if (oMotoData.Info[i] === oInfoList.id) {
						//Call method to retrieve data dynamically
						var value = this[oInfoList.method](oInfoList.id);

						//Build Info object
						var oInfo = {
							label: oInfoList.title,
							text: value
						};

						// Push object to info array 1
						aInfo1[iInfoCounter] = oInfo;

						// if (iInfoCounter < 3) {
						// 	// Push object to info array 1
						// 	aInfo1[iInfoCounter] = oInfo;
						// } else if (iInfoCounter < 6) {
						// 	// Push object to info array 2
						// 	aInfo2[iInfoCounter - 3] = oInfo;
						// }

						//Increment counter
						iInfoCounter += 1;

						//Leave actual loop
						break;
					}
				}
			}

			//Update Info list model
			oTableRow3Model.setProperty("/results/0/info1", aInfo1);
			//oTableRow3Model.setProperty("/results/0/info2", aInfo2);
		},

		onItemPressTableInfo: function (oEvent) {
			if (!this._oDialog) {
				this._oDialog = sap.ui.xmlfragment("motoui5/motoui5.view.Dialog", this);
				this._oDialog.setModel(this.getView().getModel("InfoList"));
			}

			// Set Multi-select
			this._oDialog.setMultiSelect(true);

			// Set Remember selections
			this._oDialog.setRememberSelections(true);

			// toggle compact style
			jQuery.sap.syncStyleClass("sapUiSizeCompact", this.getView(), this._oDialog);
			this._oDialog.open();
		},

		onDialogClose: function (oEvent) {
			var aContexts = oEvent.getParameter("selectedContexts");
			var oSelectedModel;
			var sSelectedPath;
			var oSelectedData;

			if (aContexts && aContexts.length) {
				if (aContexts.length > 3) {
					MessageToast.show("max 3 items!");
					this.onItemPressTableInfo();
					return;
				}
				// Get moto offline data
				var oMotoData = this.getMotoData();
				// Init Info list
				oMotoData.Info = [];

				for (var i = 0; i < aContexts.length; i++) {
					//Get selected data model
					oSelectedModel = aContexts[i].oModel;
					if (!oSelectedModel) {
						continue;
					}

					//Get selected data model path
					sSelectedPath = aContexts[i].sPath;
					if (!sSelectedPath) {
						continue;
					}

					//Get data from data model for given path
					oSelectedData = oSelectedModel.getProperty(sSelectedPath);

					//Build new Info list
					oMotoData.Info.push(oSelectedData.id);
				}

				//Set moto offline data 
				this.setMotoData(oMotoData);

				// Update Info List
				this.updateTableInfoList();

			} else {
				MessageToast.show("No new item was selected.");
			}
		},

		startScan: function () {
			//Start BLE scanning
			evothings.ble.startScan(function (deviceInfo) {
				if (that.knownDevices[deviceInfo.address]) {
					return;
				}
				that.setLog("Information", "found device: " + deviceInfo.name);
				that.knownDevices[deviceInfo.address] = deviceInfo;
				if (deviceInfo.name === "HMSoft" && !that.connectee) {
					that.setLog("Information", "Found HMSOFT");
					that.connectee = deviceInfo;
					that.connect(deviceInfo.address);
				}
			}, function (errorCode) {
				that.setLog("Error", "startScan error: " + errorCode);
			});
		},
		connect: function (address) {
			evothings.ble.stopScan();
			that.setLog("Information", "Connecting...");
			evothings.ble.connect(address, function (connectInfo) {
				if (connectInfo.state === 2)
				// Connected
				{
					that.setLog("Information", "Connected");
					that.deviceHandle = connectInfo.deviceHandle;
					that.getServices(connectInfo.deviceHandle);
				} else {
					that.setLog("Error", "Disconnected");
				}
			}, function (errorCode) {
				that.setLog("Error", "connect error: " + errorCode);
			});
		},
		getServices: function (deviceHandle) {
			that.setLog("Information", "Reading services...");
			evothings.ble.readAllServiceData(deviceHandle, function (services) {
				// Find handles for characteristics and descriptor needed.
				for (var si in services) {
					var service = services[si];
					for (var ci in service.characteristics) {
						var characteristic = service.characteristics[ci];
						if (characteristic.uuid === "0000ffe1-0000-1000-8000-00805f9b34fb") {
							that.characteristicRead = characteristic.handle;
						}
						if (characteristic.uuid === "0000ffe1-0000-1000-8000-00805f9b34fb") {
							that.characteristicWrite = characteristic.handle;
						}
						for (var di in characteristic.descriptors) {
							var descriptor = characteristic.descriptors[di];
							if (characteristic.uuid === "0000ffe1-0000-1000-8000-00805f9b34fb" && descriptor.uuid ===
								"00002902-0000-1000-8000-00805f9b34fb") {
								that.descriptorNotification = descriptor.handle;
							}
						}
					}
				}
				if (that.characteristicRead && that.characteristicWrite && that.descriptorNotification) {
					that.setLog("Information", "RX/TX services found");
					this.startReading(deviceHandle);
				} else {
					that.setLog("Error", "ERROR: RX/TX services not found!");
				}
			}, function (errorCode) {
				that.setLog("Error", "readAllServiceData error: " + errorCode);
			});
		},
		write: function (writeFunc, deviceHandle, handle, value) {
			if (handle) {
				ble[writeFunc](deviceHandle, handle, value, function () {
					that.setLog("Information", writeFunc + ": " + handle + " success.");
				}, function (errorCode) {
					that.setLog("Error", writeFunc + ": " + handle + " error: " + errorCode);
				});
			}
		},
		startReading: function (deviceHandle) {
			that.setLog("Information", "Enabling notifications...");
			// Turn notifications on.
			this.write("writeDescriptor", deviceHandle, this.descriptorNotification, new Uint8Array([
				1,
				0
			]));
			// Start reading notifications.
			evothings.ble.enableNotification(deviceHandle, this.characteristicRead, function (data) {
				//Retrieve sensor data via BLE
				var sSensorData = String.fromCharCode.apply(null, new Uint8Array(data));
				//Update moto infos
				this.update(sSensorData);

			}, function (errorCode) {
				that.setLog("Error", "enableNotification error: " + errorCode);
			});
		},

		onStartUp: function () {
			//On Start-up - switch all lights on
			var sSensorData = this.iRpmMax + ";200;1;1;1;1;1;1;1;0;100;0";

			//Update dashboard information
			this.update(sSensorData);
		},

		// onSimulation: function () {

		// 	var sRpm = Math.floor(Math.random() * 6000);
		// 	var sSpeed = Math.floor(Math.random() * 200);
		// 	var sHighBeam = Math.round(Math.random());
		// 	var sBatteryPower = Math.round(Math.random());
		// 	var sOilTemp = Math.round(Math.random());
		// 	var sWaterTemp = Math.round(Math.random());
		// 	var sChoke = Math.round(Math.random());
		// 	var sIndicatorLeft = Math.round(Math.random());
		// 	var sIndicatorRight = Math.round(Math.random());
		// 	var sGear = Math.floor(Math.random() * 5);
		// 	var sFuel = Math.floor(Math.random() * 100);
		// 	this.iKm += Math.floor(Math.random() * 5);
		// 	var sSensorData = sRpm + ";" + sSpeed + ";" + sHighBeam + ";" + sBatteryPower + ";" + sOilTemp + ";" + sWaterTemp + ";" + sChoke +
		// 		";" + sIndicatorLeft + ";" + sIndicatorRight + ";" + sGear + ";" + sFuel + ";" + this.iKm;

		// 	//Update dashboard information
		// 	this.update(sSensorData);

		// },

		update: function (sSensorData) {
			//Split sensor data string by seperator ";" into array
			var aSensordata = sSensorData.split(";");

			//Update each single value 
			this.setRpm(aSensordata[0]);
			this.setSpeed(aSensordata[1]);
			this.setHighBeam(aSensordata[2]);
			this.setBatteryPower(aSensordata[3]);
			this.setWaterTemp(aSensordata[4]);
			this.setOilTemp(aSensordata[5]);
			this.setChoke(aSensordata[6]);
			this.setIndicatorLeft(aSensordata[7]);
			this.setIndicatorRight(aSensordata[8]);
			this.setGear(aSensordata[9]);
			this.setFuel(aSensordata[10]);
			this.setInfo(aSensordata[11]);
		},

		setInfo: function (sValue) {
			//Only numeric value allowed
			if (isNaN(sValue)) {
				return;
			}

			// Get moto offline data
			var oMotoData = this.getMotoData();
			var iKm = parseInt(sValue, 10);

			var iKmDiff = iKm - this.iKmLast;
			//Update Kilometer counter
			oMotoData.KmTotal += iKmDiff;
			oMotoData.Trip1 += iKmDiff;
			oMotoData.Trip2 += iKmDiff;

			//Update last KM counter
			this.iKmLast = iKm;

			//Update moto offline data
			this.setMotoData(oMotoData);

			//Build Info list table
			this.updateTableInfoList();
		},

		setRpm: function (sValue) {
			//Only numeric value allowed
			if (isNaN(sValue)) {
				return;
			}

			// Get Table row model
			var oTableRow2 = this.getView().getModel("TableRow2");
			var iRpm = parseInt(sValue, 10);

			// Get moto offline data
			var oMotoData = this.getMotoData();

			//Calculate RPM with offset 
			iRpm += oMotoData.RpmOffset;
			iRpm = parseInt(iRpm, 10);

			// Calculate RPM percentage
			var iRpmPercent = iRpm / this.iRpmMax * 100;
			// Set RPM state
			var iRpmState;
			if (iRpm > this.iRpmLimit) {
				iRpmState = "Error";
			} else {
				iRpmState = "Success";
			}
			// Set values to model
			oTableRow2.setProperty("/results/0/rpmPercentValue", iRpmPercent);
			oTableRow2.setProperty("/results/0/rpmDisplayValue", iRpm);
			oTableRow2.setProperty("/results/0/rpmState", iRpmState);
		},

		setSpeed: function (sValue) {
			//Only numeric value allowed
			if (isNaN(sValue)) {
				return;
			}

			// Get Table row model
			var oTableRow3 = this.getView().getModel("TableRow3");
			var iSpeed = parseInt(sValue, 10);

			// Get moto offline data
			var oMotoData = this.getMotoData();

			//Calculate Speed with offset 
			iSpeed += oMotoData.SpeedOffset;
			iSpeed = parseInt(iSpeed, 10);

			// Set values to model
			oTableRow3.setProperty("/results/0/speedValue", iSpeed);
		},

		setGear: function (sValue) {
			//Only numeric value allowed
			if (isNaN(sValue)) {
				return;
			}

			// Get Table row model
			var oTableRow2 = this.getView().getModel("TableRow2");
			var iValue = parseInt(sValue, 10);
			var sGear = "";
			// Get text control object
			var oTextControl = this.getView().byId("idTextGear");
			if (oTextControl) {
				//Set Gear Text color
				if (sValue === 0) {
					//Set Gear text
					sGear = "N";
				} else if (sValue >= 1 && sValue <= 5) {
					//Set Gear text
					sGear = iValue;
				} else {
					return;
				}
			}
			// Set values to model
			oTableRow2.setProperty("/results/0/gearValue", sGear);
		},

		setFuel: function (sValue) {
			//Only numeric value allowed
			if (isNaN(sValue)) {
				return;
			}

			// Get Table row model
			var oTableRow3 = this.getView().getModel("TableRow3");
			// Set values to model
			oTableRow3.setProperty("/results/0/fuelValue", sValue);
		},

		setHighBeam: function (sValue) {
			//Only numeric value allowed
			if (isNaN(sValue)) {
				return;
			}

			var bVisible;
			//Get Model
			var oTableRow1 = this.getView().getModel("TableRow1");

			//Set visibility
			switch (sValue) {
			case "0":
				bVisible = false;
				break;
			case "1":
				bVisible = true;
				break;
			default:
				return;
			}

			//Update model data 
			oTableRow1.setProperty("/results/0/visibleHighBeam", bVisible);
		},

		setBatteryPower: function (sValue) {
			//Only numeric value allowed
			if (isNaN(sValue)) {
				return;
			}

			var bVisible;
			//Get Model
			var oTableRow1 = this.getView().getModel("TableRow1");

			//Set visibility
			switch (sValue) {
			case "0":
				bVisible = false;
				break;
			case "1":
				bVisible = true;
				break;
			default:
				return;
			}

			//Update model data 
			oTableRow1.setProperty("/results/0/visibleBatteryPower", bVisible);
		},

		setWaterTemp: function (sValue) {
			//Only numeric value allowed
			if (isNaN(sValue)) {
				return;
			}

			var bVisible;
			//Get Model
			var oTableRow1 = this.getView().getModel("TableRow1");

			//Set visibility
			switch (sValue) {
			case "0":
				bVisible = false;
				break;
			case "1":
				bVisible = true;
				break;
			default:
				return;
			}

			//Update model data 
			oTableRow1.setProperty("/results/0/visibleWaterTemp", bVisible);
		},

		setOilTemp: function (sValue) {
			//Only numeric value allowed
			if (isNaN(sValue)) {
				return;
			}

			var bVisible;
			//Get Model
			var oTableRow1 = this.getView().getModel("TableRow1");

			//Set visibility
			switch (sValue) {
			case "0":
				bVisible = false;
				break;
			case "1":
				bVisible = true;
				break;
			default:
				return;
			}

			//Update model data 
			oTableRow1.setProperty("/results/0/visibleOilTemp", bVisible);
		},

		setChoke: function (sValue) {
			//Only numeric value allowed
			if (isNaN(sValue)) {
				return;
			}

			var bVisible;
			//Get Model
			var oTableRow1 = this.getView().getModel("TableRow1");

			//Set visibility
			switch (sValue) {
			case "0":
				bVisible = false;
				break;
			case "1":
				bVisible = true;
				break;
			default:
				return;
			}

			//Update model data 
			oTableRow1.setProperty("/results/0/visibleChoke", bVisible);
		},

		setIndicatorLeft: function (sValue) {
			//Only numeric value allowed
			if (isNaN(sValue)) {
				return;
			}

			var bVisible;
			//Get Model
			var oTableRow1 = this.getView().getModel("TableRow1");

			//Set visibility
			switch (sValue) {
			case "0":
				bVisible = false;
				break;
			case "1":
				bVisible = true;
				break;
			default:
				return;
			}

			//Update model data 
			oTableRow1.setProperty("/results/0/visibleIndicatorLeft", bVisible);
		},

		setIndicatorRight: function (sValue) {
			//Only numeric value allowed
			if (isNaN(sValue)) {
				return;
			}

			var bVisible;
			//Get Model
			var oTableRow1 = this.getView().getModel("TableRow1");

			//Set visibility
			switch (sValue) {
			case "0":
				bVisible = false;
				break;
			case "1":
				bVisible = true;
				break;
			default:
				return;
			}

			//Update model data
			oTableRow1.setProperty("/results/0/visibleIndicatorRight", bVisible);
		},

		action: function (oEvent) {
			var actionParameters = JSON.parse(oEvent.getSource().data("wiring").replace(/'/g, "\""));
			var eventType = oEvent.getId();
			var aTargets = actionParameters[eventType].targets || [];
			aTargets.forEach(function (oTarget) {
				var oControl = that.byId(oTarget.id);
				if (oControl) {
					var oParams = {};
					for (var prop in oTarget.parameters) {
						oParams[prop] = oEvent.getParameter(oTarget.parameters[prop]);
					}
					oControl[oTarget.action](oParams);
				}
			});
			var oNavigation = actionParameters[eventType].navigation;
			if (oNavigation) {
				var oParams = {};
				(oNavigation.keys || []).forEach(function (prop) {
					oParams[prop.name] = encodeURIComponent(JSON.stringify({
						value: oEvent.getSource().getBindingContext(oNavigation.model).getProperty(prop.name),
						type: prop.type
					}));
				});
				if (Object.getOwnPropertyNames(oParams).length !== 0) {
					this.getOwnerComponent().getRouter().navTo(oNavigation.routeName, oParams);
				} else {
					this.getOwnerComponent().getRouter().navTo(oNavigation.routeName);
				}
			}
		}
	});
});