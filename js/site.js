// Variables

// Connection
var host = "10.1.1.33";
var port = "50000";
var stagePass = "stage";
var observerPass = "observer";


// Settings
var stageScreen = 1;
var mustAuthenticate = true;
var changeHost = true;
var observerMode = true;
var overrideFrameMode = false;

// Application
var stageAuthenticated = false;
var observerAuthenticated = false;
var retryConnection = true;
var stageWebSocket;
var observerWebSocket;
var loadingTimeout;
var wsUri;
var stageScreenList;
var stageLayoutList;
var stageScreenUid;
var stageLayoutUid;
var observerSlides;
var observerSlideIndex;
var observerPresentation;
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
    stageWebSocket = new WebSocket(wsUri+"/stagedisplay");
    // Define WebSocket actions
    stageWebSocket.onopen = function(evt) { onOpen(evt) };
    stageWebSocket.onclose = function(evt) { onClose(evt) };
    stageWebSocket.onmessage = function(evt) { onMessage(evt) };
    stageWebSocket.onerror = function(evt) { onError(evt) };
    if (observerMode) {
        // Connect Observer WebSocket
        observerConnect();
    }
}

function onOpen(evt) {
    if (!stageAuthenticated) {
        // Send authentication data
        stageWebSocket.send('{"acn":"ath","ptl":610,"pwd":"'+stagePass+'"}');
    }
}

