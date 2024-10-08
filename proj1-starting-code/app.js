import { buildProgramFromSources, loadShadersFromURLS, setupWebGL } from "../../libs/utils.js";
import { vec2, vec4, flatten } from "../../libs/MV.js";

var gl;
var canvas;
var aspect;
var buffer;

var draw_program;
var pointArray = [];
var min_points = 4;
var max_points = 256;


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

    buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, Float32Array.BYTES_PER_ELEMENT * 2 * max_points, gl.STATIC_DRAW);

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
        if (pointArray.length < max_points) {
            const pos = get_pos_from_mouse_event(canvas, event);
            pointArray.push(pos);

            if (pointArray.length >= min_points) {
                // Once 4 points are captured, draw the lines
                drawLines();
            }
        }
    });

    // Handle mouse move events
    window.addEventListener("mousemove", (event) => {
    });

    // Handle mouse up events
    window.addEventListener("mouseup", (event) => {
    });

    resize(window);

    gl.clearColor(0.0, 0.0, 0.0, 1);

    // Enable Alpha blending
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

    window.requestAnimationFrame(animate);
}

function drawLines() {
    if (pointArray.length >= 4) {
        const vertices = flatten(pointArray);

        // Bind the buffer and upload the points
        gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
        gl.bufferSubData(gl.ARRAY_BUFFER, 0, new Float32Array(vertices));

        // Get position attribute location from the shader
        const positionLoc = gl.getAttribLocation(draw_program, "aPosition");

        // Enable the attribute and point to the buffer data
        gl.vertexAttribPointer(positionLoc, 2, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(positionLoc);
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

        // Draw points
        gl.drawArrays(gl.POINTS, 0, pointArray.length);

        // Draw lines if we have 4 points
        if (pointArray.length >= 4) {
            gl.drawArrays(gl.LINE_STRIP, 0, pointArray.length);
        }

        gl.useProgram(null);

        last_time = timestamp;
    }
}
loadShadersFromURLS(["shader.vert", "shader.frag"]).then(shaders => setup(shaders))