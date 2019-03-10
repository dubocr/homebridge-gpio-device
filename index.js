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
		case 'CarbonMonoxideSensor':
			this.device = new DigitalInput(this, log, config);
		break;
		case 'Switch':
		case 'Lightbulb':
		case 'Outlet':
		case 'Fan':
		case 'Fanv2':
		case 'Faucet':
		case 'IrrigationSystem':
		case 'Valve':
		case 'Speaker':
		case 'Microphone':
			this.device = new DigitalOutput(this, log, config);
		break;
		case 'MotionSensor':
			this.device = new PIRSensor(this, log, config);
		break;
		case 'Door':
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
		case 'StatelessProgrammableSwitch':
			this.device = new ProgrammableSwitch(this, log, config);
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
			this.stateCharac = service.getCharacteristic(Characteristic.SmokeDetected);
		break;
		case 'CarbonDioxideSensor':
			this.stateCharac = service.getCharacteristic(Characteristic.CarbonDioxideDetected);
		break;
		case 'CarbonMonoxideSensor':
			this.stateCharac = service.getCharacteristic(Characteristic.CarbonMonoxideDetected);
		break;
		default:
			 throw new Error("Type " + config.type + " not supported");
		break;
	}
	this.stateCharac
		.on('get', this.getState.bind(this));
	
	wpi.pinMode(this.pin, wpi.INPUT);
	wpi.pullUpDnControl(this.pin, wpi.PUD_DOWN);
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
				that.stateCharac.updateValue(state == that.HIGH ? that.ON_STATE : that.OFF_STATE);
			}, this.postpone);
 		}
 	},
 	
 	toggleState: function(delta) {
 		if(this.postponeId == null) {
 			var that = this;
			this.postponeId = setTimeout(function() {
				that.postponeId = null;
				var state = wpi.digitalRead(that.pin);
				that.stateCharac.updateValue(that.stateCharac.value == that.ON_STATE ? that.OFF_STATE : that.ON_STATE);
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
		wpi.pullUpDnControl(this.inputPin, wpi.PUD_DOWN);
		wpi.wiringPiISR(this.inputPin, wpi.INT_EDGE_BOTH, this.stateChange.bind(this));
	}
	
	var service = new Service[config.type](config.name);
	
	switch(config.type) {
		case 'Valve':
		case 'IrrigationSystem':
			this.inputStateCharac = service.getCharacteristic(Characteristic.InUse);
		case 'Faucet':
		case 'Fanv2':
			this.stateCharac = service.getCharacteristic(Characteristic.Active);
		break;
		case 'Outlet':
			this.inputStateCharac = service.getCharacteristic(Characteristic.OutletInUse);
		case 'Switch':
		case 'Lightbulb':
		case 'Fan':
			this.stateCharac = service.getCharacteristic(Characteristic.On);
		break;
		case 'Speaker':
		case 'Microphone':
			this.stateCharac = service.getCharacteristic(Characteristic.Mute);
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
 		if(this.duration && this.durationTimeoutID == null) {
			this.durationTimeoutID = setTimeout(function(){
				that.durationTimeoutID = null;
				wpi.digitalWrite(that.pin, that.initState ? that.HIGH : that.LOW);
				that.stateCharac.updateValue(that.initState);
				if(that.inputStateCharac && !that.inputPin) {
					that.inputStateCharac.updateValue(that.initState);
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
	this.inputPin = config.inputPin != null ? config.inputPin : null;
	this.postpone = config.postpone || 100;
	
	this.HIGH = this.inverted ? wpi.LOW : wpi.HIGH;
 	this.LOW = this.inverted ? wpi.HIGH : wpi.LOW;
 	
	wpi.pinMode(this.pin, wpi.OUTPUT);
	wpi.digitalWrite(this.pin, this.inverted ? this.HIGH : this.LOW);
 	
 	if(this.inputPin) {
		wpi.pinMode(this.inputPin, wpi.INPUT);
		wpi.pullUpDnControl(this.inputPin, wpi.PUD_DOWN);
		wpi.wiringPiISR(this.inputPin, wpi.INT_EDGE_BOTH, this.stateChange.bind(this));
	}
	
	this.service = new Service[config.type](config.name);
	this.target = this.service.getCharacteristic(Characteristic.LockTargetState)
		.on('set', this.setLockState.bind(this));
	this.state = this.service.getCharacteristic(Characteristic.LockCurrentState);
		
	if(this.inputPin === null) {
		this.target.updateValue(Characteristic.LockCurrentState.SECURED);
		this.state.updateValue(Characteristic.LockCurrentState.SECURED);
	} else {
		this.stateChange();
	}
	
	accesory.addService(this.service);
}

LockMechanism.prototype = {
  	setLockState: function(value, callback) {
 		if(value == Characteristic.LockTargetState.UNSECURED) {
			this.log("Open LockMechanism on PIN: " + this.pin);
 			wpi.digitalWrite(this.pin, this.HIGH);
 			callback();
 			if(this.inputPin === null) {
 				this.state.updateValue(Characteristic.LockCurrentState.UNSECURED);
 			}
 			if(this.duration) {
				setTimeout(function(){
					this.log("Close LockMechanism on PIN: " + this.pin);
					wpi.digitalWrite(this.pin, this.LOW);
					this.target.updateValue(Characteristic.LockTargetState.SECURED);
					if(this.inputPin === null) {
						this.state.updateValue(Characteristic.LockCurrentState.SECURED);
					}
				}.bind(this), this.duration * 1000);
 			}
 		} else {
			this.log("Close LockMechanism on PIN: " + this.pin);
 			wpi.digitalWrite(this.pin, this.LOW);
 			callback();
 			if(this.inputPin === null) {
 				this.state.updateValue(Characteristic.LockCurrentState.SECURED);
 			}
 		}
	},
	
	getLockState: function(callback) {
		var state = wpi.digitalRead(this.pin);
 		callback(null, state == this.HIGH ? Characteristic.LockCurrentState.UNSECURED : Characteristic.LockCurrentState.SECURED);
	},
	
	stateChange: function(delta) {
		if(this.unbouncingID == null) {
			this.unbouncingID = setTimeout(function() {
				this.unbouncingID = null;
				var state = wpi.digitalRead(this.inputPin);
				this.state.updateValue(state == this.HIGH ? Characteristic.LockCurrentState.UNSECURED : Characteristic.LockCurrentState.SECURED);
 				this.target.updateValue(state == this.HIGH ? Characteristic.LockTargetState.UNSECURED : Characteristic.LockTargetState.SECURED);
			}.bind(this), this.postpone);
		}
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
	wpi.pullUpDnControl(this.pin, wpi.PUD_DOWN);
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
	this.shiftDuration = (config.shiftDuration || 20) * 10; // Shift duration in ms for a move of 1%
	this.pulseDuration = config.pulseDuration != null ? config.pulseDuration : 200;
	this.openSensorPin = config.openSensorPin != null ? config.openSensorPin : null;
	this.closeSensorPin = config.closeSensorPin != null ? config.closeSensorPin : null;
	this.invertedInputs = config.invertedInputs || false;
	this.postpone = config.postpone || 100;
	
	this.HIGH = this.inverted ? wpi.LOW : wpi.HIGH;
 	this.LOW = this.inverted ? wpi.HIGH : wpi.LOW;
	
	this.service = new Service[config.type](config.name);
	this.shift = {id:null, start:0, value:0, target:0};
	
	wpi.pinMode(this.openPin, wpi.OUTPUT);
	wpi.pinMode(this.closePin, wpi.OUTPUT);
	wpi.digitalWrite(this.openPin, this.LOW);
	wpi.digitalWrite(this.closePin, this.LOW);
	
	this.stateCharac = this.service.getCharacteristic(Characteristic.PositionState)
		.updateValue(Characteristic.PositionState.STOPPED);
	this.positionCharac = this.service.getCharacteristic(Characteristic.CurrentPosition)
		.updateValue(this.initPosition);
	this.targetCharac = this.service.getCharacteristic(Characteristic.TargetPosition)
		.on('set', this.setPosition.bind(this))
		.updateValue(this.initPosition);
	
	if(this.openSensorPin !== null) {
		wpi.pinMode(this.openSensorPin, wpi.INPUT);
		wpi.pullUpDnControl(this.openSensorPin, wpi.PUD_DOWN);
		wpi.wiringPiISR(this.openSensorPin, wpi.INT_EDGE_BOTH, this.stateChange.bind(this, this.openSensorPin));
		
		var state = wpi.digitalRead(this.openSensorPin);
		if(this.invertedInputs)
			state = !state;
		this.positionCharac.updateValue(state ? 100 : 0);
 		this.targetCharac.updateValue(state ? 100 : 0);
	}
	
	if(this.closeSensorPin !== null) {
		wpi.pinMode(this.closeSensorPin, wpi.INPUT);
		wpi.pullUpDnControl(this.closeSensorPin, wpi.PUD_DOWN);
		wpi.wiringPiISR(this.closeSensorPin, wpi.INT_EDGE_BOTH, this.stateChange.bind(this, this.closeSensorPin));
		
		var state = wpi.digitalRead(this.closeSensorPin);
		if(this.invertedInputs)
			state = !state;
		this.positionCharac.updateValue(state ? 0 : 100);
 		this.targetCharac.updateValue(state ? 0 : 100);
	}
	
	// Init default state if no sensors
	if (this.closeSensorPin === null && this.openSensorPin === null){
		this.positionCharac.updateValue(this.initPosition);
		this.targetCharac.updateValue(this.initPosition);
	}
	
	accesory.addService(this.service);
}

RollerShutter.prototype = {
  	minMax: function(value) {
 		return Math.max(Math.min(value, 0), 100);
 	},
 	
 	setPosition: function(value, callback) {
 		var that = this;
		var currentPos = this.positionCharac.value;
		
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
				this.positionCharac.updateValue(this.minMax(currentPos));
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
			this.positionCharac.updateValue(this.initPosition);
			this.targetCharac.updateValue(this.initPosition);
		} else {
			this.positionCharac.updateValue(this.shift.target);
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
	},
	
	stateChange: function(pin, delta) {
 		if(this.unbouncingID == null) {
			this.unbouncingID = setTimeout(function() {
				this.unbouncingID = null;
				
				var state = pin ? wpi.digitalRead(pin) : 0;
				if(this.invertedInputs)
					state = !state;
				if(pin === this.closeSensorPin) {
					if(state) {
						clearTimeout(this.shift.id);
						this.shift.id = null;
						this.targetCharac.updateValue(0);
						this.positionCharac.updateValue(0);
					}
					this.stateCharac.updateValue(state ? Characteristic.PositionState.STOPPED : Characteristic.PositionState.INCREASING);
				} else if(pin === this.openSensorPin) {
					if(state) {
						clearTimeout(this.shift.id);
						this.shift.id = null;
						this.targetCharac.updateValue(100);
						this.positionCharac.updateValue(100);
					}
					this.stateCharac.updateValue(state ? Characteristic.PositionState.STOPPED : Characteristic.PositionState.DECREASING);
				} else {
					this.targetCharac.updateValue(this.initState);
					this.positionCharac.updateValue(this.initState);
					this.stateCharac.updateValue(Characteristic.PositionState.STOPPED);
				}
			}.bind(this), this.postpone);
		}
 	}
}

function GarageDoor(accesory, log, config) {
	
	this.log = log;
	
	this.inverted = config.inverted || false;
	this.autoClose = config.autoClose || false;
	this.pulseDuration = config.pulseDuration != null ? config.pulseDuration : 200;
	this.shiftDuration = (config.shiftDuration || 5) * 1000;
	this.openSensorPin = config.openSensorPin != null ? config.openSensorPin : null;
	this.closeSensorPin = config.closeSensorPin != null ? config.closeSensorPin : null;
	this.invertedInputs = config.invertedInputs || false;
	
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
	
	if(this.openSensorPin !== null) {
		wpi.pinMode(this.openSensorPin, wpi.INPUT);
		wpi.pullUpDnControl(this.openSensorPin, wpi.PUD_DOWN);
		wpi.wiringPiISR(this.openSensorPin, wpi.INT_EDGE_BOTH, this.stateChange.bind(this, this.openSensorPin));
		
		var state = wpi.digitalRead(this.openSensorPin);
		if(this.invertedInputs)
			state = !state;
		this.stateCharac.updateValue(state ? Characteristic.CurrentDoorState.OPEN : Characteristic.CurrentDoorState.CLOSED);
 		this.targetCharac.updateValue(state ? Characteristic.TargetDoorState.OPEN : Characteristic.TargetDoorState.CLOSED);
	}
	
	if(this.closeSensorPin !== null) {
		wpi.pinMode(this.closeSensorPin, wpi.INPUT);
		wpi.pullUpDnControl(this.closeSensorPin, wpi.PUD_DOWN);
		wpi.wiringPiISR(this.closeSensorPin, wpi.INT_EDGE_BOTH, this.stateChange.bind(this, this.closeSensorPin));
		
		var state = wpi.digitalRead(this.closeSensorPin);
		if(this.invertedInputs)
			state = !state;
		this.stateCharac.updateValue(state ? Characteristic.CurrentDoorState.CLOSED : Characteristic.CurrentDoorState.OPEN);
 		this.targetCharac.updateValue(state ? Characteristic.TargetDoorState.CLOSED : Characteristic.TargetDoorState.OPEN);
	}
	
	// Init default state if no sensors
	if (this.closeSensorPin === null && this.openSensorPin === null){
		this.stateCharac.updateValue(Characteristic.CurrentDoorState.CLOSED);
		this.targetCharac.updateValue(Characteristic.TargetDoorState.CLOSED);
	}
	
	//this.stateCharac.on('get', this.getState.bind(this));
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

		if(this.closeSensorPin === null && this.openSensorPin === null && !this.shiftTimeoutID) {
			this.shiftTimeoutID = setTimeout(function(){
				this.stateCharac.updateValue(value == Characteristic.TargetDoorState.OPEN ? Characteristic.CurrentDoorState.OPEN : Characteristic.CurrentDoorState.CLOSED);
		
				if(value == Characteristic.TargetDoorState.OPEN && this.autoClose) {
					this.shiftTimeoutID = setTimeout(function(){
						this.stateCharac.updateValue(Characteristic.CurrentDoorState.CLOSED);
						this.targetCharac.updateValue(Characteristic.TargetDoorState.CLOSED);
						this.shiftTimeoutID = null;
					}.bind(this), this.shiftDuration);
				} else {
					this.shiftTimeoutID = null;
				}
			}.bind(this), this.shiftDuration);
		}
	},
 	
 	stateChange: function(pin, delta) {
 		if(this.unbouncingID == null) {
			this.unbouncingID = setTimeout(function() {
				this.unbouncingID = null;
				
				var state = pin ? wpi.digitalRead(pin) : 0;
				if(this.invertedInputs)
					state = !state;
				if(pin === this.closeSensorPin) {
					this.targetCharac.updateValue(state ? Characteristic.TargetDoorState.CLOSED : Characteristic.TargetDoorState.OPEN);
					this.stateCharac.updateValue(state ? Characteristic.CurrentDoorState.CLOSED : Characteristic.CurrentDoorState.OPENING);
					
					if(!state && this.openSensorPi === null && !this.shiftTimeoutID) {
						this.shiftTimeoutID = setTimeout(function(){
							this.stateCharac.updateValue(Characteristic.CurrentDoorState.OPEN);
							this.shiftTimeoutID = null;
						}.bind(this), this.shiftDuration);
					}
				} else if(pin === this.openSensorPin) {
					this.targetCharac.updateValue(state ? Characteristic.TargetDoorState.OPEN : Characteristic.TargetDoorState.CLOSED);
					this.stateCharac.updateValue(state ? Characteristic.CurrentDoorState.OPEN : Characteristic.CurrentDoorState.CLOSING);
					
					if(!state && this.closeSensorPin === null && !this.shiftTimeoutID) {
						this.shiftTimeoutID = setTimeout(function(){
							this.stateCharac.updateValue(Characteristic.CurrentDoorState.CLOSED);
							this.shiftTimeoutID = null;
						}.bind(this), this.shiftDuration);
					}
				} else {
					this.targetCharac.updateValue(Characteristic.TargetDoorState.CLOSED);
					this.stateCharac.updateValue(Characteristic.CurrentDoorState.CLOSED);
				}
			}.bind(this), 500);
		}
 	},
 	
 	getState: function(callback) {
 		var closeState = this.closeSensorPin !== null ? wpi.digitalRead(this.closeSensorPin) : 0;
 		var openState = this.openSensorPin !== null ? wpi.digitalRead(this.openSensorPin) : 0;
 		if(this.invertedInputs) {
			openState = !openState;
			closeState = !closeState;
		}
		if(closeState && !openState) {
			callback(null, Characteristic.CurrentDoorState.CLOSED);
		} else if(openState && !closeState) {
			callback(null, Characteristic.CurrentDoorState.OPEN);
		} else {
			callback(null, Characteristic.CurrentDoorState.CLOSED);
		}
 	}
}

function ProgrammableSwitch(accesory, log, config) {
	this.log = log;
	this.pin = config.pin;
	this.inverted = config.inverted || false;
	this.postpone = config.postpone || 100;
	this.shortPress = config.shortPress || 500;
	this.longPress = config.longPress || 2000;
	
	this.HIGH = this.inverted ? wpi.LOW : wpi.HIGH;
 	this.LOW = this.inverted ? wpi.HIGH : wpi.LOW;
 	
 	this.counter = 0;
 	this.start = null;
	
	var service = new Service[config.type](config.name);
	
	this.eventCharac = service.getCharacteristic(Characteristic.ProgrammableSwitchEvent);
	
	wpi.pinMode(this.pin, wpi.INPUT);
	wpi.pullUpDnControl(this.pin, wpi.PUD_DOWN);
	wpi.wiringPiISR(this.pin, wpi.INT_EDGE_BOTH, this.stateChange.bind(this));
		
	accesory.addService(service);
}

ProgrammableSwitch.prototype = { 	
 	stateChange: function(delta) {
 		if(this.postponeId == null) {
			this.postponeId = setTimeout(function() {
				this.postponeId = null;
				var state = wpi.digitalRead(this.pin);
				if(this.inverted)
					state = !state;
				if(state) {
					this.longPressPending = setTimeout(function() {
						this.eventCharac.updateValue(Characteristic.ProgrammableSwitchEvent.LONG_PRESS);
						this.longPressPending = null;
						this.counter = 0;
					}.bind(this), this.longPress);
				} else {
					this.counter++;
					if(this.longPressPending) {
						clearTimeout(this.longPressPending);
						if(this.pressPending) {
							clearTimeout(this.pressPending);
							this.eventCharac.updateValue(Characteristic.ProgrammableSwitchEvent.DOUBLE_PRESS);
							this.pressPending = null;
							this.counter = 0;
						} else {
							this.pressPending = setTimeout(function() {
								this.eventCharac.updateValue(Characteristic.ProgrammableSwitchEvent.SINGLE_PRESS);
								this.pressPending = null;
								this.counter = 0;
							}.bind(this), this.shortPress);
						}
					}
				}
			}.bind(this), this.postpone);
 		}
 	}
}
