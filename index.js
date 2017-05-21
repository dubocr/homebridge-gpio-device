var Accessory, Service, Characteristic, UUIDGen, Types;

var wpi = require('wiring-pi');

module.exports = function(homebridge) {
    console.log("homebridge-gpio-device API version: " + homebridge.version);

    // Accessory must be created from PlatformAccessory Constructor
    Accessory = homebridge.platformAccessory;

    // Service and Characteristic are from hap-nodejs
    Service = homebridge.hap.Service;
    Characteristic = homebridge.hap.Characteristic;
    UUIDGen = homebridge.hap.uuid;
    Types = homebridge.hapLegacyTypes;

		homebridge.registerAccessory("homebridge-gpio-device", "GPIODevice", DeviceAccesory);
}

function DeviceAccesory(log, config) {
	this.services = [];
	
	if(!config.type) throw new Error("'type' parameter is missing");
	if(!config.name) throw new Error("'name' parameter is missing for accessory " + config.type);
	if(!config.pin && !config.pins) throw new Error("'pin(s)' parameter is missing for accessory " + config.name);
	
	var infoService = new Service.AccessoryInformation();
	infoService.setCharacteristic(Characteristic.Manufacturer, 'Raspberry')
	infoService.setCharacteristic(Characteristic.Model, config.type)
	//infoService.setCharacteristic(Characteristic.SerialNumber, 'Raspberry');
	this.services.push(infoService);
	
	wpi.setup('wpi');
	switch(config.type) {
		case 'ContactSensor':
			this.device = new DigitalInput(this, log, config);
		break;
		case 'Switch':
		case 'Lightbulb':
			this.device = new DigitalOutput(this, log, config);
		break;
		case 'MotionSensor':
			this.device = new PIRSensor(this, log, config);
		break;
		case 'Window':
		case 'WindowCovering':
			this.device = new RollerShutter(this, log, config);
		break;
		default:
			throw new Error("Unknown 'type' parameter : " + config.type);
		break;
	}
}

DeviceAccesory.prototype = {
  getServices: function() {
  	return this.services;
 	},
 	
 	addService: function(service) {
 		this.services.push(service);
 	}
}

function DigitalInput(accesory, log, config) {
	this.log = log;
	this.pin = config.pin;
	this.inverted = config.inverted || false;
	
	this.service = new Service[config.type](config.name);
	this.service.getCharacteristic(Characteristic.ContactSensorState)
		.on('get', this.getState.bind(this));
	
	wpi.pinMode(this.pin, wpi.INPUT);
	wpi.wiringPiISR(this.pin, wpi.INT_EDGE_BOTH, this.stateChange.bind(this));
		
	accesory.addService(this.service);
}

DigitalInput.prototype = { 	
 	stateChange: function(delta) {
 		var state = wpi.digitalRead(this.pin);
 		if(this.inverted)
 			state = !state;
		this.service.getCharacteristic(Characteristic.ContactSensorState).updateValue(state ? Characteristic.ContactSensorState.CONTACT_DETECTED : Characteristic.ContactSensorState.CONTACT_NOT_DETECTED);
 	},
 	
 	getState: function(callback) {
 		var state = wpi.digitalRead(this.pin);
 		if(this.inverted)
 			state = !state;
 		callback(null, state ? Characteristic.ContactSensorState.CONTACT_DETECTED : Characteristic.ContactSensorState.CONTACT_NOT_DETECTED);
	}
}

function DigitalOutput(accesory, log, config) {
	this.log = log;
	this.pin = config.pin;
	this.inverted = config.inverted || false;
	
	wpi.pinMode(this.pin, wpi.OUTPUT);
	
	this.service = new Service[config.type](config.name);
	this.service.getCharacteristic(Characteristic.On)
		.on('set', this.setOn.bind(this))
		.on('get', this.getOn.bind(this));
		
	accesory.addService(this.service);
}

DigitalOutput.prototype = {
  setOn: function(value, callback) {
 		if(this.inverted)
 			value = !value;
 		wpi.digitalWrite(this.pin, value ? wpi.HIGH : wpi.LOW);
 		callback();
	},
	
	getOn: function(callback) {
		var state = wpi.digitalRead(this.pin);
 		if(this.inverted)
 			state = !state;
 		callback(null, state ? 1 : 0);
	}
}

function PIRSensor(accesory, log, config) {
	this.log = log;
	this.pin = config.pin;
	
	this.service = new Service[config.type](config.name);
	this.service.getCharacteristic(Characteristic.MotionDetected)
		.on('get', this.getState.bind(this));
		
	wpi.pinMode(this.pin, wpi.INPUT);
	wpi.wiringPiISR(this.pin, wpi.INT_EDGE_BOTH, this.stateChange.bind(this));
	
	accesory.addService(this.service);
	if(config.occupancy) {
		if(!config.occupancy.name) throw new Error("'name' parameter is missing for occupancy");
		this.occupancy = new Service.OccupancySensor(config.occupancy.name);
		this.occupancyTimeout = (config.occupancy.timeout || 60) * 1000;
		accesory.addService(this.occupancy);
	}
}

