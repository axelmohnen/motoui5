sap.ui.define([
	"sap/ui/core/UIComponent",
	"sap/ui/Device",
	"motoui5/motoui5/model/models"
], function(UIComponent, Device, models) {
	"use strict";

	return UIComponent.extend("motoui5.motoui5.Component", {

		metadata: {
			manifest: "json"
		},

		/**
		 * The component is initialized by UI5 automatically during the startup of the app and calls the init method once.
		 * @public
		 * @override
		 */
		init: function() {
			jQuery.sap.require("jquery.sap.storage");

			// call the base component's init function
			UIComponent.prototype.init.apply(this, arguments);

			// enable routing
			this.getRouter().initialize();

			// set the device model
			this.setModel(models.createDeviceModel(), "device");
		}
	});
});