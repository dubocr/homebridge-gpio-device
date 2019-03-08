# homebridge-gpio-device

Homebridge GPIO device expose several HomeKit accessories interacting with GPIO

# Installation

1. Install homebridge using: npm install -g homebridge
2. Install this plugin using: sudo npm install -g homebridge-gpio-device --unsafe-perm
3. Update your configuration file. See bellow for a sample.

homebridge-gpio-device use wiring-pi lib which require to run as root.
In /etc/systemd/system/homebridge.service, update : `User=root`

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
* [LeakSensor](#digitalinput)
* [SmokeSensor](#digitalinput)
* [CarbonDioxideSensor](#digitalinput)
* [Switch](#digitaloutput)
* [Lightbulb](#digitaloutput)
* [Outlet](#digitaloutput)
* [Faucet](#digitaloutput)
* [IrrigationSystem](#digitaloutput)
* [Valve](#digitaloutput)
* [MotionSensor](#motionsensor)
* [Window](#windowwindowcovering)
* [WindowCovering](#windowwindowcovering)
* [GarageDoorOpener](#garagedooropener)
* [LockMechanism](#lockmechanism)

## Pin Configuration

wPi pin number must be used in config file

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

`ContactSensor`, `SmokeSensor` types monitor a GPIO input and reports it as HomeKit Sensor.

###### Configuration

| Parameter                  | Type						| Default 	| Note 																							|
|----------------------------|--------------------------|---------------------------------------------------|
| `pin`               		 | Integer					| N/A	  	| mandatory, input pin number to monitor (HIGH : sensor triggered, LOW : sensor not triggered) |
| `inverted`               	 | Boolean					| false		| optional, reverse the behaviour of the GPIO pin (LOW : sensor triggered, HIGH : sensor not triggered) |
| `postpone`               	 | Integer					| 100		| optional, delay (ms) between 2 state change to avoid bouncing |


## DigitalOutput

`Switch`, `Lightbulb` or `Outlet` operates a GPIO output as ON/OFF.

###### Configuration

| Parameter                  | Type						| Default | Note 																							|
|----------------------------|----------------|---------|---------------------------------------------------|
| `pin`               		 | Integer				| N/A		| mandatory, output pin number to trigger (on : HIGH, off : LOW) |
| `inverted`               	 | Boolean				| false		| optional, reverse the behaviour of the GPIO pin (off : HIGH, on : LOW) |
| `initState`             	 | 0/1					| 0			| optional, default state of the switch at startup (0 : off, 1 : on) |
| `duration`             	 | Integer				| 0			| optional, duration before restoring output state (0 : disabled) |
| `inputPin`               	 | Integer				| N/A		| optional, input pin number used as go and come. Same state will be reported to the output |

###### Valve optional configuration

| Parameter                  | Type						| Default 	| Note 																							|
|----------------------------|----------------|---------|---------------------------------------------------|
| `subType`               	 | String					| "generic"	| optional, valve widget subtype like "irrigation", "shower" or "faucet" |
| `inputPin`               	 | Integer					| N/A		| optional, input pin number used as "InUse" characteristic for Valve widget |

## MotionSensor

`MotionSensor` monitor a GPIO input and reports it as HomeKit MotionSensor.
Could be used with this [PIR Sensor](http://snootlab.com/adafruit/285-capteur-de-presence-pir.html).
An optional OccupancySensor can be configured with a timeout.

###### Configuration

| Parameter                  | Type						| Default | Note 																							|
|----------------------------|----------------|---------|---------------------------------------------------|
| `pin`               		   | Integer				| N/A			| mandatory, input pin number to monitor (HIGH : motion detected, LOW : motion not detected) |
| `occupancy`            		 | {}							| null		| optional, activate an occupancy sensor with a timeout after motion detection |
| `occupancy.name`           | String					| N/A			| mandatory, occupancy sensor name |
| `occupancy.timeout`        | Integer (sec)	| 60			| optional, ocupancy timeout in sec after motion detection |
| `inverted`               	 | Boolean				| false		| optional, reverse the behaviour of the GPIO pin (HIGH : motion not detected, LOW : motion detected) |

## Window/WindowCovering

`Window` or `WindowCovering` controls 2 GPIO outputs plugged to a remote control.
When operating, the GPIO is turned on for 200ms to simulate a button pression on the remote control.

###### Configuration

| Parameter                  | Type						| Default | Note 																							|
|----------------------------|----------------|---------|---------------------------------------------------|
| `pins`               		   | Integer[2]			| N/A			| mandatory, output pins numbers to trigger (pins[0] : open, pins[1] : close) |
| `shiftDuration`            | Integer (sec)	| 20			| optional, duration of a shift (close->open or open->close) used to compute intermediate position |
| `initPosition`						 | Integer (%)		| 0				| optional, default shutter position at homebridge startup to compensate absence of state feedback, recommanded to ensure open/close scenarios after unexptected restart: 99% |
| `inverted`               	 | Boolean				| false		| optional, reverse the behaviour of the GPIO pin (pulse becomes HIGH->LOW->HIGH) |
| `pulseDuration`          	 | Integer				| 200		| optional, duration of the pin pulse. (0: deactivate, pin active during all shifting) |

## GarageDoorOpener

`GarageDoorOpener` controls 1 or 2 GPIO output(s) plugged to a garage door engine.
When operating, the GPIO is turned on for 200ms.

###### Configuration

| Parameter                  | Type						| Default | Note 																							|
|----------------------------|----------------|---------|---------------------------------------------------|
| `pin`               		   | Integer			| N/A			| optional, output pin number for toggle opener (first pulse: open, second pulse: close) |
| `pins`               		   | Integer[2]			| N/A			| optional, output pins numbers for open/close opener (pins[0] : open, pins[1] : close) |
| `sensorPin`                  | Integer			| N/A			| optional, input pin numbers for open/close sensor (LOW: closed, HIGH: open) |
| `inverted`               	 | Boolean				| false		| optional, reverse the behaviour of the GPIO pin (pulse becomes HIGH->LOW->HIGH) |
| `pulseDuration`          	 | Integer				| 200		| optional, duration of the pin pulse. |

## LockMechanism

`LockMechanism` operate a GPIO outputs plugged to an electric latch.
When operating, the latch is unlocked for `duration` seconds (or indefinitely if `duration=0`)

###### Configuration

| Parameter                  | Type						| Default | Note 																							|
|----------------------------|----------------|---------|---------------------------------------------------|
| `pin`               		 | Integer		  | N/A		| mandatory, output pin number to trigger (locked : LOW, unlocked : HIGH) |
| `duration`            	 | Integer (sec)  | 0		| optional, duration before restoring locked state (0 : disabled) |
| `inverted`				 | Boolean		  | false	| optional, reverse the behaviour of the GPIO pin (locked : HIGH, unlocked : LOW) |
