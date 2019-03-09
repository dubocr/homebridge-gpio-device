var Accessory, Service, Characteristic, UUIDGen, Types;

var wpi = require('node-wiring-pi');

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
	if(!config.hasOwnProperty('pin') && !config.pins) throw new Error("'pin(s)' parameter is missing for accessory " + config.name);
	
	var infoService = new Service.AccessoryInformation();
	infoService.setCharacteristic(Characteristic.Manufacturer, 'Raspberry')
	infoService.setCharacteristic(Characteristic.Model, config.type)
	//infoService.setCharacteristic(Characteristic.SerialNumber, 'Raspberry');
	this.services.push(infoService);
	
	wpi.setup('wpi');
	switch(config.type) {
		case 'ContactSensor':
		case 'LeakSensor':
		case 'SmokeSensor':
		case 'CarbonDioxideSensor': 
			this.device = new DigitalInput(this, log, config);
		break;
		case 'Switch':
		case 'Lightbulb':
		case 'Outlet':
		case 'Faucet':
		case 'IrrigationSystem':
		case 'Valve':
			this.device = new DigitalOutput(this, log, config);
		break;
		case 'MotionSensor':
			this.device = new PIRSensor(this, log, config);
		break;
		case 'Window':
		case 'WindowCovering':
			this.device = new RollerShutter(this, log, config);
		break;
		case 'GarageDoorOpener':
			this.device = new GarageDoor(this, log, config);
		break;
		case 'LockMechanism':
			this.device = new LockMechanism(this, log, config);
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
	this.toggle = config.toggle || false;
	this.postpone = config.postpone || 100;
	
	this.HIGH = this.inverted ? wpi.LOW : wpi.HIGH;
 	this.LOW = this.inverted ? wpi.HIGH : wpi.LOW;
	
	this.ON_STATE = 1;
	this.OFF_STATE = 0;
	
	var service = new Service[config.type](config.name);
	
	switch(config.type) {
		case 'ContactSensor':
			this.stateCharac = service.getCharacteristic(Characteristic.ContactSensorState);
		break;
		case 'LeakSensor':
			this.stateCharac = service.getCharacteristic(Characteristic.LeakDetected);
		break;
		case 'SmokeSensor':
			this.stateCharac = service.getCharacteristic(Characteristic.ContactSensorState);
		break;
		case 'CarbonDioxideSensor':
			this.stateCharac = service.getCharacteristic(Characteristic.CarbonDioxideDetected);
		break;
		default:
			 throw new Error("Type " + config.type + " not supported");
		break;
	}
	this.stateCharac
		.on('get', this.getState.bind(this));
	
	wpi.pinMode(this.pin, wpi.INPUT);
	if(this.toggle)
		wpi.wiringPiISR(this.pin, this.inverted ? wpi.INT_EDGE_FALLING : wpi.INT_EDGE_RISING, this.toggleState.bind(this));
	else
		wpi.wiringPiISR(this.pin, wpi.INT_EDGE_BOTH, this.stateChange.bind(this));
		
	accesory.addService(service);
}

DigitalInput.prototype = { 	
 	stateChange: function(delta) {
 		if(this.postponeId == null) {
 			var that = this;
			this.postponeId = setTimeout(function() {
				that.postponeId = null;
				var state = wpi.digitalRead(that.pin);
				that.stateCharac.updateValue(state == this.HIGH ? this.ON_STATE : this.OFF_STATE);
			}, this.postpone);
 		}
 	},
 	
 	toggleState: function(delta) {
 		if(this.postponeId == null) {
 			var that = this;
			this.postponeId = setTimeout(function() {
				that.postponeId = null;
				var state = wpi.digitalRead(that.pin);
				if(state == this.HIGH) {
					this.stateCharac.updateValue(this.stateCharac.value == this.ON_STATE ? this.OFF_STATE : this.ON_STATE);
				}
			}, this.postpone);
 		}
 	},
 	
 	getState: function(callback) {
 		var state = wpi.digitalRead(this.pin);
 		callback(null, state == this.HIGH ? this.ON_STATE : this.OFF_STATE);
	}
}

