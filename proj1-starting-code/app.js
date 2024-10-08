import { buildProgramFromSources, loadShadersFromURLS, setupWebGL } from "../../libs/utils.js";
import { vec2, vec4, flatten } from "../../libs/MV.js";

var gl;
var canvas;
var aspect;
var vBuffer;
var cBuffer;
var draw_program;

var pointArray = [];
var colorArray = [];
var breakPoints = [];
var min_points = 4;
var max_points = 60000;
var currentColor = [1.0, 1.0, 1.0, 1.0];
var isDragging = false;

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

    vBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, Float32Array.BYTES_PER_ELEMENT * 2 * max_points, gl.STATIC_DRAW);

    cBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, cBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, Float32Array.BYTES_PER_ELEMENT * 4 * max_points, gl.STATIC_DRAW);

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

    function get_random_color() {
        const r = Math.random();
        const g = Math.random();
        const b = Math.random();
        const opacity = Math.random();
        return [r, g, b, opacity];
    }

    // Handle mouse down events
    window.addEventListener("mousedown", (event) => {
        isDragging = true;

        if (pointArray.length === 0) {
            currentColor = get_random_color();
        }

        getPoints(event);
    });

    function getPoints(event) {
        colorArray.push(currentColor);
        const pos = get_pos_from_mouse_event(canvas, event);
        pointArray.push(pos);

        if (pointArray.length >= min_points) {
            // Once 4 points are captured, draw the lines
            drawLines();
        }
    }

    // Handle mouse move events
    window.addEventListener("mousemove", (event) => {
        if (isDragging) {
            const thresholdDistance = 0.075;
            const pos = get_pos_from_mouse_event(canvas, event);

            // Check the distance from the last point
            if (pointArray.length > 0) {
                const lastPoint = pointArray[pointArray.length - 1];
                const distance = Math.sqrt(Math.pow(pos[0] - lastPoint[0], 2) + Math.pow(pos[1] - lastPoint[1], 2));

                // Only add the new point if it's farther than the threshold
                if (distance > thresholdDistance) {
                    pointArray.push(pos);
                    colorArray.push(currentColor);

                    if (pointArray.length >= min_points) {
                        drawLines();
                    }
                }
            }
        }
    });
    // Handle mouse up events
    window.addEventListener("mouseup", (event) => {
        isDragging = false;
    });

    // Handle 'z'
    function breakLine() {
        if (pointArray.length >= min_points) {
            if (breakPoints.length > 0) {
                const currentLineLength = pointArray.length - breakPoints[breakPoints.length - 1];
                if (currentLineLength >= min_points) {
                    currentColor = get_random_color();
                    breakPoints.push(pointArray.length);
                }
            }
            else
                breakPoints.push(pointArray.length);
        }
    }

    function resetCurves() {
        breakPoints = [];
        pointArray = [];
        colorArray = [];
    }

    window.onkeydown = function (event) {
        const key = event.key.toLowerCase();
        switch (key) {
            case 'z':
                breakLine();
                break;
            case 'c':
                resetCurves();
                break;
            case '+':
                break;
            case '-':
                break;
            case '<':
                break;
            case '>':
                break;
            case ' ':
                break;
            case 'p':
                break;
            case 'l':
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
 * Generate B-Spline curve points from control points
 * @param {Array} points - Array of vec2 control points
 */
function generateBSplineCurve(points) {
    curvePoints = [];

    const steps = 100;  // Number of line segments
    for (let t = 0; t <= 1; t += 1 / steps) {
        const b0 = (1 - t) * (1 - t) * (1 - t) / 6;
        const b1 = (3 * t * t * t - 6 * t * t + 4) / 6;
        const b2 = (-3 * t * t * t + 3 * t * t + 3 * t + 1) / 6;
        const b3 = t * t * t / 6;

        const x = b0 * points[0][0] +
            b1 * points[1][0] +
            b2 * points[2][0] +
            b3 * points[3][0];

        const y = b0 * points[0][1] +
            b1 * points[1][1] +
            b2 * points[2][1] +
            b3 * points[3][1];

        curvePoints.push(vec2(x, y));  // Store the curve point
    }
}

function drawLines() {
    if (pointArray.length >= min_points) {
        const vertices = flatten(pointArray);

        // Bind the buffer and upload the points
        gl.bindBuffer(gl.ARRAY_BUFFER, vBuffer);
        gl.bufferSubData(gl.ARRAY_BUFFER, 0, new Float32Array(vertices));

        // Get position attribute location from the shader
        const positionLoc = gl.getAttribLocation(draw_program, "a_position");

        // Enable the attribute and point to the buffer data
        gl.vertexAttribPointer(positionLoc, 2, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(positionLoc);


        const colors = flatten(colorArray);

        // Bind the color buffer and upload the colors
        gl.bindBuffer(gl.ARRAY_BUFFER, cBuffer);
        gl.bufferSubData(gl.ARRAY_BUFFER, 0, new Float32Array(colors));

        const colorLoc = gl.getAttribLocation(draw_program, "a_color");
        gl.bindBuffer(gl.ARRAY_BUFFER, cBuffer);
        gl.vertexAttribPointer(colorLoc, 4, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(colorLoc);
    }
}

let last_time;

function animate(timestamp) {
    window.requestAnimationFrame(animate);

    if (last_time === undefined) {
        last_time = timestamp;
    }
    // Elapsed time (in miliseconds) since last time here
    const elapsed = timestamp - last_time;

    gl.clear(gl.COLOR_BUFFER_BIT);

    if (pointArray.length >= 4) {
        gl.useProgram(draw_program);

        let startIndex = 0;

        // Draw each segment individually based on the break points
        breakPoints.forEach((breakIndex) => {
            if (breakIndex - startIndex >= min_points) {
                gl.drawArrays(gl.POINTS, startIndex, breakIndex - startIndex);
                gl.drawArrays(gl.LINE_STRIP, startIndex, breakIndex - startIndex);
            }
            startIndex = breakIndex;
        });

        // Draw lines if we have 4 points
        if (pointArray.length - startIndex >= min_points) {
            // Draw points
            gl.drawArrays(gl.POINTS, startIndex, pointArray.length - startIndex);
            gl.drawArrays(gl.LINE_STRIP, startIndex, pointArray.length - startIndex);
        }

        gl.useProgram(null);

        last_time = timestamp;
    }
}
loadShadersFromURLS(["shader.vert", "shader.frag"]).then(shaders => setup(shaders))