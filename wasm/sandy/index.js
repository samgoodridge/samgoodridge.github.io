// export js funcs to wasm
const wasmImports = {
   env: {
      // our funcs
      js_key_down: key_down,

      // js funcs
      js_sin:  Math.sin,  js_cos:  Math.cos,  js_tan:  Math.tan,
      js_asin: Math.asin, js_acos: Math.asin, js_atan: Math.asin,

      js_pow:    Math.pow,
      js_sqrt:   Math.sqrt,
      js_round:  Math.round,
      //js_random: Math.random(),

      js_time:   Date.now(),
   },
};

let pixel_perfect = false;

let key_map = new Map(); // store against our enum

// mappings from 'event.code' to old 'event.which' vals 
// TODO use own vals, remove duplicates and export enum somehow?
const keyLookup = Object.freeze({
   Backspace:  8,
   Tab      :  9,
   Enter    : 13,
   CapsLock : 20,
   Escape   : 27,
   Space    : 32,

   ShiftLeft   : 16, 
   ControlLeft : 17, 
   AltLeft     : 18, 
   MetaLeft    : 224, 
   ShiftRight  : 16, 
   ControlRight: 17, 
   AltRight    : 18, 
   MetaRight   : 224, 

   Semicolon   :  59,
   Slash       : 191,
   Backslash   : 220,
   Period      : 190,
   Comma       : 188,
   Quote       : 222,
   BracketLeft : 219,
   BracketRight: 221,
   Minus       : 173,
   Equal       : 61,
   IntlBackslash : 192,
   Backquote     : 192,
      
   ArrowUp: 38, ArrowDown: 40, ArrowLeft: 37, ArrowRight: 39,
      
   Digit0: 48, Digit1: 49, Digit2: 50, Digit3: 51, 
   Digit4: 52, Digit5: 53, Digit6: 54, Digit7: 55, 
   Digit8: 56, Digit9: 57,

   KeyA: 65, KeyB: 66, KeyC: 67, KeyD: 68, KeyE: 69, KeyF: 70, KeyG: 71, KeyH: 72, 
   KeyI: 73, KeyJ: 74, KeyK: 75, KeyL: 76, KeyM: 77, KeyN: 78, KeyO: 79, KeyP: 80, 
   KeyQ: 81, KeyR: 82, KeyS: 83, KeyT: 84, KeyU: 85, KeyV: 86, KeyW: 87, KeyX: 88, 
   KeyY: 89, KeyZ: 90,
});



function key_down(key) {
   
   if (key_map.has(key)) {
      return key_map.get(key);
   } else {
      return false;
   }
}


function calc_viewport_size(canvas, image, pixel_perfect) {

   let scale = Math.min(
      canvas.width / image.width, 
      canvas.height / image.height
   ); 
   if (pixel_perfect) scale = Math.floor(scale);
   scale = Math.max(scale, 1);

   const sw = image.width * scale;
   const sh = image.height * scale;

   return [sw, sh];
}

function calc_viewport_offset(canvas, scaled_size) {
   const ox = (Math.max(canvas.width - scaled_size[0], 0)) / 2;
   const oy = (Math.max(canvas.height - scaled_size[1], 0)) / 2;
   return [ox, oy];
}





async function run() {


   // why not working?
   let wasmApp;
   if (WebAssembly.instantiateStreaming) {
      const { instance } = await WebAssembly.instantiateStreaming(
         fetch('./app.wasm'), wasmImports
      );
      wasmApp = instance;
   } else if (WebAssembly.instantiate) {
      // older method - for safari
      wasmApp = await fetch('./app.wasm').then(response =>
         response.arrayBuffer()
      ).then(bytes =>
         WebAssembly.instantiate(bytes, wasmImports)
      ).then(results => {
         return results.instance;
      });
   } else {
      // wasm not supported
      console.log('Your browser does not support WebAssembly');
   }

   // // older method - for safari - TODO conditional
   // const instance = await fetch('./app.wasm').then(response =>
   //    response.arrayBuffer()
   // ).then(bytes =>
   //    WebAssembly.instantiate(bytes, wasmImports)
   // ).then(results => {
   //    return results.instance;
   // });


   // // newer method
   // const { instance } = await WebAssembly.instantiateStreaming(
   //    fetch("./app.wasm"), wasmImports
   // );

   // call wasm main func if it exists
   if (wasmApp.exports.main) wasmApp.exports.main();
   else if (wasmApp.exports.start) wasmApp.exports.start();
   

   

   // must match rust!!
   const pixbuf_width = 256; 
   const pixbuf_height = 192
   const pixbuf_addr = wasmApp.exports.PIXELS.value;

   // create image using our pixel buffer
   const pixbuf = new ImageData(
      new Uint8ClampedArray(
         wasmApp.exports.memory.buffer,
         pixbuf_addr,
         4 * pixbuf_width * pixbuf_height,
      ),
      pixbuf_width,
   );

   let img = document.createElement('canvas');
   img.width  = pixbuf_width;
   img.height = pixbuf_height;
   const img_ctx = img.getContext("2d");

   let vp_size = [0,0];
   let vp_ofs = [0,0];

   // set resize callback
   const on_resize = () => {
      const canvas = document.getElementById("canvas");
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      vp_size = calc_viewport_size(canvas, pixbuf, pixel_perfect);
      vp_ofs = calc_viewport_offset(canvas, vp_size);

   };

   window.onresize = on_resize;
   on_resize();


   const on_keydown = (e) => {
      console.log(e.code + ' pressed');
      key_map.set(keyLookup[e.code], true );
   };
   const on_keyup   = (e) => key_map.set(keyLookup[e.code], false);
   window.onkeydown = on_keydown;
   window.onkeyup = on_keyup;




   let prevTime = Date.now();

   // render loop
   const render = () => {

      // get canvas and 2d drawing context
      const canvas = document.getElementById("canvas");
      const ctx = canvas.getContext("2d");

      // seems this resets if not called each frame
      ctx.imageSmoothingEnabled = false;
      ctx.webkitImageSmoothingEnabled = false;
      ctx.msImageSmoothingEnabled = false;

      
      // calc delta time
      const curTime = Date.now();
      const dt = curTime - prevTime;
      prevTime = curTime;

      // call our wasm lib to populate the pixel buffer
      wasmApp.exports.on_redraw(dt);

      // draw wasm pixel buffer to image
      img_ctx.putImageData(pixbuf, 0, 0);

      // draw image to screen at viewport size
      ctx.drawImage(
         img,
         0,  0,  pixbuf.width,  pixbuf.height, // src
         vp_ofs[0], vp_ofs[1], vp_size[0], vp_size[1], // dest
      );
      
      requestAnimationFrame(render);
   };
   render();

}

run();