function DigitalOutput(accesory, log, config) {
	this.log = log;
	this.pin = config.pin;
	this.inverted = config.inverted || false;
	this.duration = config.duration || false;
	this.initState = config.initState || 0;
	this.inputPin = config.inputPin || false;
	
	this.HIGH = this.inverted ? wpi.LOW : wpi.HIGH;
 	this.LOW = this.inverted ? wpi.HIGH : wpi.LOW;
		
	wpi.pinMode(this.pin, wpi.OUTPUT);
	wpi.digitalWrite(this.pin, this.initState ? this.HIGH : this.LOW);
	
	if(this.inputPin) {
		wpi.pinMode(this.inputPin, wpi.INPUT);
		wpi.wiringPiISR(this.inputPin, wpi.INT_EDGE_BOTH, this.stateChange.bind(this));
	}
	
	var service = new Service[config.type](config.name);
	
	switch(config.type) {
		case 'Valve':
		case 'IrrigationSystem':
			this.inputStateCharac = service.getCharacteristic(Characteristic.InUse);
		case 'Faucet':
			this.stateCharac = service.getCharacteristic(Characteristic.Active);
		break;
		case 'Switch':
		case 'Lightbulb':
		case 'Outlet':
			this.stateCharac = service.getCharacteristic(Characteristic.On);
		break;
		default:
			 throw new Error("Type " + config.type + " not supported");
		break;
	}
	this.stateCharac
		.on('set', this.setState.bind(this))
		.on('get', this.getState.bind(this));
	
	if(config.subType && config.type == 'Valve') {
		var type = Characteristic.ValveType.GENERIC_VALVE;
		switch(config.subType) {
			case 'irrigation':
				service.getCharacteristic(Characteristic.ValveType).updateValue(Characteristic.ValveType.IRRIGATION);
			break;
			case 'shower':
				service.getCharacteristic(Characteristic.ValveType).updateValue(Characteristic.ValveType.SHOWER_HEAD);
			break;
			case 'faucet':
				service.getCharacteristic(Characteristic.ValveType).updateValue(Characteristic.ValveType.WATER_FAUCET);
			break;
			case 'generic':
			default:
			break;
		}
	}
	
	accesory.addService(service);
}

DigitalOutput.prototype = {
	setState: function(value, callback) {
  		var that = this;
 		wpi.digitalWrite(this.pin, value ? this.HIGH : this.LOW);
 		if(this.duration) {
			setTimeout(function(){
				wpi.digitalWrite(that.pin, value ? that.LOW : that.HIGH);
				that.stateCharac.updateValue(!value);
				if(that.inputStateCharac && !that.inputPin) {
					that.inputStateCharac.updateValue(!value);
				}
			}, this.duration * 1000);
		}
		
		if(this.inputStateCharac && !this.inputPin) {
			this.inputStateCharac.updateValue(value);
		}
 		callback();
	},
	
	getState: function(callback) {
		var state = wpi.digitalRead(this.pin);
 		callback(null, state == this.HIGH ? 1 : 0);
	},
	
	stateChange: function(delta) {
 		var state = wpi.digitalRead(this.inputPin);
		if(this.inputStateCharac) {
			this.inputStateCharac.updateValue(state == this.HIGH ? 1 : 0);
		} else {
			wpi.digitalWrite(this.pin, state);
			this.stateCharac.updateValue(state == this.HIGH ? 1 : 0);
		}
 	}
}

function LockMechanism(accesory, log, config) {
	this.log = log;
	this.pin = config.pin;
	this.inverted = config.inverted || false;
	this.duration = config.duration || false;
	
	wpi.pinMode(this.pin, wpi.OUTPUT);
	wpi.digitalWrite(this.pin, this.inverted ? wpi.HIGH : wpi.LOW);
 	
	this.service = new Service[config.type](config.name);
	this.target = this.service.getCharacteristic(Characteristic.LockTargetState)
		.on('set', this.setLockState.bind(this))
		.updateValue(Characteristic.LockTargetState.SECURED);
	this.state = this.service.getCharacteristic(Characteristic.LockCurrentState)
		.on('get', this.getLockState.bind(this))
		.updateValue(Characteristic.LockCurrentState.SECURED);
	
	accesory.addService(this.service);
}

