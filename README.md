# ProWebStage
ProWebRemote is a pure HTML/CSS/JS remote stage display application for ProPresenter 7.

![alt text](https://raw.githubusercontent.com/L2N6H5B3/ProWebStage/master/Screenshot.png)

## Installation
ProWebStage can be either run directly from `index.html` or can be hosted on a webserver that does not use HTTPS.
Ensure that prior to running that the _IP_, _Port_, _Password_, and _Stage Screen_ have been changed in `site.js`, located in the `js/` folder.
ProWebStage also supports auto-authentication (change _mustAuthenticate_ variable in `site.js`), which is not enabled by default.  Alongside this, one can force the host, but still require a password. This is changed under the _changeHost_ variable in `site.js`.

## Usage
ProWebStage is designed to pull in the Stage Display from ProPresenter 7 upon launch.  ProWebStage is both Windows and macOS compatible.

## Troubleshooting
ProWebStage is not connecting to ProPresenter 7
* Features were mainly developed on the Chromium platform (Google Chrome / Chromium Open Source Project) and may not work correctly in other browsers.
* ProWebStage must be run from either the index.html file or hosted on a non-HTTPS server as ProPresenter 7 uses WebSocket (WS) and not WebSocketSecure (WSS) for remote communication. HTTPS only supports WSS, and will not run a WS connection due to security requirements.
* Ensure that the password provided to ProWebStage matches the Stage password in ProPresenter 7

## Credits
* ProPresenter is a Renewed Vision product, and all rights are reserved to their respective owners.
* ProPresenter API from jeffmikels/ProPresenter-API for ProPresenter communication.
* textFit from STRML/textFit for slide text sizing.
