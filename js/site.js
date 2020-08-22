// Variables

// Connection
var host = "127.0.0.1";
var port = "50000";
var pass = "stage";

// Settings
var stageScreen = 1;

// Application
var authenticated = false;
var wsUri = "ws://"+host+":"+port;
var stageScreenList;
var stageLayoutList;
var stageScreenUid;
var stageLayoutUid;

// End Variables

// WebSocket Functions

function connect() {
    $(".disconnected").show();
    webSocket = new WebSocket(wsUri+"/stagedisplay");
    webSocket.onopen = function(evt) { onOpen(evt) };
    webSocket.onclose = function(evt) { onClose(evt) };
    webSocket.onmessage = function(evt) { onMessage(evt) };
    webSocket.onerror = function(evt) { onError(evt) };
}

function onOpen(evt) {
    if (!authenticated) {
        webSocket.send('{"acn":"ath","ptl":610,"pwd":"'+pass+'"}');
        console.log('Connected');
    }
}

function onMessage(evt) {
    var obj = JSON.parse(evt.data);
    console.log("Message: "+evt.data);

    if (obj.acn == "ath" && obj.ath && authenticated == false) {
        // Set as authenticated
        authenticated = true;
        // Remove disconnected status
        $(".disconnected").hide();
        // Show connected status
        $(".connected").show();
        // Get current stage screens
        getStageScreens();
    } else if (obj.acn == "saa") {
        // Set current stage screens
        setStageScreens(obj);
    } else if (obj.acn == "asl") {
        // Set current stage layouts
        setStageLayouts(obj);
    } else if (obj.acn == "fv") {
        // Set current stage frame values
        setFrameValues(obj);
    } else if (obj.acn == "sys") {
        convertTimestamp(obj.txt);
    }
}

function onError(evt) {
    authenticated = false;
    console.error('Socket encountered error: ', evt.message, 'Closing socket');
    webSocket.close();
}

function onClose(evt) {
    authenticated = false;
    // Remove connected status
    $(".connected").hide();
    // Show disconnected status
    $(".disconnected").show();
    // Retry connection every second
    setTimeout(function() {
      connect();
    }, 1000);
}

//  End Web Socket Functions


// Cookie Functions

function setCookie(cname, cvalue, exdays) {
  var d = new Date();
  d.setTime(d.getTime() + (exdays*24*60*60*1000));
  var expires = "expires="+ d.toUTCString();
  document.cookie = cname + "=" + cvalue + ";" + expires + ";path=/";
}

function getCookie(cname) {
  var name = cname + "=";
  var decodedCookie = decodeURIComponent(document.cookie);
  var ca = decodedCookie.split(';');
  for(var i = 0; i <ca.length; i++) {
    var c = ca[i];
    while (c.charAt(0) == ' ') {
      c = c.substring(1);
    }
    if (c.indexOf(name) == 0) {
      return c.substring(name.length, c.length);
    }
  }
  return "";
}

function checkCookie(cname) {
    var name = getCookie(cname);
    if (name != "") {
        return true;
    } else {
        return false;
    }
}

// End Cookie Functions


// Stage Display Functions

function getStageScreens() {
    // Send the request to ProPresenter
    webSocket.send('{"acn":"saa"}');
}

function setStageScreens(obj) {
    // Initialise the stage screen list with the array from ProPresenter
    stageScreenList = obj.asgns;
    // Set the current stage screen UID
    stageScreenUid = stageScreenList[stageScreen-1].scnnme;
    // Set the current stage layout UID
    stageLayoutUid = stageScreenList[stageScreen-1].lytuid;
    // Get the stage layouts
    getStageLayouts();
}

function getStageLayouts() {
    // Send the request to ProPresenter
    webSocket.send('{"acn":"asl"}');
}

function setStageLayouts(obj) {
    // Initialise the stage layout list with the array from ProPresenter
    stageLayoutList = obj.ary
    // Display the stage layout
    displayStageLayout(stageLayoutUid);
}

function getFrameValues() {
    webSocket.send('{"acn":"fv","uid":"'+stageLayoutUid+'"}');
}

function setFrameValues(obj) {
    obj.ary.forEach(
        function (value) {
            if (value.acn != "tmr") {
                if (document.getElementById(value.acn) != null) {
                    console.log("Setting Frame: "+value.acn)
                    if (value.acn == "sys") {
                        document.getElementById("txt."+value.acn).innerHTML = convertTimestamp(value.txt);
                    } else {
                        document.getElementById("txt."+value.acn).innerHTML = value.txt.replace(/[\r\n\x0B\x0C\u0085\u2028\u2029]+/g, "\n");
                    }
                } else {
                    console.log("Unable to find Frame: "+value.acn)
                }
            } else {
                if (document.getElementById(value.acn) != null) {
                    console.log("Setting Frame: "+value.acn)
                    document.getElementById("txt."+value.acn).innerHTML = value.txt.replace(/[\r\n\x0B\x0C\u0085\u2028\u2029]+/g, "\n");
                } else {
                    console.log("Unable to find Frame: "+value.acn)
                }
            }

        }
    );
}

