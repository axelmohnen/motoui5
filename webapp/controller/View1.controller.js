
/* global evothings:true */

sap.ui.define([
	"sap/ui/core/mvc/Controller",
	"sap/ui/model/json/JSONModel",
	"motoui5/motoui5/libs/evothings/evothings",
	"sap/m/MessageToast"
], function(Controller, JSONModel, evothingsjs, MessageToast) {
	"use strict";

	var ble = null;
	return Controller.extend("motoui5.motoui5.controller.View1", {

		onInit: function() {
			
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

			document.addEventListener("deviceready", function() {
				evothings.scriptsLoaded(this.onDeviceReady);
			}, false);

			this.iRpmMax = 8000;
			this.iRpmLimit = 7000;

			//Models for Table rows of moto dashboard
			var oTableRow1 = new JSONModel();
			var oTableRow2 = new JSONModel();
			var oTableRow3 = new JSONModel();
			var oTableInfo = new JSONModel();
			var oComboBoxInfo = new JSONModel();
			this.getView().setModel(oTableRow1, "TableRow1");
			this.getView().setModel(oTableRow2, "TableRow2");
			this.getView().setModel(oTableRow3, "TableRow3");
			this.getView().setModel(oTableInfo, "TableInfo");
			this.getView().setModel(oComboBoxInfo, "ComboBoxInfo");

			var oTableRowList1 = {
				results: []
			};
			var oTableRowList2 = {
				results: []
			};
			var oTableRowList3 = {
				results: []
			};

			var oTableInfoList = {
				results: []
			};

			var oComboBoxInfoList = {
				results: []
			};

			oTableRowList1.results[0] = {
				visibleIndicatorLeft: true,
				visibleIndicatorRight: true,
				visibleHighBeam: true,
				visibleChoke: true,
				visibleOilTemp: true,
				visibleWaterTemp: true,
				visibleBatteryPower: true
			};

			oTableRowList2.results[0] = {
				rpmPercentValue: 90,
				rpmDisplayValue: "9000 rpm",
				rpmState: "Error", //"Success"
				gearValue: "N"
			};
			oTableRowList3.results[0] = {
				fuelValue: "15",
				speedValue: "167"
			};

			// Set dummy records in order to see three table rows in view
			oTableInfoList.results[0] = {};
			oTableInfoList.results[1] = {};
			oTableInfoList.results[2] = {};

			var sComboBoxV1 = "Trip1:";
			var sComboBoxV2 = "Trip2:";
			var sComboBoxV3 = "KM Total:";
			var sComboBoxV4 = "Tilt angle:";
			var sComboBoxV5 = "GPS Speed:";
			var sComboBoxV6 = "GPS Position:";
			var sComboBoxV7 = "Altimeter:";

			oComboBoxInfoList.results[0] = {
				key: "1",
				text: sComboBoxV1
			};
			oComboBoxInfoList.results[1] = {
				key: "2",
				text: sComboBoxV2
			};
			oComboBoxInfoList.results[2] = {
				key: "3",
				text: sComboBoxV3
			};
			oComboBoxInfoList.results[3] = {
				key: "4",
				text: sComboBoxV4
			};
			oComboBoxInfoList.results[4] = {
				key: "5",
				text: sComboBoxV5
			};
			oComboBoxInfoList.results[5] = {
				key: "6",
				text: sComboBoxV6
			};
			oComboBoxInfoList.results[6] = {
				key: "7",
				text: sComboBoxV7
			};

			oTableRow1.setData(oTableRowList1);
			oTableRow2.setData(oTableRowList2);
			oTableRow3.setData(oTableRowList3);
			oTableInfo.setData(oTableInfoList);
			oComboBoxInfo.setData(oComboBoxInfoList);

			//Create Trigger and register handler
			if (!this.oTrigger) {
				this.oTrigger = new sap.ui.core.IntervalTrigger();
			}

			this.oTrigger.addListener(this.triggerIndicator, this);
			this.oTrigger.setInterval(800);
		},

		onBeforeRendering: function() {},

		onAfterRendering: function() {},

		onDeviceReady: function() {

			ble = evothings.ble; // Evothings BLE plugin

			this.startScan();

			// evothings.arduinoble.close();
			// evothings.arduinoble.connect(
			// 	"HMSOFT", // Name of the module.
			// 	function(device) {
			// 		this.device = device;
			// 		//Initialization process is done, send message
			// 		MessageToast.show("Ready to cruise!");
			// 	},
			// 	function(errorCode) {
			// 		//Initialization process ended with errors, send message
			// 		MessageToast.show("Connect error: " + errorCode);
			// 	});
		},

		startScan: function() {
			evothings.ble.startScan(
				function(deviceInfo) {
					if (this.knownDevices[deviceInfo.address]) {
						return;
					}
					MessageToast.show("found device: " + deviceInfo.name);
					this.knownDevices[deviceInfo.address] = deviceInfo;
					if (deviceInfo.name === "HMSOFT" && !this.connectee) {
						MessageToast.show("Found arduinoble");
						this.connectee = deviceInfo;
						this.connect(deviceInfo.address);
					}
				},
				function(errorCode) {
					MessageToast.show("startScan error: " + errorCode);
				});
		},

		connect: function(address) {
			evothings.ble.stopScan();
			MessageToast.show("Connecting...");
			evothings.ble.connect(
				address,
				function(connectInfo) {
					if (connectInfo.state === 2) // Connected
					{
						this.deviceHandle = connectInfo.deviceHandle;
						this.getServices(connectInfo.deviceHandle);
					} else {
						MessageToast.show("Disconnected");
					}
				},
				function(errorCode) {
					MessageToast.show("connect error: " + errorCode);
				});
		},

		getServices: function(deviceHandle) {
			MessageToast.show("Reading services...");

			evothings.ble.readAllServiceData(deviceHandle, function(services) {
					// Find handles for characteristics and descriptor needed.
					for (var si in services) {
						var service = services[si];

						for (var ci in service.characteristics) {
							var characteristic = service.characteristics[ci];

							if (characteristic.uuid === "713d0002-503e-4c75-ba94-3148f18d941e") {
								this.characteristicRead = characteristic.handle;
							} else if (characteristic.uuid === "713d0003-503e-4c75-ba94-3148f18d941e") {
								this.characteristicWrite = characteristic.handle;
							}

							for (var di in characteristic.descriptors) {
								var descriptor = characteristic.descriptors[di];

								if (characteristic.uuid === "713d0002-503e-4c75-ba94-3148f18d941e" &&
									descriptor.uuid === "00002902-0000-1000-8000-00805f9b34fb") {
									this.descriptorNotification = descriptor.handle;
								}
							}
						}
					}

					if (this.characteristicRead && this.characteristicWrite && this.descriptorNotification) {
						MessageToast.show("RX/TX services found");
						this.startReading(deviceHandle);
					} else {
						MessageToast.show("ERROR: RX/TX services not found!");
					}
				},
				function(errorCode) {
					MessageToast.show("readAllServiceData error: " + errorCode);
				});
		},

		write: function(writeFunc, deviceHandle, handle, value) {
			if (handle) {
				ble[writeFunc](
					deviceHandle,
					handle,
					value,
					function() {
						MessageToast.show(writeFunc + ": " + handle + " success.");
					},
					function(errorCode) {
						MessageToast.show(writeFunc + ": " + handle + " error: " + errorCode);
					});
			}
		},

		startReading: function(deviceHandle) {
			MessageToast.show("Enabling notifications...");

			// Turn notifications on.
			this.write(
				"writeDescriptor",
				deviceHandle,
				this.descriptorNotification,
				new Uint8Array([1, 0]));
				

			// Start reading notifications.
			evothings.ble.enableNotification(
				deviceHandle,
				this.characteristicRead,
				function(data) {
					MessageToast.show("Active");
					var aData = new DataView(data).getUint16(0, true);
				},
				function(errorCode) {
					MessageToast.show("enableNotification error: " + errorCode);
				});
		},

		setRpm: function(iRpm) {
			// Get Table row model
			var oTableRow2 = this.getView().getModel("TableRow2");

			// Calculate RPM percentage
			var iRpmPercent = (iRpm / this.iRpmMax) * 100;

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

		setSpeed: function(iSpeed) {
			// Get Table row model
			var oTableRow3 = this.getView().getModel("TableRow3");
			// Set values to model
			oTableRow3.setProperty("/results/0/speedValue", iSpeed);
		},

		setGear: function(sGear) {
			// Get Table row model
			var oTableRow2 = this.getView().getModel("TableRow2");

			// Get text control object
			var oTextControl = this.getView().byId("idTextGear");

			if (oTextControl) {
				//Set Gear Text color
				if (sGear === "N") {
					//Set yellow
					oTextControl.toggleStyleClass("customMTextColorBlackGear");
					oTextControl.toggleStyleClass("customMTextColorYellowGear");
					// oTextControl.removeStyleClass("customMTextColorBlackGear");
					// oTextControl.addStyleClass("customMTextColorYellowGear");
				} else {
					//Set block
					oTextControl.toggleStyleClass("customMTextColorBlackGear");
					oTextControl.toggleStyleClass("customMTextColorYellowGear");
					// oTextControl.removeStyleClass("customMTextColorYellowGear");
					// oTextControl.addStyleClass("customMTextColorBlackGear");
				}
			}

			// Set values to model
			oTableRow2.setProperty("/results/0/gearValue", sGear);
		},

		triggerIndicator: function() {
			var bVisible;
			var oTableRow1 = this.getView().getModel("TableRow1");

			if (oTableRow1.getProperty("/results/0/visibleIndicatorLeft")) {
				bVisible = false;
			} else {
				bVisible = true;
			}
			oTableRow1.setProperty("/results/0/visibleIndicatorLeft", bVisible);
			oTableRow1.setProperty("/results/0/visibleIndicatorRight", bVisible);

			//this.setGear("1");
		}
	});
});
