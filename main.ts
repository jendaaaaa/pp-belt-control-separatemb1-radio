let NUM_STRIPS_PER_BELT = 2
let NUM_LEDS_PER_STRIP = 48

// LED PINS
let PIN_LA = DigitalPin.P0
let PIN_LB = DigitalPin.P1
let PIN_ARR_LEDS = [PIN_LA, PIN_LB]
let NUM_PIN_LEDS = PIN_ARR_LEDS.length

// MOTOR PINS
let PIN_MA = PCA9685.LEDNum.LED15
let PIN_MB = PCA9685.LEDNum.LED16
let PIN_ARR_MOTORS = [PIN_MA, PIN_MB]
let NUM_PIN_MOTORS = PIN_ARR_MOTORS.length

// NEOPIXEL
let stripA = neopixel.create(PIN_LA, NUM_LEDS_PER_STRIP, NeoPixelMode.RGB)
let stripB = neopixel.create(PIN_LB, NUM_LEDS_PER_STRIP, NeoPixelMode.RGB)
let STRIP_ARR = [stripA, stripB]
let delay = 0
let delay2 = 0
let NUM_GROUPS = 7
let NUM_LEDS_PER_GROUP = 2
let GAP_LEDS = 15
let groups: { start: number, end: number, color: number, speed: number }[] = [];

// BUTTONS
let PIN_BUT_LED = DigitalPin.P2
let PIN_BUT = DigitalPin.P8
pins.setPull(PIN_BUT, PinPullMode.PullUp)
let stripButton = neopixel.create(PIN_BUT_LED, 10, NeoPixelMode.RGB)

// COLORS
let COL_ORANGE = 16725760
let COL_BLUE = NeoPixelColors.Blue
let COL_EMPTY = NeoPixelColors.Black
let COL_GREEN = NeoPixelColors.Green
let COL_RED = NeoPixelColors.Red
let COL_FORWARD = COL_GREEN
let COL_STOP = COL_RED
let COL_BACKWARD = COL_ORANGE
let COL_WHITE = NeoPixelColors.White

// DEBOUNCING
let lastButtonState = 0
let lastDebounceTime = 0
let TIME_DEBOUNCE = 30
let buttonState = 1
let PIN_PRESSED = 0

// PCA9685
let motorA = 0
let motorB = 0
let MOTOR_ARR = [motorA, motorB]
let ADDRESS = PCA9685.chipAddress("0x40")

// SPEED
let STOP = 0
let SPEED = 100
let SPEED_SLOW = 20

// LIGHT
let LED_BRIGHTNESS = 255
let DELAY_STRIP_STOP = 500
let DELAY_STRIP = 200
let DELAY_STRIP_SLOW = 100
let ledPositions: number[] = []

/////////////////////////////////////////////////////////////
//// RADIO
radio.setGroup(10)

/////////////////////////////////////////////////////////////
//// RANDOM STATES
// VARIABLES
let timeUntilNext = 0
let timePreviousCheck = 0
let timeCheck = 0
let availableState = 0
let stateActive = false

// TIME CONSTANTS
let TIME_TO_CHOOSE = 600
let TIME_INTERVAL_MAX = 5
let TIME_INTERVAL_MIN = 1
let TIME_STATE_STOP = 2000
let TIME_STATE_FORWARD = 4000
let TIME_STATE_BACKWARD = 2000

/////////////////////////////////////////////////////////////
//// STATE MACHINE CONSTANTS
// MOTORS
let STATE_STOP = 0
let STATE_FORWARD = 1
let STATE_BACKWARD = 2
let STATE_NONE = -1
let STATE_ARR = [STATE_FORWARD, STATE_BACKWARD, STATE_STOP]
let NUM_STATE = STATE_ARR.length

/////////////////////////////////////////////////////////////
//// INIT
let buttonBusy = false
let state = STATE_NONE
let color = COL_WHITE
for (let i = 0; i < STRIP_ARR.length; i++) {
    STRIP_ARR[i].setBrightness(LED_BRIGHTNESS)
}
initLedPositions()
timePreviousCheck = input.runningTime()
timeUntilNext = randint(TIME_INTERVAL_MIN * 1000, TIME_INTERVAL_MAX * 1000)
availableState = STATE_NONE
PCA9685.reset(ADDRESS)
PCA9685.setLedDutyCycle(PIN_MA, motorA, ADDRESS)
PCA9685.setLedDutyCycle(PIN_MB, motorB, ADDRESS)

