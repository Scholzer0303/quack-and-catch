// Animierter Wasser-Shader: Sinus-Wellen (Vertex) + ovale Maske, Tiefenfarbe,
// Fresnel-Himmel-Reflexion, Crest-Glitzer & Caustics-Schimmer (Fragment).
// Komplett prozedural (keine Texturen, kein Render-Target → Mobile-sicher).
//
// M12: analytische Wellen-Normale (aus den Sinus-Ableitungen) ermöglicht
// blickwinkelabhängige Reflexe. `cameraPosition`/`modelMatrix`/`viewMatrix`
// werden von three für ShaderMaterial automatisch injiziert.

export const waterVertexShader = /* glsl */ `
  uniform float u_time;
  uniform float u_amp;
  uniform float u_freq;
  uniform float u_speed;
  varying float v_height;
  varying vec2 v_pos;
  varying vec3 v_world;
  varying vec3 v_normal;

  void main() {
    v_pos = position.xy;
    float px = position.x * u_freq + u_time * u_speed;
    float py = position.y * u_freq * 1.3 + u_time * u_speed * 0.8 + 1.7;
    float disp = u_amp * (sin(px) + sin(py)) * 0.5;
    v_height = disp;

    // Analytische Normale aus den Höhen-Ableitungen (Local-Space, z = Höhe).
    float ddx = u_amp * 0.5 * cos(px) * u_freq;
    float ddy = u_amp * 0.5 * cos(py) * u_freq * 1.3;
    vec3 nLocal = normalize(vec3(-ddx, -ddy, 1.0));
    // Wasser-Mesh hat keine Skalierung → mat3(modelMatrix) genügt für die World-Normale.
    v_normal = normalize(mat3(modelMatrix) * nLocal);

    vec3 p = position;
    p.z += disp;
    vec4 wp = modelMatrix * vec4(p, 1.0);
    v_world = wp.xyz;
    gl_Position = projectionMatrix * viewMatrix * wp;
  }
`;

export const waterFragmentShader = /* glsl */ `
  precision highp float;
  uniform float u_time;
  uniform vec3 u_color;
  uniform vec3 u_deep;
  uniform float u_rx;
  uniform float u_rz;
  uniform vec3 u_fresnelColor; // Himmel-Tint am flachen Blickwinkel
  uniform float u_fresnelPower;
  uniform float u_fresnelStrength;
  uniform vec3 u_sunDir; // normalisiert, world-space
  uniform vec3 u_specColor;
  uniform float u_shininess;
  uniform float u_specStrength;
  varying float v_height;
  varying vec2 v_pos;
  varying vec3 v_world;
  varying vec3 v_normal;

  void main() {
    // Ovale Maske: alles außerhalb der Ellipse verwerfen.
    float e = (v_pos.x * v_pos.x) / (u_rx * u_rx) + (v_pos.y * v_pos.y) / (u_rz * u_rz);
    if (e > 1.0) discard;

    vec3 normal = normalize(v_normal);
    vec3 viewDir = normalize(cameraPosition - v_world);

    // Tiefenfarbe: Wellentäler dunkel/satt, Kämme hell.
    float hf = clamp(v_height * 7.0 + 0.5, 0.0, 1.0);
    vec3 col = mix(u_deep, u_color, hf);
    col *= mix(1.0, 0.7, smoothstep(0.72, 1.0, e)); // Rand abdunkeln

    // Fresnel-Himmel-Reflexion: am flachen Blickwinkel heller Richtung Himmel.
    float fres = pow(1.0 - max(dot(normal, viewDir), 0.0), u_fresnelPower);
    col = mix(col, u_fresnelColor, fres * u_fresnelStrength);

    // Crest-Glitzer: scharfes Sonnen-Specular auf den Wellenkämmen, mit
    // wanderndem Caustics-Schimmer moduliert (feines Funkeln → füttert Bloom).
    vec3 halfDir = normalize(u_sunDir + viewDir);
    float spec = pow(max(dot(normal, halfDir), 0.0), u_shininess);
    float shimmer = 0.6 + 0.4 * sin(v_world.x * 8.0 + u_time * 1.7) * sin(v_world.z * 8.0 - u_time * 1.3);
    col += u_specColor * (spec * u_specStrength * shimmer);

    // Wellenkämme zusätzlich leicht aufhellen.
    col += vec3(0.16) * smoothstep(0.55, 0.95, hf);

    gl_FragColor = vec4(col, 1.0);
  }
`;
