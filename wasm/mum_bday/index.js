// -- HANDY CONSTS ---

const pixel_width   = 240;
const pixel_height  = 160;
const canvas_width  = pixel_width;
const canvas_height = pixel_height;


let wasmApp;

// ==== WASM IMPORTS ====

const wasmImports = {
    env: {
        // our funcs
        js_log_string: log_string,
        js_log_string_and_number: log_string_and_number,
        js_log_error_string: log_error_string,
        js_panic: panic,
        js_button_states: get_button_states,
        js_set_osc: set_osc,
        

        // js funcs
        js_sin:  Math.sin,  js_cos:  Math.cos,  js_tan:  Math.tan,
        js_asin: Math.asin, js_acos: Math.asin, js_atan: Math.asin,

        js_pow: Math.pow, js_sqrt: Math.sqrt, js_round: Math.round,
        js_floor: Math.floor, js_ceil: Math.ceil,
        js_random: Math.random, js_time: Date.now,
    },
};


function pause() {
    // TODO
}



// ==== DEBUG / ERROR HANDLING ====

function panic() { throw 'panic!';  }

// https://dev.to/azure/passing-strings-from-c-to-javascript-in-web-assembly-1p01
function log_string(str_ptr, str_len) {
    const view = new Uint8Array(wasmApp.exports.memory.buffer, str_ptr, str_len);
    let string = '';
    for (let i = 0; i < str_len; i++) {
      string += String.fromCharCode(view[i]);
    }
    console.log(string);
}

function log_string_and_number(str_ptr, str_len, num) {
    const view = new Uint8Array(wasmApp.exports.memory.buffer, str_ptr, str_len);
    let string = '';
    for (let i = 0; i < str_len; i++) {
      string += String.fromCharCode(view[i]);
    }
    console.log(string + num); // CHECK
}

// just prepend a tagline and log with 'warn'
function log_error_string(ptr, len) {
    const view = new Uint8Array(wasmApp.exports.memory.buffer, ptr, len);
    let string = '';
    for (let i = 0; i < len; i++) {
      string += String.fromCharCode(view[i]);
    }
    console.warn("WASM Error: " + string);
}



// ==== AUDIO ====

// global audio context
const audio_ctx = new (window.AudioContext || window.webkitAudioContext)();
audio_ctx.suspend();
window.addEventListener('click',   () => { audio_ctx.resume() }); // for chrome
window.addEventListener('keydown', () => { audio_ctx.resume() });


class Oscillator {

    osc;
    gain;

    // choose waveshape on construct
    constructor(waveshape) {
        
        this.osc  = audio_ctx.createOscillator();
        this.gain = audio_ctx.createGain();

        this.osc.type = waveshape;
        this.gain.gain.setValueAtTime(0.0, audio_ctx.currentTime); // start muted

        this.osc.connect(this.gain);
        this.gain.connect(audio_ctx.destination);
        this.osc.start();
    }

    set_freq(freq) {
        this.osc.frequency.setValueAtTime(freq, audio_ctx.currentTime);
    }

    set_amp(amp) {
        this.gain.gain.setValueAtTime(amp, audio_ctx.currentTime);
    }
}



class Noise {

    noise;
    gain;

    constructor() { // white noise
        let buffer_size = 2 * audio_ctx.sampleRate; // 2 seconds
        let noise_buffer = audio_ctx.createBuffer(1, buffer_size, audio_ctx.sampleRate);
        let output = noise_buffer.getChannelData(0);

        // generate 2 seconds of noise
        for (var i = 0; i < buffer_size; i++) {
            output[i] = Math.random() * 2.0 - 1.0;
        }

        this.noise = audio_ctx.createBufferSource();
        this.noise.buffer = noise_buffer;
        this.noise.loop = true; // continuously loop through 2 sec buf

        this.gain = audio_ctx.createGain();
        this.gain.gain.setValueAtTime(0.0, audio_ctx.currentTime); // start muted

        this.noise.connect(this.gain);
        this.gain.connect(audio_ctx.destination);

        this.noise.start();
    }

    set_amp(amp) {
        this.gain.gain.setValueAtTime(amp, audio_ctx.currentTime);
    }

    set_freq(freq) { // rough freq estimate
        this.noise.playbackRate.setValueAtTime(freq * 0.0006, audio_ctx.currentTime);
    }
}



// NES-style
const oscs = [
    new Oscillator('square'),
    new Oscillator('square'),
    new Oscillator('triangle'),
];
const noise = new Noise();


// TODO duty and phase offset
function set_osc(osc_id, freq, amp) {
    if (osc_id < 3) {
        oscs[osc_id].set_freq(freq);
        oscs[osc_id].set_amp(amp);
    } else if (osc_id == 3) {
        noise.set_freq(freq);
        noise.set_amp(amp);
    }
}



// ==== INPUT ====

const BTN_UP      = (1 <<  0);
const BTN_DOWN    = (1 <<  1);
const BTN_LEFT    = (1 <<  2);
const BTN_RIGHT   = (1 <<  3);
const BTN_NORTH   = (1 <<  4);
const BTN_SOUTH   = (1 <<  5);
const BTN_WEST    = (1 <<  6);
const BTN_EAST    = (1 <<  7);
const BTN_LTRIG   = (1 <<  8);
const BTN_RTRIG   = (1 <<  9);
const BTN_SELECT  = (1 << 10);
const BTN_START   = (1 << 11);
const BTN_R_UP    = (1 << 12); // righthand dpad/thumbstick
const BTN_R_DOWN  = (1 << 13);
const BTN_R_LEFT  = (1 << 14);
const BTN_R_RIGHT = (1 << 15);