function displayStageLayout(uid) {
    stageData = "";
    // Iterate through the stage layout list
    stageLayoutList.forEach(
        function (layout) {
            // If the stage layout UID matches the requested UID
            if (layout.uid == uid) {
                // Create variable to hold borders status
                var bordered = "";
                // If the layout needs borders
                if (layout.brd) {
                    // Enable borders
                    bordered = "bordered";
                }
                layout.fme.forEach(
                    function (frame) {
                        stageData += '<div style="'+getFrameStyle(frame)+'" id="'+getFrameType(frame.typ, frame.uid)+'" class="stage-frame '+bordered+'">'
				            + '<div id="nme.'+getFrameType(frame.typ, frame.uid)+'" class="title">'+getFrameName(frame.nme, frame.typ)+'</div>'
            				+ '<div id="txt.'+getFrameType(frame.typ, frame.uid)+'" class="content"></div>'
	                        + '</div>';
                    }
                );

            }
        }
    );
    document.getElementById("main-area").innerHTML = stageData;
    getFrameValues();
}

// End Stage Display Functions


// Utility Functions

function getFrameType(type, uid) {
    switch(type) {
        case 1:
            return "cs";
        case 2:
            return "ns";
        case 3:
            return "csn";
        case 4:
            return "nsn";
        case 5:
            return "sm";
        case 6:
            return "sys";
        case 7:
            return "tmr."+uid;
        case 8:
            return "vid";
        case 9:
            return "chd";
    }
}

function getFrameName(name, type) {
    if (name == "") {
        switch(type) {
            case 1:
                return "Current Slide";
            case 2:
                return "Next Slide";
            case 3:
                return "Current Slide Notes";
            case 4:
                return "Next Slide Notes";
            case 5:
                return "Stage Message";
            case 6:
                return "Clock";
            case 7:
                return "Timer";
            case 8:
                return "Video Countdown";
            case 9:
                return "Chord Chart";
        }
    } else {
        return name;
    }
}

function getFrameStyle(frame) {
    var ufrList = frame.ufr.replace(/[{}]/g, "").split(",");
    var frameStyle = 'left: '+(ufrList[0]*100)+'%;'
        + 'bottom: '+(ufrList[1]*100)+'%;'
        + 'width: calc('+(ufrList[2]*100)+'% - 2px);'
        + 'height: calc('+(ufrList[3]*100)+'% - 2px);';
    frameStyle += 'font-size: '+frame.tSz+'px;';
    var frameColor = frame.tCl.split(" ");
    frameStyle += 'color: rgb('+getRGBValue(frameColor[0])+','+getRGBValue(frameColor[1])+','+getRGBValue(frameColor[2])+');';
    if (frame.tAl == 0) {
        frameStyle += 'text-align: left;';
    } else if (frame.tAl == 1) {
        frameStyle += 'text-align: right;';
    } else if (frame.tAl == 2) {
        frameStyle += 'text-align: center;';
    }
    return frameStyle;
}

function convertTimestamp(timestamp) {
    // Create a new JavaScript Date object based on the timestamp
    // multiplied by 1000 so that the argument is in milliseconds, not seconds.
    var date = new Date(timestamp * 1000);
    // Hours part from the timestamp
    var hours = date.getHours();
    // Minutes part from the timestamp
    var minutes = "0" + date.getMinutes();
    // Seconds part from the timestamp
    var seconds = "0" + date.getSeconds();

    // Will display time in 10:30:23 format
    // var formattedTime = hours + ':' + minutes.substr(-2) + ':' + seconds.substr(-2);
    var formattedTime = hours + ':' + minutes.substr(-2);

    return formattedTime;
}

function getRGBValue(int) {
    return 255 * int;
}

function getClockSmallFormat(obj) {
    if (obj.length > 6) {
        return obj.split(".")[0];
    } else {
        return obj;
    }
}

// End Utility Functions


// Initialisation Functions
function initialise() {

    // Make images non-draggable
    $("img").attr('draggable', false);

}

// When document is ready
$(document).ready(function() {
    initialise();
    connect();
});

// End Initialisation Functions
