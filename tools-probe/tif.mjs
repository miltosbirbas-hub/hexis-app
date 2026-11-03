// Έλεγχος: ανάγνωση παραθύρου από πραγματικό σαρωμένο διάγραμμα ΕΨΧ (JPEG/YCbCr) με geotiff.js — όπως στον browser
import { fromUrl } from "geotiff";
import fs from "fs";
const url = "https://sdigmap.tee.gov.gr/_Digitize_LOW/2_GEOREF_EGSA_LOW/102691FS000831-1986E.tif";
const tiff = await fromUrl(url, { allowFullFile:false, blockSize:131072 });
const img = await tiff.getImage();
const [ox, oy] = img.getOrigin(), [rx, ry] = img.getResolution();
const x = 209179.9, y = 4296394.6, half = 70;
const win = [Math.floor((x-half-ox)/rx), Math.floor((oy-(y+half))/Math.abs(ry)), Math.ceil((x+half-ox)/rx), Math.ceil((oy-(y-half))/Math.abs(ry))];
const t0 = Date.now();
const rgb = await img.readRGB({ window: win, width: 600, height: 600, interleave: true, resampleMethod: "bilinear" });
let s=[0,0,0]; for(let i=0;i<rgb.length;i+=3){ s[0]+=rgb[i]; s[1]+=rgb[i+1]; s[2]+=rgb[i+2]; }
const n = rgb.length/3;
const out = { size:[img.getWidth(), img.getHeight()], origin:[ox,oy], res:[rx,ry], win, ms: Date.now()-t0, mean: s.map(v=>Math.round(v/n)) };
fs.mkdirSync("out", {recursive:true});
fs.writeFileSync("out/tif_test.json", JSON.stringify(out));
// ppm για οπτικό έλεγχο
fs.writeFileSync("out/tif_window.ppm", Buffer.concat([Buffer.from("P6\n600 600\n255\n"), Buffer.from(rgb)]));
console.log(out);
