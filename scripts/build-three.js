import esbuild from 'esbuild';
import fs from 'fs';
import path from 'path';

fs.mkdirSync('public/assets/3d-scenes', { recursive: true });

if (fs.existsSync('assets/3d-scenes')) {
  fs.readdirSync('assets/3d-scenes').forEach((file) => {
    fs.copyFileSync(path.join('assets/3d-scenes', file), path.join('public/assets/3d-scenes', file));
  });
}

fs.writeFileSync(
  'three-entry.js',
  `
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";

const ThreeObject = Object.assign({}, THREE, { OrbitControls });
window.THREE = ThreeObject;
window.OrbitControls = OrbitControls;
`
);

esbuild.buildSync({
  entryPoints: ['three-entry.js'],
  bundle: true,
  outfile: 'public/three.js',
  format: 'iife',
});

if (fs.existsSync('three-entry.js')) {
  fs.unlinkSync('three-entry.js');
}
console.log('Successfully updated 3d scenes and built public/three.js');