PIRSensor.prototype = {
  stateChange: function(delta) {
 		var state = wpi.digitalRead(this.pin);
		this.service.getCharacteristic(Characteristic.MotionDetected).updateValue(state ? 1 : 0);
		if(this.occupancy)
			this.occupancyUpdate(state);
 	},
 	
 	getState: function(callback) {
 		var state = wpi.digitalRead(this.pin);
 		if(this.inverted)
 			state = !state;
 		callback(null, state ? 1 : 0);
	},
 	
 	occupancyUpdate: function(state) {
 		var that = this;
    var characteristic = this.occupancy.getCharacteristic(Characteristic.OccupancyDetected);
    if(state) {
			characteristic.updateValue(Characteristic.OccupancyDetected.OCCUPANCY_DETECTED);
			if(this.occupancyTimeoutID != null) {
				clearTimeout(this.occupancyTimeoutID);
				this.occupancyTimeoutID = null;
			}
			this.presence = true;
		} else if(characteristic.value == Characteristic.OccupancyDetected.OCCUPANCY_DETECTED) { // On motion ends
			var that = this;
			this.occupancyTimeoutID = setTimeout(function(){
				characteristic.updateValue(Characteristic.OccupancyDetected.OCCUPANCY_NOT_DETECTED);
				that.occupancyTimeoutID = null;
			}, this.occupancyTimeout);
		}
  }
}

function RollerShutter(accesory, log, config) {
	if(config.pins.length != 2) throw new Error("'pins' parameter must contains 2 pin numbers");

	this.log = log;
	
	this.initPosition = config.initPosition || 0;
	this.openPin = config.pins[0];
	this.closePin = config.pins[1];
	
	this.service = new Service[config.type](config.name);
	this.shiftDuration = (config.shiftDuration || 20) * 10; // Shift duration in ms for a move of 1%
	this.shift = {id:null, start:0, value:0, target:0};
	
	wpi.pinMode(this.openPin, wpi.OUTPUT);
	wpi.pinMode(this.closePin, wpi.OUTPUT);
	wpi.digitalWrite(this.openPin, wpi.LOW);
	wpi.digitalWrite(this.closePin, wpi.LOW);
	
	this.posCharac = this.service.getCharacteristic(Characteristic.CurrentPosition)
		.updateValue(this.initPosition);
	this.service.getCharacteristic(Characteristic.TargetPosition)
		.on('set', this.setPosition.bind(this))
		.updateValue(this.initPosition);
		
	accesory.addService(this.service);
}

RollerShutter.prototype = {
  minMax: function(value) {
 		return Math.max(Math.min(value, 0), 100);
 	},
 	
 	setPosition: function(value, callback) {
 		var that = this;
		var currentPos = this.posCharac.value;
		
		// Nothing to do
		if(value == currentPos) {
			callback();
			return;
		}
		
		if(this.shift.id) {
			// Operation already in progress. Cancel timer and update computed current position
			clearTimeout(this.shift.id);
			this.shift.id = null;
			var moved = Math.round((Date.now() - this.shift.start) / this.shiftDuration);
			currentPos += Math.sign(this.shift.value) * moved;
			this.posCharac.updateValue(this.minMax(currentPos));
		}
		
		this.log("Requesting shifting " + currentPos + " -> " + value);
		
		var newShiftValue = value - currentPos;
		if(Math.sign(newShiftValue) != Math.sign(this.shift.value)) { // Change shifting direction
			this.pinPulse(newShiftValue);
		}
		this.shift.value = newShiftValue;
		this.shift.target = value;
		var duration = Math.abs(this.shift.value) * this.shiftDuration;
		this.shift.id = setTimeout(this.motionEnd.bind(this), duration);
		callback();
	},
	
	motionEnd: function() {
		if(this.shift.target < 100 && this.shift.target > 0) {
			this.pinPulse(this.shift.value); // Stop shutter by pulsing same pin another time
		}
		this.posCharac.updateValue(this.shift.target);
		this.log("Shifting ends at "+this.shift.target);
		this.shift.id = null;
		this.shift.start = 0;
		this.shift.value = 0;
		this.shift.target = 0;
	},
	
	pinPulse: function(shiftValue) {
		var pin = shiftValue > 0 ? this.openPin : this.closePin;
		this.log('Pulse pin ' + pin);
		this.shift.start = Date.now();
		wpi.digitalWrite(pin, wpi.HIGH);
		wpi.delay(200);
		wpi.digitalWrite(pin, wpi.LOW);
	}
}