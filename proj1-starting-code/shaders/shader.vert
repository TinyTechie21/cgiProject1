#version 300 es

in uint index;
in vec2 aPosition;
in vec4 a_color;

out vec4 v_color;

void main() {
    gl_Position = vec4(aPosition, 0.0f, 1.0f);
    v_color = a_color;
    gl_PointSize = 5.0f;
}