// js string code to my bitflags
const btnKeyMapping = {
    KeyW       :  BTN_UP     ,
    KeyS       :  BTN_DOWN   ,
    KeyA       :  BTN_LEFT   ,
    KeyD       :  BTN_RIGHT  ,
    KeyI       :  BTN_NORTH  ,
    KeyK       :  BTN_SOUTH  ,
    KeyJ       :  BTN_WEST   ,
    KeyL       :  BTN_EAST   ,
    KeyR       :  BTN_LTRIG  ,
    KeyF       :  BTN_RTRIG  ,
    KeyU       :  BTN_SELECT ,
    KeyE       :  BTN_START  ,
    ArrowUp    :  BTN_R_UP   ,
    ArrowDown  :  BTN_R_DOWN ,
    ArrowLeft  :  BTN_R_LEFT ,
    ArrowRight :  BTN_R_RIGHT,
};

let button_states = 0; // u16 bitset
function get_button_states() { return button_states; }

// input callbacks
function on_keydown(e) { button_states |=  btnKeyMapping[e.code]; }
function on_keyup(e)   { button_states &= ~btnKeyMapping[e.code]; }









// ==== RESIZE ====

const pixel_perfect = true;

function calc_canvas_size(win_size, img_size, pixel_perfect) {
    let scale = Math.min(win_size[0] / img_size[0], win_size[1] / img_size[1]); 
    if (pixel_perfect) scale = Math.floor(scale);
    scale = Math.max(scale, 1);
    return [img_size[0] * scale, img_size[1] * scale];
}

function calc_canvas_offset(win_size, canvas_size) {
    const ox = (Math.max(win_size[0] - canvas_size[0], 0)) / 2;
    const oy = (Math.max(win_size[1] - canvas_size[1], 0)) / 2;
    return [ox, oy];
}



// call on load
async function run() {

    // ==== INSTANTIATE WASM MODULE ====

    
    if (WebAssembly.instantiateStreaming) {
        const { instance } = await WebAssembly.instantiateStreaming(
            fetch('./app.wasm'), wasmImports
        );
        wasmApp = instance;

    } else if (WebAssembly.instantiate) { // older method - for safari
        wasmApp = await fetch('./app.wasm').then(response =>
            response.arrayBuffer()
        ).then(bytes => WebAssembly.instantiate(bytes, wasmImports)
        ).then(results => { return results.instance; });
        
    } else {
        console.log('Your browser does not support WebAssembly');
    }


    // call wasm main func if it exists
    let wasm_entry = wasmApp.exports.main || wasmApp.exports.start;
    if (wasm_entry) { wasm_entry.call(); console.log("WebAssembly is a go!"); }
    else            { console.log("No WebAssembly entry point found.");        }



    // ==== PIXEL BUFFER ====

    // must match wasm app!!

    const pixels_addr = wasmApp.exports.js_pixels.value;

    // create image using our pixel buffer
    const buffer = wasmApp.exports.memory.buffer;
    const offset = pixels_addr;
    const length = 4 * pixel_width * pixel_height;

    const pixels = new ImageData(
        new Uint8ClampedArray(buffer, offset, length), pixel_width,
    );


    // setup canvas and 2d drawing context
    const canvas = document.getElementById('canvas');
    canvas.style.position = 'absolute';
    const ctx = canvas.getContext("2d");
    


    // ==== EVENT HANDLERS ====

    // set resize callback
    const on_resize = () => {
        const win_size = [window.innerWidth, window.innerHeight];

        const canvas_size = calc_canvas_size(win_size, [canvas_width, canvas_height], pixel_perfect);
        const canvas_ofs = calc_canvas_offset(win_size, canvas_size);

        canvas.style.left = canvas_ofs[0] + "px"; canvas.width  = canvas_size[0];
        canvas.style.top  = canvas_ofs[1] + "px"; canvas.height = canvas_size[1];

        // this resets if not called on resize
        ctx.imageSmoothingEnabled = false;
        ctx.webkitImageSmoothingEnabled = false;
    };

    window.onresize = on_resize;
    on_resize();


    // set input callbacks
    window.onkeydown = on_keydown;
    window.onkeyup = on_keyup;


    // ==== RENDER LOOP ====

    let prevTime = Date.now();

    const render = () => {
        
        // calc delta time
        const curTime = Date.now();
        const dt = curTime - prevTime;
        prevTime = curTime;

        // call our wasm lib to populate the pixel buffer
        wasmApp.exports.js_redraw_callback(dt);

        // draw wasm pixel buffer to canvas
        ctx.putImageData(pixels, 0, 0);
        
        // then enlarge to fill whole canvas
        ctx.drawImage(
            canvas,
            0, 0, pixels.width, pixels.height, // src
            0, 0, canvas.width, canvas.height, // dest
        );
        
        requestAnimationFrame(render);
    };
    render();
}
window.addEventListener('load', run);