/////////////////////////////////////////////////////////////
//// RANDOM STATES
basic.forever(function () {
    if (input.runningTime() > timePreviousCheck + timeUntilNext) {
        if (!stateActive) {
            availableState = randint(0, 2)
            pause(TIME_TO_CHOOSE)
            timeUntilNext = randint(TIME_INTERVAL_MIN, TIME_INTERVAL_MAX) * 1000
            timePreviousCheck = input.runningTime()
        }
    } else {
        availableState = STATE_NONE
    }
})

/////////////////////////////////////////////////////////////
//// MOTOR MODES
basic.forever(function () {
    if (state === STATE_STOP) {
        if (input.runningTime() < timeCheck + TIME_STATE_STOP) {
            motorA = STOP
            motorB = STOP
            color = COL_STOP
            delay = DELAY_STRIP_STOP
            stateActive = true
        } else {
            state = STATE_NONE
            stateActive = false
            timePreviousCheck = input.runningTime()
        }
    } else if (state === STATE_FORWARD) {
        if (input.runningTime() < timeCheck + TIME_STATE_FORWARD) {
            motorA = STOP
            motorB = SPEED
            color = COL_FORWARD
            delay = DELAY_STRIP
            stateActive = true
        } else {
            state = STATE_NONE
            stateActive = false
            timePreviousCheck = input.runningTime()
        }
    } else if (state === STATE_BACKWARD) {
        if (input.runningTime() < timeCheck + TIME_STATE_FORWARD) {
            motorA = SPEED
            motorB = STOP
            color = COL_BACKWARD
            delay = DELAY_STRIP
            stateActive = true
        } else {
            state = STATE_NONE
            stateActive = false
            timePreviousCheck = input.runningTime()
        }
    } else if (state === STATE_NONE) {
        motorA = STOP
        motorB = SPEED_SLOW
        color = COL_WHITE
        delay = DELAY_STRIP_SLOW
        stateActive = false
    }

    PCA9685.setLedDutyCycle(PIN_MA, motorA, ADDRESS)
    PCA9685.setLedDutyCycle(PIN_MB, motorB, ADDRESS)
})

/////////////////////////////////////////////////////////////
//// LED STRIPS
basic.forever(function () {
    stripA.clear()
    stripB.clear()
    for (let i = 0; i < ledPositions.length; i++) {
        if (state === STATE_STOP) {
            //
        } else if (state === STATE_BACKWARD) {
            ledPositions[i]++
            if (ledPositions[i] >= NUM_LEDS_PER_STRIP) {
                ledPositions[i] = 0
            }
        } else if (state === STATE_FORWARD) {
            ledPositions[i]--
            if (ledPositions[i] < 0) {
                ledPositions[i] = NUM_LEDS_PER_STRIP - 1
            }
        } else if (state === STATE_NONE) {
            ledPositions[i]--
            if (ledPositions[i] < 0) {
                ledPositions[i] = NUM_LEDS_PER_STRIP - 1
            }
        }
        stripA.setPixelColor(ledPositions[i], color)
        stripB.setPixelColor(ledPositions[i], color)
    }
    stripA.show()
    stripB.show()
    pause(delay)
})

/////////////////////////////////////////////////////////////
//// BUTTONS
basic.forever(function () {
    debounceButton()
    if (!buttonBusy && !stateActive) {
        if (availableState === STATE_STOP) {
            stripButton.showColor(COL_STOP)
        } else if (availableState === STATE_FORWARD) {
            stripButton.showColor(COL_FORWARD)
        } else if (availableState === STATE_BACKWARD) {
            stripButton.showColor(COL_BACKWARD)
        } else if (availableState === STATE_NONE) {
            stripButton.showColor(COL_WHITE)
        }
    }
})

/////////////////////////////////////////////////////////////
//// FUNCTIONS
function debounceButton() {
    let currentTime = input.runningTime()
    let buttonRead = pins.digitalReadPin(PIN_BUT)
    if (buttonRead !== lastButtonState) {
        lastDebounceTime = currentTime
    }
    if (input.runningTime() - lastDebounceTime > TIME_DEBOUNCE) {
        if (buttonRead !== buttonState) {
            buttonState = buttonRead
            if (buttonState === PIN_PRESSED) {
                buttonBusy = true
                stripButton.showColor(COL_BLUE)
                state = availableState
                timeCheck = input.runningTime()
            } else {
                buttonBusy = false
            }
        }
    }
    lastButtonState = buttonRead
}

function initLedPositions() {
    let gapBetweenFirstOfGroup = Math.round(NUM_LEDS_PER_STRIP / NUM_GROUPS)
    for (let i = 0; i < NUM_LEDS_PER_STRIP; i++) {
        if ((i - NUM_LEDS_PER_GROUP) % NUM_GROUPS === 0) {
            for (let j = 0; j < NUM_LEDS_PER_GROUP; j++) {
                ledPositions.push(i - j)
            }
        }
    }
}