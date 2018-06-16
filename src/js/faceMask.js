import maskData from './maskData';

(() => {

    const vid = document.getElementById('videoel');
    let vid_width = vid.width;
    const vid_height = vid.height;
    const overlay = document.getElementById('overlay');
    const overlayCC = overlay.getContext('2d');
    const webgl_overlay = document.getElementById('webgl');

    /*********** Setup of video/webcam and checking for webGL support *********/
    function enablestart() {
        const startbutton = document.getElementById('startbutton');
        startbutton.value = "start";
        startbutton.disabled = null;
    }

    function adjustVideoProportions() {
        // resize overlay and video if proportions are not 4:3
        // keep same height, just change width
        var proportion = vid.videoWidth / vid.videoHeight;
        // vid_width = Math.round(vid_height * proportion);
        // vid.width = vid_width;
        overlay.width = vid_width;
        webgl_overlay.width = vid_width;
        webGLContext.viewport(0, 0, webGLContext.canvas.width, webGLContext.canvas.height);
    }

    const webGLContext = webgl_overlay.getContext('webgl',{ premultipliedAlpha: false });

    function gumSuccess(stream) {
        // add camera stream if getUserMedia succeeded
        if ("srcObject" in vid) {
            vid.srcObject = stream;
        } else {
            vid.src = (window.URL && window.URL.createObjectURL(stream));
        }
        vid.onloadedmetadata = function () {
            adjustVideoProportions();
            fd.init(webgl_overlay);
            vid.play();
        };
        vid.onresize = function () {
            adjustVideoProportions();
            fd.init(webgl_overlay);
            if (trackingStarted) {
                ctrack.stop();
                ctrack.reset();
                ctrack.start(vid);
            }
        };
    }

    function gumFail() {
        // fall back to video if getUserMedia failed
        document.getElementById('gum').className = "hide";
        document.getElementById('nogum').className = "nohide";
        alert("There was some problem trying to fetch video from your webcam, using a fallback video instead.");
    }

    /*********** Code for face tracking and face masking *********/
    var ctrack = new clm.tracker();
    ctrack.init(pModel);
    var trackingStarted = false;
    document.getElementById('selectmask').addEventListener('change', updateMask, false);

    function updateMask(el) {
        currentMask = parseInt(el.target.value, 10);
        switchMasks();
    }

    function startVideo() {
        // start video
        vid.play();
        // start tracking
        ctrack.start(vid);
        trackingStarted = true;
        // start drawing face grid
        drawGridLoop();
    }

    let positions;
    const fd = new faceDeformer();
    const masks = maskData;
    let currentMask = 0;
    let animationRequest;

    function drawGridLoop() {
        // get position of face
        positions = ctrack.getCurrentPosition();
        overlayCC.clearRect(0, 0, vid_width, vid_height);
        if (positions) {
            // draw current grid
            ctrack.draw(overlay);
        }
        // check whether mask has converged
        const pn = ctrack.getConvergence();
        if (pn < 0.4) {
            switchMasks();
            requestAnimFrame(drawMaskLoop);
        } else {
            requestAnimFrame(drawGridLoop);
        }
    }

    function switchMasks() {
        // get mask
        const maskname = Object.keys(masks)[currentMask];
        fd.load(document.getElementById(maskname), masks[maskname], pModel);
    }

    function drawMaskLoop() {
        // get position of face
        positions = ctrack.getCurrentPosition();
        overlayCC.clearRect(0, 0, vid_width, vid_height);
        if (positions) {
            // draw mask on top of face
            fd.draw(positions);
        }
        animationRequest = requestAnimFrame(drawMaskLoop);
    }

    /*********** Code for stats **********/
    let stats = new Stats();
    stats.domElement.style.position = 'absolute';
    stats.domElement.style.top = '0px';
    document.getElementById('container').appendChild(stats.domElement);
    document.addEventListener("clmtrackrIteration", function (event) {
        stats.update();
    }, false);

    const button = document.querySelector('#startbutton');
    button.addEventListener('click', () => {
        startVideo();
    })

    const setupButton = document.querySelector('#videobutton');
    setupButton.addEventListener('click', () => {
        navigator.getUserMedia = navigator.getUserMedia || navigator.webkitGetUserMedia || navigator.mozGetUserMedia || navigator.msGetUserMedia;
        window.URL = window.URL || window.webkitURL || window.msURL || window.mozURL;
// check for camerasupport
        if (navigator.mediaDevices) {
            navigator.mediaDevices.getUserMedia({video: true}).then(gumSuccess).catch(gumFail);
        } else if (navigator.getUserMedia) {
            navigator.getUserMedia({video: true}, gumSuccess, gumFail);
        } else {
            document.getElementById('gum').className = "hide";
            document.getElementById('nogum').className = "nohide";
            alert("Your browser does not seem to support getUserMedia, using a fallback video instead.");
        }
        vid.addEventListener('canplay', enablestart, false);
    })
})();
