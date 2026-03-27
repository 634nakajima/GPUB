//Wi-Fi----------------------------------
char ssid[64] = "";
char password[64] = "";

//Server---------------------------------
char serverURL[128] = "";
int serverPort = 443;
SocketIOclient webSocket;

//Device Mode----------------------------
#define MODE_MOTOR 0
#define MODE_GPIO  1
int deviceMode = MODE_MOTOR;

//Motor----------------------------------
typedef enum {
  IDLE,
  MOVING
} MotorState;

volatile MotorState motorState = IDLE;
volatile int targetSteps = 0;
volatile int motorDirection = 1;    // 1=CW, -1=CCW
int stepInterval = 5;               // ms/step
volatile int stepPosition = 0;
volatile int stepIntervalCount = 0;
volatile int stepCount = 0;
bool motorMoveAckPending = false;

//Output Pins----------------------------
const int outputPins[] = {5, 17, 4, 15, 16}; // inA, inB, PoS, Vs2B, LED
const int NUM_OUTPUT_PINS = 5;

//Timer----------------------------------
Ticker ticker;

//Setup Mode-----------------------------
boolean testRunning = false;
boolean setupMode = true;
int pushed = 0;
unsigned long pushedTime = 0;
int testButton = 2;
int testPhase = 0;
int testCount = 0;
