sap.ui.define([
	"sap/ui/core/mvc/Controller",
	"sap/ui/model/json/JSONModel",
	"sap/m/MessageToast"
], function(Controller, JSONModel, MessageToast) {
	"use strict";
	return Controller.extend("motoui5.motoui5.controller.View2", {
		onInit: function() {
			//Set routing event handler
			this._oRouter = sap.ui.core.UIComponent.getRouterFor(this);
			this._oRouter.attachRouteMatched(this.handleRouteMatched, this);
		},

		handleRouteMatched: function(evt) {
			//Check whether the VIEW2 page has been entered.
			if (evt.getParameter("config").name === "View2") {
				//Get offline Storage object to use
				this.oStorage = jQuery.sap.storage(jQuery.sap.storage.Type.local);
				//Get data from Storage
				if (this.oStorage.get("moto")) {
					//Get data from offline storage
					var oMotoSetupData = this.oStorage.get("moto");

					//Create Moto setup model
					var oMotoSetupModel = new JSONModel();
					oMotoSetupModel.setData(oMotoSetupData);
					//Set View model
					this.getView().setModel(oMotoSetupModel, "motoSetup");
				}
			}
		},

		/**
		 * Similar to onAfterRendering, but this hook is invoked before the controller's View is re-rendered
		 * (NOT before the first rendering! onInit() is used for that one!).
		 * @memberOf motoui5.motoui5.view.View2
		 */
		onBeforeRendering: function() {

		},
		/**
		 * Called when the View has been rendered (so its HTML is part of the document). Post-rendering manipulations of the HTML could be done here.
		 * This hook is the same one that SAPUI5 controls get after being rendered.
		 * @memberOf motoui5.motoui5.view.View2
		 */
		onAfterRendering: function() {

		},
		/**
		 * Called when the Controller is destroyed. Use this one to free resources and finalize activities.
		 * @memberOf motoui5.motoui5.view.View2
		 */
		//	onExit: function() {
		//
		//	}
		/**
		 *@memberOf motoui5.motoui5.controller.View2
		 */
		action: function(oEvent) {
			var that = this;
			var actionParameters = JSON.parse(oEvent.getSource().data("wiring").replace(/'/g, "\""));
			var eventType = oEvent.getId();
			var aTargets = actionParameters[eventType].targets || [];
			aTargets.forEach(function(oTarget) {
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
				(oNavigation.keys || []).forEach(function(prop) {
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
		},
		onResetTrip1: function(oEvent) {
			// Get View model
			var oMotoSetupModel = this.getView().getModel("motoSetup");
			// Reset Trip1
			oMotoSetupModel.setProperty("/Trip1", 0);
		},
		onResetTrip2: function(oEvent) {
			// Get View model
			var oMotoSetupModel = this.getView().getModel("motoSetup");
			// Reset Trip2
			oMotoSetupModel.setProperty("/Trip2", 0);
		},
		
		onSavePress: function(oEvent) {
			// Get View model
			var oMotoSetupModel = this.getView().getModel("motoSetup");
			var oMotoSetupData = oMotoSetupModel.getData();
			
			// Check Input
			oMotoSetupData.KmTotal = parseFloat(oMotoSetupData.KmTotal, 10);
			if (isNaN(oMotoSetupData.KmTotal) === true){
			 //Show error message
				MessageToast.show("KM Total is not numeric");
				return;
			}
			oMotoSetupData.Trip1 = parseFloat(oMotoSetupData.Trip1, 10);
			if (isNaN(oMotoSetupData.Trip1) === true){
			 //Show error message
				MessageToast.show("Trip1 is not numeric");
				return;
			}
			oMotoSetupData.Trip2 = parseFloat(oMotoSetupData.Trip2, 10);
			if (isNaN(oMotoSetupData.Trip2) === true){
			 //Show error message
				MessageToast.show("Trip2 is not numeric");
				return;
			}
			oMotoSetupData.KmOffset = parseFloat(oMotoSetupData.KmOffset, 10);
			if (isNaN(oMotoSetupData.KmOffset) === true){
			 //Show error message
				MessageToast.show("KM Offset is not numeric");
				return;
			}
			oMotoSetupData.SpeedOffset = parseFloat(oMotoSetupData.SpeedOffset, 10);
			if (isNaN(oMotoSetupData.SpeedOffset) === true){
			 //Show error message
				MessageToast.show("Speed Offset is not numeric");
				return;
			}
			oMotoSetupData.RpmOffset = parseFloat(oMotoSetupData.RpmOffset, 10);
			if (isNaN(oMotoSetupData.RpmOffset) === true){
			 //Show error message
				MessageToast.show("RPM Offset is not numeric");
				return;
			}

			//Set data to offline Storage
			this.oStorage.put("moto", oMotoSetupData);

			//Show message
			MessageToast.show("Data saved!");
		}
	});
});