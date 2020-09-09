// Variables

// Connection
var host = "172.16.101.32";
var port = "50000";
var pass = "stage";

// Settings
var stageScreen = 1;
var mustAuthenticate = true;
var changeHost = true;

// Application
var authenticated = false;
var wsUri;
var stageScreenList;
var stageLayoutList;
var stageScreenUid;
var stageLayoutUid;
var time24Hr;
var timeFormat;
var dateFormat;

// End Variables

// WebSocket Functions

function connect() {
    // Hide authenticate segment
    $("#authenticate").hide();
    // Display connecting to host text
    $("#connecting-to").text("Connecting to "+host);
    // Fade-in the loader and text
    $("#connecting-loader").fadeIn();
    // Show disconnected status
    $(".disconnected").show();
    // Set WebSocket uri
    wsUri = "ws://"+host+":"+port;
    // Create WebSocket
    webSocket = new WebSocket(wsUri+"/stagedisplay");
    // Define WebSocket actions
    webSocket.onopen = function(evt) { onOpen(evt) };
    webSocket.onclose = function(evt) { onClose(evt) };
    webSocket.onmessage = function(evt) { onMessage(evt) };
    webSocket.onerror = function(evt) { onError(evt) };
}

function onOpen(evt) {
    if (!authenticated) {
        // Send authentication data
        webSocket.send('{"acn":"ath","ptl":610,"pwd":"'+pass+'"}');
    }
}

function onMessage(evt) {
    var obj = JSON.parse(evt.data);
    if (obj.acn == "ath" && obj.ath && authenticated == false) {
        // Set as authenticated
        authenticated = true;
        // Set loading data status
        $("#connecting-to").text("Loading Data");
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
    } else if (obj.acn == "sys" || obj.acn == "msg" || obj.acn == "vid" || obj.acn == "tmr") {
        // Set frame value
        setFrameValue(obj);
    }
}

function onError(evt) {
    // Set authenticated to false
    authenticated = false;
    // Log the error to console
    console.error('Socket encountered error: ', evt.message, 'Closing socket');
    // Close the WebSocket
    webSocket.close();
}

function onClose(evt) {
    // Set authenticated to false
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
    // Send the request to ProPresenter
    webSocket.send('{"acn":"fv","uid":"'+stageLayoutUid+'"}');
}

function setFrameValues(obj) {
    // Iterate through each frame value
    obj.ary.forEach(
        function (value) {
            // Check if the frame is not a timer
            if (value.acn != "tmr") {
                // If the frame exists
                if (document.getElementById(value.acn) != null) {
                    // If this frame is the clock
                    if (value.acn == "sys") {
                        // Set the frame value
                        document.getElementById("txt."+value.acn).innerHTML = convertTimestamp(value.txt);
                    }
                    // If this frame is the video
                    else if (value.acn == "vid") {
                        // Check if the countdown is finished
                        if (value.txt == "-00:00:00") {
                            // Set the frame value
                            document.getElementById("txt."+value.acn).innerHTML = "--:--:--";
                        } else {
                            // Set the frame value
                            document.getElementById("txt."+value.acn).innerHTML = value.txt.replace(/[\r\n\x0B\x0C\u0085\u2028\u2029]+/g, "\n");
                        }
                    }
                    // If this frame is any other frame
                    else {
                        // Set the frame value
                        document.getElementById("txt."+value.acn).innerHTML = value.txt.replace(/[\r\n\x0B\x0C\u0085\u2028\u2029]+/g, "\n");
                    }
                }
            } else {
                // If the timer frame exists
                if (document.getElementById(value.acn+"."+value.uid) != null) {
                    // Set the frame value
                    document.getElementById("txt."+value.acn+"."+value.uid).innerHTML = value.txt.replace(/[\r\n\x0B\x0C\u0085\u2028\u2029]+/g, "\n");
                }
            }

        }
    );
    // Fit the values to the frame
    textFit(document.getElementsByClassName('content-container'), {minFontSize:10, maxFontSize: 1000});
}

function setFrameValue(obj) {
    // Check which frame type this is
    switch (obj.acn) {
        case "msg":
            // Set the frame value
            document.getElementById("txt."+obj.acn).innerHTML = obj.txt.replace(/[\r\n\x0B\x0C\u0085\u2028\u2029]+/g, "\n");
            break;
        case "vid":
            // If the countdown is finished
            if (obj.txt == "-00:00:00") {
                // Set the frame value
                document.getElementById("txt."+obj.acn).innerHTML = "--:--:--";
            } else {
                // Set the frame value
                document.getElementById("txt."+obj.acn).innerHTML = obj.txt.replace(/[\r\n\x0B\x0C\u0085\u2028\u2029]+/g, "\n");
            }
            break;
        case "sys":
            // If the clock frame exists
            if (document.getElementById("txt."+obj.acn) != null) {
                // Set the frame value
                document.getElementById("txt."+obj.acn).innerHTML = convertTimestamp(obj.txt);
            }
            break;
        case "tmr":
            // If the timer frame exists
            if (document.getElementById("txt.tmr."+obj.uid) != null) {
                // Set the frame value
                document.getElementById("txt.tmr."+obj.uid).innerHTML = obj.txt.replace(/[\r\n\x0B\x0C\u0085\u2028\u2029]+/g, "\n");
            }
            break;
    }
    // Fit the values to the frame
    textFit(document.getElementsByClassName('content-container'), {minFontSize:10, maxFontSize: 1000});
}

