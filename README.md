# ProWebStage
ProWebRemote is a pure HTML/CSS/JS remote stage display application for ProPresenter 7.

![alt text](https://raw.githubusercontent.com/L2N6H5B3/ProWebStage/master/Screenshot.png)

## Installation
ProWebStage can be either run directly from `index.html` or can be hosted on a webserver that does not use HTTPS.
Ensure that prior to running that the _IP_, _Port_, and _Password_ have been changed in `site.js`, located in the `js/` folder. 

## Usage
ProWebStage is designed to pull in the Stage Display from ProPresenter 7 upon launch.

## Troubleshooting
ProWebStage is not connecting to ProPresenter 7
* ProWebStage currently only supports ProPresenter 7 on macOS, due to protocol differences on ProPresenter 7 between macOS and Windows.
* Features were mainly developed on the Chromium platform (Google Chrome / Chromium Open Source Project) and may not work correctly in other browsers.
* ProWebStage must be run from either the index.html file or hosted on a non-HTTPS server as ProPresenter 7 uses WebSocket (WS) and not WebSocketSecure (WSS) for remote communication. HTTPS only supports WSS, and will not run a WS connection due to security requirements.
* Ensure that the password provided to ProWebStage matches the Stage password in ProPresenter 7
