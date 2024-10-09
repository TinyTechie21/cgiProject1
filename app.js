import { buildProgramFromSources, loadShadersFromURLS, setupWebGL } from "../../libs/utils.js";
import { vec2, vec4, flatten } from "../../libs/MV.js";

var gl;
var canvas;
var aspect;
var draw_program;

var curveList = [];  // Store all the curves
var colorList = [];  // Store colors for each curve
var pointSizeList = [];
var controlPointList = [];
var breakPoints = [];
var pointSpeedList = [];
var min_points = 4;
var max_points = 60000;
var currentColor = [1.0, 1.0, 1.0, 1.0];
var currentPointSize = 5.0;
var currentCurveSpeed = 0.1;
var isDragging = false;
var showSegments = true;
var showPoints = true;
var segments = 5;
var globalSpeed = 1;

/**
 * Resize event handler
 * 
 * @param {*} target - The window that has resized
 */
function resize(target) {
    // Aquire the new window dimensions
    const width = target.innerWidth;
    const height = target.innerHeight;

    // Set canvas size to occupy the entire window
    canvas.width = width;
    canvas.height = height;

    // Set the WebGL viewport to fill the canvas completely
    gl.viewport(0, 0, width, height);
}

function setup(shaders) {
    canvas = document.getElementById("gl-canvas");
    gl = setupWebGL(canvas, { alpha: true });

    // Create WebGL programs
    draw_program = buildProgramFromSources(gl, shaders["shader.vert"], shaders["shader.frag"]);

    // Enable Alpha blending
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

    function get_random_color() {
        const r = Math.random();
        const g = Math.random();
        const b = Math.random();
        const opacity = Math.random() * 0.6 + 0.4;
        return [r, g, b, opacity];
    }

    // Generates a random value between 2 and 8
    function get_random_size() {
        return Math.random() * 6 + 2;
    }

    function get_random_point_speed(curveSpeed) {
        return Math.random() / 50 + curveSpeed;
    }

    function get_random_curve_speed() {
        return Math.random() / 2 + 0.1;
    }

    // Handle resize events 
    window.addEventListener("resize", (event) => {
        resize(event.target);
    });

    function get_pos_from_mouse_event(canvas, event) {
        const rect = canvas.getBoundingClientRect();
        const x = (event.clientX - rect.left) / canvas.width * 2 - 1;
        const y = -((event.clientY - rect.top) / canvas.height * 2 - 1);

        return vec2(x, y);
    }

    // Handle mouse down events
    window.addEventListener("mousedown", (event) => {
        isDragging = true;

        if (controlPointList.length === 0) {
            randomize_curve_atributes();
        }
        const pos = get_pos_from_mouse_event(canvas, event);
        controlPointList.push(pos);
    });


    // Handle mouse move events
    window.addEventListener("mousemove", (event) => {
        if (isDragging) {
            const thresholdDistance = 0.075;
            const pos = get_pos_from_mouse_event(canvas, event);

            // Check the distance from the last point
            if (controlPointList.length > 0) {
                const lastPoint = controlPointList[controlPointList.length - 1];
                const distance = Math.sqrt(Math.pow(pos[0] - lastPoint[0], 2) + Math.pow(pos[1] - lastPoint[1], 2));

                // Only add the new point if it's farther than the threshold
                if (distance > thresholdDistance) {
                    controlPointList.push(pos);
                }
            }
            generateAndStoreCurve();
        }
    });

    // In the mouse event, after adding points, call the function to generate and store curves
    window.addEventListener("mouseup", (event) => {
        isDragging = false;

        // Store the curve when mouse is released and we have at least 4 points
        generateAndStoreCurve();
    });

    function breakCurve() {
        if (controlPointList.length >= min_points) {
            // Check if there are enough points before breaking the line
            if (breakPoints.length > 0) {
                const currentLineLength = controlPointList.length - breakPoints[breakPoints.length - 1];
                if (currentLineLength >= min_points) {

                    // Store the current curve and prepare for a new one
                    storeCurveAtributes(controlPointList.slice(breakPoints[breakPoints.length - 1]))

                    // Randomize new curve's atributes
                    randomize_curve_atributes();

                    // Store curve break index
                    breakPoints.push(controlPointList.length);
                }
            } else {
                // First curve break
                randomize_curve_atributes();
                breakPoints.push(controlPointList.length);
            }
            // Clear pointArray to start collecting new control points
            controlPointList = [];
        }
    }

    function randomize_curve_atributes() {
        currentColor = get_random_color();
        currentPointSize = get_random_size();
        currentCurveSpeed = get_random_curve_speed();
    }

    // Handle 'C'
    function resetCurves() {
        curveList = [];
        colorList = [];
        pointSizeList = [];
        breakPoints = [];
        controlPointList = [];
    }

    window.onkeydown = function (event) {
        const key = event.key.toLowerCase();
        switch (key) {
            case 'z':
                breakCurve();
                break;
            case 'c':
                resetCurves();
                break;
            case '+':
                if (segments < 50)
                    segments += 1;
                break;
            case '-':
                if (segments > 1)
                    segments -= 1;
                break;
            case '>':
                if (globalSpeed < 2)
                    globalSpeed + 0.1;
                break;
            case '<':
                if (globalSpeed > 0.1)
                    globalSpeed - 0.1
                break;
            case ' ':
                break;
            case 'p':
                showPoints = !showPoints;
                break;
            case 'l':
                showSegments = !showSegments;
                break;
        }
    };

    resize(window);

    gl.clearColor(0.0, 0.0, 0.0, 1);

    // Enable Alpha blending
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

    window.requestAnimationFrame(animate);
}

