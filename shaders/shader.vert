#version 300 es

precision mediump float;

// Attributes and uniforms
uniform vec2 u_controlPoints[4];  // Control points for B-Spline (4 control points)
uniform vec4 u_color;             // Curve color
uniform int u_segments;           // Number of segments for the B-Spline
uniform float u_pointSize;        // Size of the curve points
uniform float u_pointSpeed;

out vec4 v_color;                 // Output color to the fragment shader

void main() {
    // Compute the B-Spline basis functions for the given segment
    float t = float(gl_VertexID) / float(u_segments);  // Parameter t varies between 0 and 1

    float b0 = (-t * t * t + 3.0f * t * t - 3.0f * t + 1.0f) / 6.0f;
    float b1 = (3.0f * t * t * t - 6.0f * t * t + 4.0f) / 6.0f;
    float b2 = (-3.0f * t * t * t + 3.0f * t * t + 3.0f * t + 1.0f) / 6.0f;
    float b3 = (t * t * t) / 6.0f;

    // Calculate the position of the current point on the curve
    vec2 position = u_controlPoints[0] * b0 +
        u_controlPoints[1] * b1 +
        u_controlPoints[2] * b2 +
        u_controlPoints[3] * b3;

    // Set the position of the current vertex
    gl_Position = vec4(position, 0.0f, 1.0f);

    // Set the color for the fragment shader
    v_color = u_color;

    gl_PointSize = u_pointSize;
}
