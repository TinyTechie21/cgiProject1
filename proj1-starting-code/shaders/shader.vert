#version 300 es

in uint index;
in vec2 aPosition;

void main() {
    gl_Position = vec4(aPosition, 0.0f, 1.0f);
    gl_PointSize = 10.0f;
}