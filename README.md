# homebridge-gpio-device

Homebridge GPIO device expose several HomeKit accessories interacting with GPIO

# Installation

1. Install homebridge using: `npm install -g homebridge`
2. Install wiringPi using: `sudo apt-get install wiringpi`
3. Add rights to homebridge user if running homebridge as systemd service: `sudo usermod -G gpio homebridge`
4. Install this plugin using: `npm install -g homebridge-gpio-device`
5. Update your configuration file. See bellow for a sample.

# Wiring

Any inputs are configured with pull-up resistor and considered as active on low state.
Sensors must be plug as following

`GND <---> SENSOR <---> PIN`

Sensors are considered as _Normally Opened_ by default. If using _Normally Closed_ sensor, you can use `inverted` or `invertedInputs` parameters as explained in the next section.
Pull-up resistors can be disabled by adding parameter `"pullUp": false` in any accessory using inputs. If disabled, you'll have to wire pull-up or pull-down resistors by yourself.

###### Note

In the section bellow, `LOW` state means _sensor contact closed_. `HIGH` state means _sensor contact opened_.
For outputs, `LOW` state means 0V and `HIGH` state means 3.3V.

# Configuration

Configuration example:
```
{
	"bridge": {
		...
	},

	"description": "...",

	"accessories": [
		{
			"accessory": "GPIODevice",
			"name": "Front Door",
			"type": "ContactSensor",
			"pin": 4
		},
		{
			"accessory": "GPIODevice",
			"name": "Sofa Light",
			"type": "Lightbulb",
			"pin": 5
		},
		{
			"accessory": "GPIODevice",
			"type": "MotionSensor",
			"name": "Hall Motion",
			"pin": 3,
			"occupancy": {
				"name": "Home Occupancy",
				"timeout": 3600
			}
		},
		{
			"accessory": "GPIODevice",
			"name": "Kitchen Roller Shutter",
			"type": "WindowCovering",
			"pins": [12,13]
			"shiftDuration": 23,
			"initPosition": 99
		},
		{
			"accessory": "GPIODevice",
			"type": "LockMechanism",
			"name": "Front Door",
			"pin": 6,
			"duration": 5
		},
		{
			"accessory": "GPIODevice",
			"type": "Valve",
			"name": "Garden irrigation",
			"subType": "irrigation",
			"pin": 6
		},
		{
			"accessory": "GPIODevice",
			"type": "StatelessProgrammableSwitch",
			"name": "Push Button",
			"pin": 4
		}
	],

	"platforms":[]
}
```

`pin` numbers must be specified as wPi pin number in the `Pin Configuration` table below

## Common configuration

| Type                  | Note							|
|-----------------------|-------------------|
| `name`								| Accessory name 		|
| `type`								| Type of accessory |


