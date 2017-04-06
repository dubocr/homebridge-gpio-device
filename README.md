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
			"accesory": "GPIODevice",
			"name": "Front Door",
			"type": "ContactSensor",
			"pin": 4
		},
		{
			"accesory": "GPIODevice",
			"name": "Sofa Light",
			"type": "Lightbulb",
			"pin": 5
		},
		{
			"accesory": "GPIODevice",
			"name": "Kitchen Roller Shutter",
			"type": "WindowCovering",
			"pins": [12,13]
			"shiftDuration": 23
		}
	],

	"platforms":[]
}
```

`pin` numbers must be specified as wPi pin number in the `Pin Configuration` table below

## Common configuration
```
| Type                  | Note				|
|-----------------------|-------------|
| `name`								| Accessory name |
| `type`								| Type of accessory |
```

Accessory type could be one of the following:
* [ContactSensor](#contactsensor)
* [Switch](#switch/lightbulb)
* [Lightbulb](#switch/lightbulb)
* [MotionSensor](#motionsensor)
* [Window](#window/windowcovering)
* [WindowCovering](#window/windowcovering)

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

# Type of accesories

## ContactSensor

`ContactSensor` type monitor a GPIO input and reports it as HomeKit ContactSensor.

###### Configuration
```
| Parameter                  | Note 																							|
|----------------------------|----------------------------------------------------|
| `pin`               		   | mandatory, input pin number to monitor (HIGH : contact detected, LOW : contact not detected) |
| `inverted`               	 | optional, reverse the behaviour of the GPIO pin (LOW : contact detected, HIGH : contact not detected) |
```

## Switch/Lightbulb

`Switch` or `Lightbulb` operates a GPIO output as ON/OFF.

###### Configuration
```
| Parameter                  | Note 																							|
|----------------------------|----------------------------------------------------|
| `pin`               		   | mandatory, output pin number to trigger (on : HIGH, off : LOW) |
| `inverted`               	 | optional, reverse the behaviour of the GPIO pin  (off : HIGH, on : LOW) |
```

## MotionSensor

`MotionSensor` monitor a GPIO input and reports it as HomeKit MotionSensor.
Could be used with this [PIR Sensor](http://snootlab.com/adafruit/285-capteur-de-presence-pir.html).
An optional OccupancySensor can be configured with a timeout.

###### Configuration
```
| Parameter                  | Note 																							|
|----------------------------|----------------------------------------------------|
| `pin`               		   | mandatory, input pin number to monitor (HIGH : motion detected, LOW : motion not detected) |
| `occupancy`            		 | optional, activate an occupancy sensor with a timeout after motion detection |
| `occupancy.name`           | mandatory, occupancy sensor name |
| `occupancy.timeout`        | optional, ocupancy timeout in sec after motion detection, default: 60 sec |
```

## Window/WindowCovering

`Window` or `WindowCovering` controls 2 GPIO outputs plugged to a remote control.
When operating, the GPIO is turned on for 200ms to simulate a button pression on the remote control.

###### Configuration
```
| Parameter                  | Note 																							|
|----------------------------|----------------------------------------------------|
| `pins`               		   | mandatory, output pins numbers to trigger (pins[0] : open, pins[0] : close) |
| `shiftDuration`            | optional, duration of a shift (close->open or open->close) used to compute intermediate position, default: 20 seconds |
```