LockMechanism.prototype = {
  	setLockState: function(value, callback) {
  		var that = this;
 		var OPEN = this.inverted ? wpi.LOW : wpi.HIGH;
 		var CLOSE = this.inverted ? wpi.HIGH : wpi.LOW;
 		
 		if(value == Characteristic.LockTargetState.UNSECURED) {
 			wpi.digitalWrite(this.pin, OPEN);
 			this.state.updateValue(Characteristic.LockCurrentState.UNSECURED);
 			callback();
 			if(this.duration) {
				setTimeout(function(){
					wpi.digitalWrite(that.pin, CLOSE);
					that.target.updateValue(Characteristic.LockTargetState.SECURED);
					that.state.updateValue(Characteristic.LockCurrentState.SECURED);
				}, this.duration * 1000);
 			}
 		} else {
 			wpi.digitalWrite(that.pin, CLOSE);
 			this.state.updateValue(Characteristic.LockCurrentState.SECURED);
 			callback();
 		}
	},
	
	getLockState: function(callback) {
		var state = wpi.digitalRead(this.pin);
 		if(this.inverted)
 			state = !state;
 		callback(null, state ? Characteristic.LockCurrentState.UNSECURED : Characteristic.LockCurrentState.SECURED);
	}
}

function PIRSensor(accesory, log, config) {
	this.log = log;
	this.pin = config.pin;
	this.inverted = config.inverted || false;
	
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
 		if(this.inverted)
 			state = !state;
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
	
	this.inverted = config.inverted || false;
	this.initPosition = config.initPosition || 0;
	this.openPin = config.pins[0];
	this.closePin = config.pins[1];
	this.restoreTarget = config.restoreTarget || false;
	this.pulseDuration = config.pulseDuration != null ? config.pulseDuration : 200;
	
	this.HIGH = this.inverted ? wpi.LOW : wpi.HIGH;
 	this.LOW = this.inverted ? wpi.HIGH : wpi.LOW;
	
	this.service = new Service[config.type](config.name);
	this.shiftDuration = (config.shiftDuration || 20) * 10; // Shift duration in ms for a move of 1%
	this.shift = {id:null, start:0, value:0, target:0};
	
	wpi.pinMode(this.openPin, wpi.OUTPUT);
	wpi.pinMode(this.closePin, wpi.OUTPUT);
	wpi.digitalWrite(this.openPin, this.LOW);
	wpi.digitalWrite(this.closePin, this.LOW);
	
	this.posCharac = this.service.getCharacteristic(Characteristic.CurrentPosition)
		.updateValue(this.initPosition);
	this.targetPosCharac = this.service.getCharacteristic(Characteristic.TargetPosition)
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
			var diff = Date.now() - this.shift.start;
			if(diff > 1000) {
				// Operation already in progress. Cancel timer and update computed current position
				clearTimeout(this.shift.id);
				this.shift.id = null;
				var moved = Math.round(diff / this.shiftDuration);
				currentPos += Math.sign(this.shift.value) * moved;
				this.posCharac.updateValue(this.minMax(currentPos));
			} else {
				callback();
				return;
			}
		}
		
		this.log("Requesting shifting " + currentPos + " -> " + value);
		
		var newShiftValue = value - currentPos;
		if(Math.sign(newShiftValue) != Math.sign(this.shift.value)) { // Change shifting direction
			this.pinPulse(newShiftValue, true);
		}
		this.shift.value = newShiftValue;
		this.shift.target = value;
		var duration = Math.abs(this.shift.value) * this.shiftDuration;
		this.shift.id = setTimeout(this.motionEnd.bind(this), duration);
		callback();
	},
	
	motionEnd: function() {
		if(this.shift.target < 100 && this.shift.target > 0) {
			this.pinPulse(this.shift.value, false); // Stop shutter by pulsing same pin another time
		}
		
		if(this.restoreTarget) {
			this.posCharac.updateValue(this.initPosition);
			this.targetPosCharac.updateValue(this.initPosition);
		} else {
			this.posCharac.updateValue(this.shift.target);
		}
		this.log("Shifting ends at "+this.shift.target);
		this.shift.id = null;
		this.shift.start = 0;
		this.shift.value = 0;
		this.shift.target = 0;
	},
	
	pinPulse: function(shiftValue, start) {
		var pin = shiftValue > 0 ? this.openPin : this.closePin;
		var oppositePin = shiftValue > 0 ? this.closePin : this.openPin;
		this.shift.start = Date.now();
		if(this.pulseDuration) {
			this.log('Pulse pin ' + pin);
			wpi.digitalWrite(pin, this.HIGH);
			wpi.delay(this.pulseDuration);
			wpi.digitalWrite(pin, this.LOW);
		} else {
			if(start) {
				this.log('Start ' + pin + ' / Stop ' + oppositePin);
				wpi.digitalWrite(oppositePin, this.LOW);
				wpi.digitalWrite(pin, this.HIGH);
			} else {
				this.log('Stop ' + pin);
				wpi.digitalWrite(pin, this.LOW);
			}
		}
	}
}