function onMessage(evt) {
    var obj = JSON.parse(evt.data);
    console.log(obj);
    if (obj.acn == "ath" && obj.ath && stageAuthenticated == false) {
        // Set as authenticated
        stageAuthenticated = true;
        // Set retry connection to enabled
        retryConnection = true;
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
    stageAuthenticated = false;
    // Log the error to console
    console.error('Stage Socket encountered error: ', evt.message, 'Closing socket');
    // Close the WebSocket
    stageWebSocket.close();
}

function onClose(evt) {
    // Set authenticated to false
    stageAuthenticated = false;
    // Remove connected status
    $(".connected").hide();
    // Show disconnected status
    $(".disconnected").show();
    // If retry connection is enabled
    if (retryConnection) {
        // Retry connection every second
        setTimeout(function() {
            connect();
        }, 1000);
    }
}

//  End Web Socket Functions

// Observer WebSocket Functions

function observerConnect() {
    // Create WebSocket
    observerWebSocket = new WebSocket(wsUri+"/remote");
    // Define WebSocket actions
    observerWebSocket.onopen = function(evt) { observerOnOpen(evt) };
    observerWebSocket.onclose = function(evt) { observerOnClose(evt) };
    observerWebSocket.onmessage = function(evt) { observerOnMessage(evt) };
    observerWebSocket.onerror = function(evt) { observerOnError(evt) };
}

function observerOnOpen(evt) {
    if (!observerAuthenticated) {
        // Send authentication data
        observerWebSocket.send('{"action":"authenticate","protocol":"701","password":"'+observerPass+'"}');
    }
}

function observerOnMessage(evt) {
    var obj = JSON.parse(evt.data);
    if (obj.action == "authenticate" && obj.authenticated == "1" && observerAuthenticated == false) {
        // Set as authenticated
        observerAuthenticated = true;
    } else if (obj.action == "presentationCurrent") {
        // Set frame static images
        setFrameImages(obj);
    } else if (obj.action == "presentationSlideIndex") {
        // Set frame static images
        setFrameImages(obj);
        // Get the current presentation images
        getCurrentImages();
    } else if (obj.action == "presentationTriggerIndex") {
        // Set frame static images
        setFrameImages(obj);
    } else if (obj.action == "clearAll") {
        // Clear frame static images
        clearFrameImages();
    } else if (obj.action == "clearText") {
        // Clear frame static images
        clearFrameImages();
    }
}

function observerOnError(evt) {
    // Set authenticated to false
    observerAuthenticated = false;
    // Log the error to console
    console.error('Observer Socket encountered error: ', evt.message, 'Closing socket');
    // Close the WebSocket
    observerWebSocket.close();
}

function observerOnClose(evt) {
    // Set observer authenticated to false
    observerAuthenticated = false;
    // If retry connection is enabled
    if (retryConnection) {
        // Retry connection every second
        setTimeout(function() {
            observerConnect();
        }, 1000);
    }
}

// End Observer Web Socket Functions


// Stage Display Functions

function getStageScreens() {
    // Send the request to ProPresenter
    stageWebSocket.send('{"acn":"saa"}');
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
    stageWebSocket.send('{"acn":"asl"}');
}

function setStageLayouts(obj) {
    // Initialise the stage layout list with the array from ProPresenter
    stageLayoutList = obj.ary
    // Display the stage layout
    displayStageLayout(stageLayoutUid);
}

function getFrameValues() {
    // Send the request to ProPresenter
    stageWebSocket.send('{"acn":"fv","uid":"'+stageLayoutUid+'"}');
}

function setFrameValues(obj) {
    if (!overrideFrameMode && observerMode) {
        // Get the current slide index
        getSlideIndex();
    }
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
                        currentFrame = document.getElementById("txt."+value.acn)
                        // Set the frame value
                        if (currentFrame.classList.contains("textFrame")) {
                            currentFrame.innerHTML = value.txt.replace(/[\r\n\x0B\x0C\u0085\u2028\u2029]+/g, "\n");
                        } 
                        // If override frame mode is enabled
                        else if (overrideFrameMode) {
                            currentFrame.innerHTML = value.txt.replace(/[\r\n\x0B\x0C\u0085\u2028\u2029]+/g, "\n");
                        }
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
    textFit(document.getElementsByClassName('content-container scale'), {minFontSize:10, maxFontSize: 1000});
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
    textFit(document.getElementsByClassName('content-container scale'), {minFontSize:10, maxFontSize: 1000});
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
            				+ '<div class="'+getTextScaleUp(frame.textShouldScaleUp)+'"><div id="txt.'+getFrameType(frame.typ, frame.uid)+'" class="'+getFrameMode(frame.mde)+' content"></div></div>'
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
    loadingTimeout = setTimeout(function(){$(".loading").fadeOut()}, 2000);
}

function getSlideIndex() {
    // If observer websocket is connected
    if (observerWebSocket.readyState === WebSocket.OPEN) {
        // Request current presentation slide index
        observerWebSocket.send('{"action":"presentationSlideIndex"}');
    }
}

function getCurrentImages() {
    // If observer websocket is connected
    if (observerWebSocket.readyState === WebSocket.OPEN) {
        // Send current presentation request
        observerWebSocket.send('{"action":"presentationCurrent", "presentationSlideQuality": 100}');
    }
}

function setFrameImages(obj) {
    if (document.getElementById("txt.cs")?.classList.contains("staticFrame") || document.getElementById("txt.ns")?.classList.contains("staticFrame")) {
        // Determine if this is a slide index, slide trigger, or presentation request
        switch(obj.action) {
            case "presentationSlideIndex":
                observerSlideIndex = parseInt(obj.slideIndex);
                break;
            case "presentationTriggerIndex":
                observerSlideIndex = obj.slideIndex;
                break;
            case "presentationCurrent":
                observerPresentation = obj;
                break;
        }
        // If slide index and presentation exist
        if (observerSlideIndex != null && observerPresentation != null) {
            // Create empty array to hold slide images
            observerSlides = [];
            // Iterate through each slide image in each slide group
            observerPresentation.presentation.presentationSlideGroups.forEach(
                function (value) {
                    value.groupSlides.forEach(
                        function (value) {
                            // Add slide image to the slide image array
                            observerSlides.push(value.slideImage);
                        } 
                    );
                }
            );
            // If current slide image exists
            if (observerSlides[observerSlideIndex] != null) {
                document.getElementById("txt.cs").innerHTML = '<img src="data:image/png;base64,'+observerSlides[observerSlideIndex]+'"/>';
            } else {
                document.getElementById("txt.cs").innerHTML = "";
            }
            // If next slide image exists
            if (observerSlides[observerSlideIndex+1] != null) {
                document.getElementById("txt.ns").innerHTML = '<img src="data:image/png;base64,'+observerSlides[observerSlideIndex+1]+'"/>';
            } else {
                document.getElementById("txt.ns").innerHTML = "";
            }
        }
    }
}

function clearFrameImages() {
    // If the frame is a static image
    if (document.getElementById("txt.cs").classList.contains("staticFrame")) {
        // Clear image from frame
        document.getElementById("txt.cs").innerHTML = "";
    }
    // If the frame is a static image
    if (document.getElementById("txt.ns").classList.contains("staticFrame")) {
        // Clear image from frame
        document.getElementById("txt.ns").innerHTML = "";
    }
}

// End Stage Display Functions


// Utility Functions

function getFrameMode(frameMode) {
    switch(frameMode) {
        case 0:
            // Frame is Static Image - used with the Observer mode to provide static images due to bugs in the ProPresenter Stage Display protocol
            return "staticFrame";
        case 1:
            // Frame is Text
            return "textFrame";
        case 2:
            // Frame is Live Slide - unused at this stage due to bugs in the ProPresenter Stage Display protocol
            return "liveFrame";
    }
}

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
    frameStyle += 'font-size: calc('+frame.tSz+'px - ('+frame.tSz+'px / 5));';
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

function getTextScaleUp(shouldScale) {
    // If the Text should scale up to fix container
    if (shouldScale) {
        return "content-container scale";
    } else {
        return "content-container";
    }
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
    // Get the host from the input field
    host = document.getElementById("host").value;
    // Get the host from the input field
    stagePass = document.getElementById("password").value;
    // Connect to ProPresenter
    connect();
}

function cancelAuthenticate() {
    // Set retry connection to disabled
    retryConnection = false;
    // End the WebSocket connection
    stageWebSocket.close();
    // Remove the loading timeout
    clearTimeout(loadingTimeout);
    // Fade-out the loader and text
    $("#connecting-loader").hide();
    // Fade-in authenticate segment
    $("#authenticate").fadeIn("200");
}

function initialise() {
    // Make images non-draggable
    $("img").attr('draggable', false);
}

// When document is ready
$(document).ready(function() {
    initialise();
    // If user must authenticate
    if (mustAuthenticate) {
        // If user can change host
        if (changeHost) {
            // Show change host container
            $(".host-container").show();
        }
        // Set HTML authentication elements
        document.getElementById("host").value = host;
        document.getElementById("password").value = stagePass;
        // Add event listener for enter key in host textbox
        document.getElementById("host").addEventListener('keypress',
            function (e) {
                if (e.key === 'Enter') {
                    // Start authentication
                    authenticate();
                }
            }
        );
        // Add event listener for enter key in password textbox
        document.getElementById("password").addEventListener('keypress',
            function (e) {
                if (e.key === 'Enter') {
                    // Start authentication
                    authenticate();
                }
            }
        );
        // Show authenticate segment
        $("#authenticate").show();
    } else {
        // Connect to ProPresenter
        connect();
    }
});

// End Initialisation Functions
