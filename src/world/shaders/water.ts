// Animierter Wasser-Shader: Sinus-Wellen (Vertex) + ovale Maske & Tiefenfarbe
// (Fragment). Keine Texturen — komplett prozedural.

export const waterVertexShader = /* glsl */ `
  uniform float u_time;
  uniform float u_amp;
  uniform float u_freq;
  uniform float u_speed;
  varying float v_height;
  varying vec2 v_pos;

  void main() {
    v_pos = position.xy;
    float w =
      sin(position.x * u_freq + u_time * u_speed) +
      sin(position.y * u_freq * 1.3 + u_time * u_speed * 0.8 + 1.7);
    float disp = u_amp * w * 0.5;
    v_height = disp;
    vec3 p = position;
    p.z += disp;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
  }
`;

export const waterFragmentShader = /* glsl */ `
  precision highp float;
  uniform vec3 u_color;
  uniform vec3 u_deep;
  uniform float u_rx;
  uniform float u_rz;
  varying float v_height;
  varying vec2 v_pos;

  void main() {
    // Ovale Maske: alles außerhalb der Ellipse verwerfen.
    float e = (v_pos.x * v_pos.x) / (u_rx * u_rx) + (v_pos.y * v_pos.y) / (u_rz * u_rz);
    if (e > 1.0) discard;

    float hf = clamp(v_height * 7.0 + 0.5, 0.0, 1.0);
    vec3 col = mix(u_deep, u_color, hf);
    col *= mix(1.0, 0.7, smoothstep(0.72, 1.0, e)); // Rand abdunkeln
    col += vec3(0.2) * smoothstep(0.55, 0.95, hf);  // Wellenkämme aufhellen
    gl_FragColor = vec4(col, 1.0);
  }
`;