Accessory type could be one of the following:
* [ContactSensor](#digitalinput)
* [MotionSensor](#digitalinput)
* [LeakSensor](#digitalinput)
* [SmokeSensor](#digitalinput)
* [CarbonDioxideSensor](#digitalinput)
* [Switch](#digitaloutput)
* [Lightbulb](#digitaloutput)
* [Outlet](#digitaloutput)
* [Valve](#digitaloutput)
* [Window](#positionopener)
* [WindowCovering](#positionopener)
* [Door](#positionopener)
* [GarageDoorOpener](#garagedooropener)
* [LockMechanism](#lockmechanism)
* [StatelessProgrammableSwitch](#programmableswitch)
* [Doorbell](#programmableswitch)

## Pin Configuration

wPi pin number must be used in config file

`gpio readall`
```
 +-----+-----+---------+------+---+---Pi 2---+---+------+---------+-----+-----+
 | BCM | wPi |   Name  | Mode | V | Physical | V | Mode | Name    | wPi | BCM |
 +-----+-----+---------+------+---+----++----+---+------+---------+-----+-----+
 |     |     |    3.3v |      |   |  1 || 2  |   |      | 5v      |     |     |
 |   2 |   8 |   SDA.1 |  OUT | 0 |  3 || 4  |   |      | 5V      |     |     |
 |   3 |   9 |   SCL.1 |   IN | 1 |  5 || 6  |   |      | 0v      |     |     |
 |   4 |   7 | GPIO. 7 |   IN | 1 |  7 || 8  | 1 | ALT0 | TxD     | 15  | 14  |
 |     |     |      0v |      |   |  9 || 10 | 1 | ALT0 | RxD     | 16  | 15  |
 |  17 |   0 | GPIO. 0 |   IN | 0 | 11 || 12 | 1 | IN   | GPIO. 1 | 1   | 18  |
 |  27 |   2 | GPIO. 2 |  OUT | 0 | 13 || 14 |   |      | 0v      |     |     |
 |  22 |   3 | GPIO. 3 |   IN | 0 | 15 || 16 | 0 | IN   | GPIO. 4 | 4   | 23  |
 |     |     |    3.3v |      |   | 17 || 18 | 0 | IN   | GPIO. 5 | 5   | 24  |
 |  10 |  12 |    MOSI |   IN | 0 | 19 || 20 |   |      | 0v      |     |     |
 |   9 |  13 |    MISO |   IN | 0 | 21 || 22 | 0 | IN   | GPIO. 6 | 6   | 25  |
 |  11 |  14 |    SCLK |   IN | 0 | 23 || 24 | 1 | IN   | CE0     | 10  | 8   |
 |     |     |      0v |      |   | 25 || 26 | 1 | IN   | CE1     | 11  | 7   |
 |   0 |  30 |   SDA.0 |   IN | 1 | 27 || 28 | 1 | IN   | SCL.0   | 31  | 1   |
 |   5 |  21 | GPIO.21 |   IN | 1 | 29 || 30 |   |      | 0v      |     |     |
 |   6 |  22 | GPIO.22 |   IN | 1 | 31 || 32 | 0 | IN   | GPIO.26 | 26  | 12  |
 |  13 |  23 | GPIO.23 |   IN | 0 | 33 || 34 |   |      | 0v      |     |     |
 |  19 |  24 | GPIO.24 |   IN | 0 | 35 || 36 | 0 | IN   | GPIO.27 | 27  | 16  |
 |  26 |  25 | GPIO.25 |   IN | 0 | 37 || 38 | 0 | IN   | GPIO.28 | 28  | 20  |
 |     |     |      0v |      |   | 39 || 40 | 0 | IN   | GPIO.29 | 29  | 21  |
 +-----+-----+---------+------+---+----++----+---+------+---------+-----+-----+
 | BCM | wPi |   Name  | Mode | V | Physical | V | Mode | Name    | wPi | BCM |
 +-----+-----+---------+------+---+---Pi 2---+---+------+---------+-----+-----+
```

# Type of accessories

## DigitalInput

`ContactSensor`, `MotionSensor`, `LeakSensor`, `SmokeSensor`, `CarbonDioxideSensor` and `CarbonMonoxideSensor` types monitor a GPIO input and report it as HomeKit Sensor.

###### Configuration

| Parameter                  | Type				| Default 	| Note																																									|
|----------------------------|------------------|-----------|-----------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| `pin`               		 | Integer			| N/A	  	| mandatory, input pin number to monitor (LOW: sensor triggered, HIGH: sensor not triggered)																			|
| `inverted`               	 | Boolean			| false		| optional, reverse the behaviour of the GPIO **input** pin (HIGH: sensor triggered, LOW: sensor not triggered)																	|
| `postpone`               	 | Integer			| 100		| optional, delay (ms) between 2 state change to avoid bouncing																											|
###### MotionSensor additional parameters

`MotionSensor` has optional OccupancySensor wich can be configured with a timeout.
Could be used with this [PIR Sensor](http://snootlab.com/adafruit/285-capteur-de-presence-pir.html).

| Parameter                  | Type				| Default 	| Note																																									|
|----------------------------|------------------|-----------|-----------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| `occupancy`            	 | {}				| null		| optional, activate an occupancy sensor with a timeout after motion detection																							|
| `occupancy.name`           | String			| N/A		| mandatory, occupancy sensor name																																		|
| `occupancy.timeout`        | Integer (sec)	| 60		| optional, ocupancy timeout in sec after motion detection																												|

## DigitalOutput

`Switch`, `Lightbulb`, `Outlet`, `Fan`, `Fanv2` and `Valve` operates a GPIO output as ON/OFF.

###### Configuration

| Parameter                  | Type				| Default 	| Note																																									|
|----------------------------|------------------|-----------|-----------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| `pin`               		 | Integer			| N/A		| mandatory, output pin number to trigger (on: HIGH, off: LOW)																										|
| `inverted`               	 | Boolean			| false		| optional, reverse the behaviour of the GPIO **output** pin (on: LOW, off: HIGH)																								|
| `initState`             	 | 0/1				| 0			| optional, default state of the switch at startup (0: off, 1: on)																									|
| `duration`             	 | Integer			| 0			| optional, duration before restoring output state (0: disabled)																										|
| `inputPin`               	 | Integer			| N/A		| optional, input pin number used as mirroring.	(LOW: switch to on, HIGH: switch to off)																				|

###### Valve optional configuration

| Parameter                  | Type				| Default 	| Note																																									|
|----------------------------|------------------|-----------|-----------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| `subType`               	 | String			| "generic"	| optional, valve widget subtype like "irrigation", "shower" or "faucet"																								|
| `inputPin`               	 | Integer			| N/A		| optional, input pin number used as "InUse" characteristic for Valve widget. (LOW: in use, HIGH: not in use)														|

## ProgrammableSwitch

`StatelessProgrammableSwitch` or `Doorbell` types monitor a GPIO input and reports it as HomeKit Stateless Programmable Switch.

###### Configuration

| Parameter                  | Type				| Default 	| Note																																									|
|----------------------------|------------------|-----------|-----------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| `pin`               		 | Integer			| N/A	  	| mandatory, input pin number to monitor (LOW: button pressed, HIGH: button released)																					|
| `inverted`               	 | Boolean			| false		| optional, reverse the behaviour of the GPIO **output** pin (HIGH: button pressed, LOW: button released)																		|
| `shortPress`             	 | Integer			| 500		| optional, delay (ms) of a short press (double press will be detected if done in this delay)																			|
| `longPress`              	 | Integer			| 2000		| optional, delay (ms) of a long press																																	|
| `postpone`               	 | Integer			| 100		| optional, delay (ms) between 2 state change to avoid bouncing																											|

## PositionOpener

`Window`, `WindowCovering` or `Door` controls 2 GPIO outputs plugged to a remote control.
When operating, the GPIO is turned on for 200ms to simulate a button pression on the remote control.

###### Configuration

| Parameter                  | Type				| Default 	| Note																																									|
|----------------------------|------------------|-----------|-----------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| `pins`               		 | Integer[2]		| N/A	  	| mandatory, output pins numbers to trigger (pins[0]: open, pins[1]: close)																							|
| `inverted`               	 | Boolean			| false		| optional, reverse the behaviour of the GPIO **output** pin(s) (pulse becomes HIGH->LOW->HIGH)																						|
| `initPosition`			 | Integer (%)		| 0			| optional, default shutter position at homebridge startup to compensate absence of state feedback, recommanded to ensure open/close scenarios after unexptected restart: 99% |
| `shiftDuration`            | Integer (sec)	| 20		| optional, duration of a shift (close->open or open->close) used to compute intermediate position																		|
| `pulseDuration`          	 | Integer			| 200		| optional, duration of the pin pulse. (0: deactivate, pin active during all shifting)																					|
| `openSensorPin`            | Integer			| N/A		| optional, input pin number for open sensor (LOW: opened position)																												|
| `closeSensorPin`           | Integer			| N/A		| optional, input pin number for close sensor (LOW: closed position)																												|
| `invertedInputs`         	 | Boolean			| false		| optional, reverse the behaviour of the GPIO **input** pins (detect opened/closed on HIGH state)																				|

## GarageDoorOpener

`GarageDoorOpener` controls 1 or 2 GPIO output(s) plugged to a garage door engine.
When operating, the GPIO is turned on for 200ms.

###### Configuration

| Parameter                  | Type				| Default 	| Note																																									|
|----------------------------|------------------|-----------|-----------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| `pin`               		 | Integer			| N/A		| optional, output pin number for toggle opener (first pulse: open, second pulse: close)																				|
| `pins`               		 | Integer[2]		| N/A		| optional, output pins numbers for open/close opener (pins[0]: open, pins[1]: close)																					|
| `inverted`               	 | Boolean			| false		| optional, reverse the behaviour of the GPIO **output** pin(s) (pulse becomes HIGH->LOW->HIGH)																						|
| `openingDuration`          | Integer			| 10		| optional, opening duration of the door (seconds). Emulate transition if closedSensorPin not provided.																	|
| `closingDuration`          | Integer			| 10		| optional, closing duration of the door (seconds). Emulate transition if openSensorPin not provided.																	|
| `waitingDuration`          | Integer			| N/A		| optional, waiting duration of the door shift before closing (seconds). If setted, emulate a cyclic door if openSensorPin not provided.									|
| `pulseDuration`          	 | Integer			| 200		| optional, duration of the pin pulse.																																	|
| `openSensorPin`            | Integer			| N/A		| optional, input pin number for open sensor (LOW: opened position)																										|
| `closeSensorPin`           | Integer			| N/A		| optional, input pin number for close sensor (LOW: closed position)																										|
| `invertedInputs`         	 | Boolean			| false		| optional, reverse the behaviour of the GPIO **input** pins (detect opened/closed on HIGH state)																				|


## LockMechanism

`LockMechanism` operate a GPIO outputs plugged to an electric latch.
When operating, the latch is unlocked for `duration` seconds (or indefinitely if `duration=0`)

###### Configuration

| Parameter                  | Type				| Default 	| Note																																									|
|----------------------------|------------------|-----------|-----------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| `pin`               		 | Integer		  	| N/A		| mandatory, output pin number to trigger (lock: LOW, unlock: HIGH)																								|
| `duration`            	 | Integer (sec)  	| 0			| optional, duration before restoring locked state (0 : disabled)																										|
| `inverted`				 | Boolean		  	| false		| optional, reverse the behaviour of the GPIO **output** pin (lock: HIGH, unlock: LOW)																						|
| `inputPin`               	 | Integer			| N/A		| optional, input pin number for lock sensor (LOW: unlocked, HIGH: locked)																								|