function displayStageLayout(uid) {
    // Create variable to hold stage data
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
                // Iterate through each layout frame
                layout.fme.forEach(
                    function (frame) {
                        if (frame.typ == 6) {
                            // Set 12/24hr time
                            time24Hr = frame.cf24;
                            // Set time format
                            timeFormat = frame.cfT;
                            // Set date format
                            dateFormat = frame.cfD;
                        }
                        // Add the frame to stage data
                        stageData += '<div style="'+getFrameStyle(frame)+'" id="'+getFrameType(frame.typ, frame.uid)+'" class="stage-frame '+bordered+'">'
				            + '<div id="nme.'+getFrameType(frame.typ, frame.uid)+'" class="title">'+getFrameName(frame.nme, frame.typ)+'</div>'
            				+ '<div class="content-container"><div id="txt.'+getFrameType(frame.typ, frame.uid)+'" class="content"></div></div>'
	                        + '</div>';
                    }
                );

            }
        }
    );
    // Add the stage data to the main area
    document.getElementById("main-area").innerHTML = stageData;
    // Get the frame values
    getFrameValues();
    // Fade out loading screen
    setTimeout(function(){$(".loading").fadeOut()}, 2000);
}

// End Stage Display Functions


// Utility Functions

function getFrameType(type, uid) {
    switch(type) {
        case 1:
            // Current Slide
            return "cs";
        case 2:
            // Next Slide
            return "ns";
        case 3:
            // Current Slide Notes
            return "csn";
        case 4:
            // Next Slide Notes
            return "nsn";
        case 5:
            // Stage Message
            return "msg";
        case 6:
            // Clock
            return "sys";
        case 7:
            // Timer
            return "tmr."+uid;
        case 8:
            // Video Countdown
            return "vid";
        case 9:
            // Chord charAt
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
    // Get the frame dimentions
    var ufrList = frame.ufr.replace(/[{}]/g, "").split(",");
    // Create variable to hold the frame style
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
    // Create date object based on the timestamp
    var date = new Date(timestamp * 1000);
    // Hours part from the timestamp
    var hours = date.getHours();
    // Minutes part from the timestamp
    var minutes = "0" + date.getMinutes();
    // Seconds part from the timestamp
    var seconds = "0" + date.getSeconds();
    // Create variable to hold formatted time
    var formattedTime = "";
    // Check the time format
    switch (timeFormat) {
        case 1:
            // Check if time is 24hr
            if (time24Hr) {
                formattedTime = hours + ':' + minutes.substr(-2);
            } else {
                converted = convertTo12Hr(date);
                formattedTime = converted[0] + ':' + minutes.substr(-2) + " " + converted[1];
            }
            break;
        default:
            // Check if time is 24hr
            if (time24Hr) {
                formattedTime = hours + ':' + minutes.substr(-2) + ':' + seconds.substr(-2);
            } else {
                converted = convertTo12Hr(date);
                formattedTime = converted[0] + ':' + minutes.substr(-2) + ':' + seconds.substr(-2) + " " + converted[1];
            }
            break;
    }

    return formattedTime;
}

function convertTo12Hr(date) {
    // Hours part from the timestamp
    var hours = date.getHours();
    // Minutes part from the timestamp
    var minutes = "0" + date.getMinutes();
    // Set the ampm variable
    var timeType = "AM";
    // If the hours is greater than 11
    if (hours > 11) {
        // Set PM
        timeType = "PM";
    }
    // If the hours is greater than 12
	if (hours > 12) {
        // Subtract 12 from hours
		hours = hours - 12;
	}
	return [hours, timeType];
}

function getRGBValue(int) {
    return Math.round(255 * int);
}

// End Utility Functions


// Initialisation Functions

function authenticate() {
    host = document.getElementById("host").value;
    pass = document.getElementById("password").value;
    connect();
}

function cancelAuthenticate() {
    // Fade-in the loader and text
    $("#connecting-loader").hide();
    $("#authenticate").fadeIn("200");
}

function initialise() {

    // Make images non-draggable
    $("img").attr('draggable', false);

}

// When document is ready
$(document).ready(function() {
    initialise();
    if (mustAuthenticate) {
        if (changeHost) {
            $(".host-container").show();
        }
        document.getElementById("host").value = host;
        document.getElementById("password").value = pass;
        document.getElementById("host").addEventListener('keypress',
            function (e) {
                if (e.key === 'Enter') {
                    authenticate();
                }
            }
        );
        document.getElementById("password").addEventListener('keypress',
            function (e) {
                if (e.key === 'Enter') {
                    authenticate();
                }
            }
        );
        $("#authenticate").show();
    } else {
        connect();
    }
});

// End Initialisation Functions