function GarageDoor(accesory, log, config) {
	
	this.log = log;
	
	this.inverted = config.inverted || false;
	this.pulseDuration = config.pulseDuration != null ? config.pulseDuration : 200;
	this.cycleDuration = (config.cycleDuration || 0) * 1000;
	
	this.HIGH = this.inverted ? wpi.LOW : wpi.HIGH;
 	this.LOW = this.inverted ? wpi.HIGH : wpi.LOW;
 	
	this.service = new Service[config.type](config.name);
	
	if(config.pin === undefined) {
		if(config.pins.length != 2) throw new Error("'pins' parameter must contains 2 pin numbers");
		this.openPin = config.pins[0];
		this.closePin = config.pins[1];
		
		wpi.pinMode(this.openPin, wpi.OUTPUT);
		wpi.pinMode(this.closePin, wpi.OUTPUT);
		wpi.digitalWrite(this.openPin, this.LOW);
		wpi.digitalWrite(this.closePin, this.LOW);
	} else {
		this.togglePin = config.pin;
	
		wpi.pinMode(this.togglePin, wpi.OUTPUT);
		wpi.digitalWrite(this.togglePin, this.LOW);
	}
	
	this.stateCharac = this.service.getCharacteristic(Characteristic.CurrentDoorState);
	this.targetCharac = this.service.getCharacteristic(Characteristic.TargetDoorState);
	
	if(config.sensorPin !== undefined) {
		this.sensorPin = config.sensorPin;
		wpi.pinMode(this.sensorPin, wpi.INPUT);
		wpi.wiringPiISR(this.sensorPin, wpi.INT_EDGE_BOTH, this.stateChange.bind(this));
		
		this.stateChange();
	} else {
		this.sensorPin = null;
		this.stateCharac.updateValue(Characteristic.CurrentDoorState.CLOSED);
		this.targetCharac.updateValue(Characteristic.TargetDoorState.CLOSED);
	}
	
	this.targetCharac.on('set', this.setState.bind(this));
		
	accesory.addService(this.service);
}

GarageDoor.prototype = {
 	setState: function(value, callback) {
 		var that = this;
 		
 		if(this.cycleTimeoutID != null) {
			clearTimeout(this.cycleTimeoutID);
			this.cycleTimeoutID = null;
		}

		if(value == this.stateCharac.value) {
			callback();
			return;
		}
		
		var pin = null;
		if(this.togglePin === undefined) {
			pin = (value == Characteristic.TargetDoorState.OPEN) ? this.openPin : this.closePin;
		} else {
			pin = this.togglePin;
		}
		
		wpi.digitalWrite(pin, this.HIGH);
		wpi.delay(this.pulseDuration);
		wpi.digitalWrite(pin, this.LOW);
		callback();

		if(this.sensorPin == null) {
			this.stateCharac.updateValue(value == Characteristic.TargetDoorState.OPEN ? Characteristic.CurrentDoorState.OPEN : Characteristic.CurrentDoorState.CLOSED);
		}
		if(this.cycleDuration) {
			this.cycleTimeoutID = setTimeout(function(){
				that.stateCharac.updateValue(Characteristic.CurrentDoorState.CLOSED);
				that.targetCharac.updateValue(Characteristic.TargetDoorState.CLOSED);
				that.cycleTimeoutID = null;
			}, this.cycleDuration);
		}
	},
	
	stateChange: function(delta) {
 		var state = wpi.digitalRead(this.sensorPin);
		this.targetCharac.updateValue(state ? Characteristic.TargetDoorState.OPEN : Characteristic.TargetDoorState.CLOSED);
		this.stateCharac.updateValue(state ? Characteristic.CurrentDoorState.OPEN : Characteristic.CurrentDoorState.CLOSED);
 	},
}
