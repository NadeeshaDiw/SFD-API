const mqtt = require('mqtt');
const fs = require('fs');

let opts = {
    rejectUnauthorized: false,
    connectTimeout: 5000,
    qos: 1,
    port: 8883
}

const client = mqtt.connect('mqtts://ec2-3-82-205-65.compute-1.amazonaws.com:8883', opts);

const deviceCount = 2;//should be a DB call

function sendObjGen() {
    var sendtext = {
        "unAccess": false, //unAuthorized access
        "unlock": false,   //unlocking signal
        "order": {}        //Food delivery orders
    };
    return sendtext;
}

function recvObjGen(deviceid) {
    var recvtext = {
        "deviceid": deviceid,  //device ID
        "doorStatus": false, //box is opened or closed (false->Closed | true->Opened)
        "confirm": false
    };
    return recvtext;
}

const sendObj = [];
const receiveObj = [];

for (var count = 1; count <= deviceCount; count++) {
    sendObj[count] = sendObjGen();
    receiveObj[count] = recvObjGen(count);
}


// publish
function unAuthorizedAccess(deviceid, unAuth) { //function to send unauthorized access signal
    sendObj[parseInt(deviceid)].unAccess = unAuth;
    send(deviceid);
}

// publish
function unLockingSignal(deviceid, unLock) {  //function to send unlock signal
    sendObj[parseInt(deviceid)].unlock = unLock;
    send(deviceid);
}

// publish
function orders(deviceid, orderid, rfid) {  //function to send food order details
    sendObj[parseInt(deviceid)].order[orderid] = rfid;
    send(deviceid);
}

// subscribed
function doorStatusFunc(deviceid) {  // function to detect whether door is opened or not
    return receiveObj[parseInt(deviceid)].doorStatus;
}

// subscribed
function confirmed(deviceid) {  // function to detect whether door is opened or not
    return receiveObj[parseInt(deviceid)].confirm;
}

function send(deviceid) {  // function to publish data
    client.on('connect', () => {
        let topic = "back2device" + deviceid;
        client.publish(topic, JSON.stringify(sendObj[parseInt(deviceid)]));
        console.log(`published topic  : ${topic}`);
    });
}

/* ----------Methods to subscribe and take updates---------- */
client.on('connect', () => {  //subscribing to the topics
    try {
        let str = '';
        for (var count = 1; count <= deviceCount; count++) {
            var topic = "device2back" + count;
            client.subscribe(topic);
            str = str + topic + " ";
        }
        console.log(`subscribed topics: ${str}`);
    }
    catch (err) {
        console.log('subscribed error');
    }
});

client.on("message", (topic, message) => {  //receiving data from device
    //convert to string format and then convert to JSON format
    let temp = JSON.parse(message.toString());

    if (!temp.confirm & temp.doorStatus) {
        unAuthorizedAccess(temp.deviceid, true);
    }

    receiveObj[temp.deviceid] = temp;
});


module.exports.unAuthorizedAccess = unAuthorizedAccess;
module.exports.unLockingSignal = unLockingSignal;
module.exports.orders = orders;
module.exports.doorStatusFunc = doorStatusFunc;
module.exports.confirmed = confirmed;