/**
 * Draws the B-Spline curve in the shader for each set of control points.
 * @param {Array} controlPoints - The control points for the curve (4 points)
 * @param {Array} color - The color for the curve
 * @param {int} segments - The number of segments for the curve
 */
function drawCurveInShader(controlPoints, color, segments, pointSize, pointSpeed) {
    // Use the draw program
    gl.useProgram(draw_program);

    // Pass the control points to the shader
    const uControlPointsLoc = gl.getUniformLocation(draw_program, "u_controlPoints");
    gl.uniform2fv(uControlPointsLoc, flatten(controlPoints));

    // Pass the color to the shader
    const uColorLoc = gl.getUniformLocation(draw_program, "u_color");
    gl.uniform4fv(uColorLoc, color);

    // Pass the number of segments to the shader
    const uSegmentsLoc = gl.getUniformLocation(draw_program, "u_segments");
    gl.uniform1i(uSegmentsLoc, segments);

    // Pass the point size to the shader
    const uPointSizeLoc = gl.getUniformLocation(draw_program, "u_pointSize");
    gl.uniform1f(uPointSizeLoc, pointSize);

    const uPointSpeedLoc = gl.getUniformLocation(draw_program, "u_pointSpeed");
    gl.uniform1f(uPointSpeedLoc, pointSpeed);

    if (showSegments)
        gl.drawArrays(gl.LINE_STRIP, 0, segments + 1);

    if (showPoints)
        gl.drawArrays(gl.POINTS, 0, segments + 1);

    gl.useProgram(null);
}

/**
 * Draws all the curves that have been added so far
 */
function drawAllCurves() {
    for (let i = 0; i < curveList.length; i++) {
        const controlPoints = curveList[i];
        const color = colorList[i];
        const pointSize = pointSizeList[i];
        const pointSpeed = pointSpeedList[i];
        drawCurveInShader(controlPoints, color, segments, pointSize, pointSpeed);
    }
}

// Call this function when new control points are added and enough points (at least 4) are present
function generateAndStoreCurve() {
    if (controlPointList.length >= 4) {
        // Extract the last 4 control points for the current curve
        const controlPoints = controlPointList.slice(-4);

        // Store the control points and color for this curve
        storeCurveAtributes(controlPoints);
    }
}

// In the animation loop, clear the canvas once and draw all the stored curves
let last_time;

function storeCurveAtributes(controlPoints) {
    curveList.push(controlPoints);
    colorList.push(currentColor);
    pointSizeList.push(currentPointSize);
    pointSpeedList.forEach(point => {
        point.push(get_random_point_speed(currentCurveSpeed));
    });
}

function animate(timestamp) {
    window.requestAnimationFrame(animate);

    if (last_time === undefined) {
        last_time = timestamp;
    }

    // Clear the canvas only once per frame
    gl.clear(gl.COLOR_BUFFER_BIT);

    // Draw all stored curves
    drawAllCurves();

    last_time = timestamp;
}

loadShadersFromURLS(["shader.vert", "shader.frag"]).then(shaders => setup(shaders))