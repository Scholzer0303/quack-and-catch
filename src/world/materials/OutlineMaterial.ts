import * as THREE from 'three';

/**
 * Inverted-Hull-Outline: ein Rückseiten-Material (`BackSide`), das die Geometrie
 * im Vertex-Shader entlang ihrer Normalen aufbläht. Als zweites, leicht größeres
 * Mesh HINTER dem eigentlichen Objekt gerendert, ragt nur die Silhouette hervor →
 * gleichmäßige schwarze Comic-Kontur. Funktioniert auch mit InstancedMesh
 * (Aufblähung passiert vor der Instanz-Matrix, also pro Instanz korrekt).
 */
export function buildOutlineMaterial(color: number, thickness: number): THREE.MeshBasicMaterial {
  const mat = new THREE.MeshBasicMaterial({ color, side: THREE.BackSide });
  // `normal` ist als Attribut immer deklariert; `objectNormal` (aus
  // <beginnormal_vertex>) gibt es im MeshBasic-Shader NICHT — daher direkt `normal`.
  mat.onBeforeCompile = (shader) => {
    shader.vertexShader = shader.vertexShader.replace(
      '#include <begin_vertex>',
      `#include <begin_vertex>
       transformed += normalize(normal) * ${thickness.toFixed(5)};`,
    );
  };
  return mat;
}
