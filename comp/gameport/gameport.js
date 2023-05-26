import '../gamepad/gamepad.js';
import { disableScroll, enableScroll } from './disable_scroll.js';


class GamePort extends HTMLElement {

   // state
   loaded = false;
   fullscreen = false;
   touchControls = false;
   fauxFullscreen = false; // choose preference

   constructor() {
      super();
      this.attachShadow({ mode: 'open' });

      // set style
      const styleLink = document.createElement('link');
      styleLink.setAttribute('rel', 'stylesheet');
      styleLink.setAttribute('href', '/comp/gameport/gameport.css');
      this.shadowRoot.appendChild(styleLink);

      // add HTML
      // TODO link svg from file
      this.shadowRoot.innerHTML += `
      <div id="gameport">
         <div class="aspectRatioBox">
            <div id="app"></div>

            <svg viewbox="0 0 300 250" id="fullscreenIcon">

               <symbol id="corner"> 
                  <polygon 
                     points="0,0 100,0 100,33 33,33 33,100 0,100 0,0" 
                     style="fill:hotpink;" 
                  >
                     <animateMotion dur="1s" repeatCount="indefinite"
                        path="M0,0 15,15 0,0" />
                  </polygon>
               </symbol>
            
               <use href="#corner"/>
               <use href="#corner" transform="translate(300,   0) rotate( 90)"/>
               <use href="#corner" transform="translate(  0, 250) rotate(270)"/>
               <use href="#corner" transform="translate(300, 250) rotate(180)"/>
            
            </svg>
         
         </div>
         <div id="gamepad"></div>
         <div id="backButton"></div>
      </div>
      `;


      // insert game-pad element
      const gpadDiv = this.shadowRoot.getElementById('gamepad');
      const gamepad = document.createElement('game-pad');
      gamepad.id = 'gamepad';
      gpadDiv.replaceWith(gamepad);



      // setup fullscreen & back buttons
      const fsIcon = this.shadowRoot.getElementById('fullscreenIcon');
      const backButton = this.shadowRoot.getElementById('backButton');

      fsIcon.addEventListener("click", () => this.enterFullscreen());
      backButton.addEventListener("click", () => this.exitFullscreen());
   }


   // replace 'app' with iframe pointing to app
   set app(path) {
      const app = this.shadowRoot.getElementById('app');
      const iframe = document.createElement('iframe');
      iframe.id = 'app';
      iframe.src = path;
      app.replaceWith(iframe);

      const ifr = this.shadowRoot.getElementById('app');
      setupInputForwarding(ifr);
   }


   // custom fullscreen process - faux fs for iOS
   enterFullscreen() {
      this.fullscreen = true;

      // add a class we can ref in css
      const gport = this.shadowRoot.querySelector('#gameport');
      gport.classList.add('fullscreen');

      disableScroll(); // NOT WORKING
      if (!this.fauxFullscreen) requestFullscreen(gport); // does nothing on iOS
   }

   exitFullscreen() {
      this.fullscreen = false;

      const gport = this.shadowRoot.querySelector('#gameport');
      gport.classList.remove('fullscreen');

      enableScroll();
      if (!this.fauxFullscreen) exitFullscreen();
   }


   // IDEA could set 'mode' for desktop, tablet, phone on create
   // check once for device width in js
}
customElements.define('game-port', GamePort);




// pass in desired element
function requestFullscreen(elem) {
   const doc = window.document;
   
   const requestFs = elem.requestFullscreen || elem.webkitRequestFullscreen || elem.msRequestFullscreen;
   if (!requestFs) { console.log('Fullscreen not available on this device.'); return; }

   if(!doc.fullscreenElement && !doc.webkitFullscreenElement && !doc.msFullscreenElement) {
      requestFs.call(elem, { navigationUI: 'hide' });
   }
}

function exitFullscreen() {
   var doc = window.document;
   var exitFs = doc.exitFullscreen || doc.webkitExitFullscreen;
   exitFs.call(doc);  
}


// forward main window key input to app iframe
function setupInputForwarding(app_iframe) {

   app_iframe.onload = () => {
      const app_win = app_iframe.contentWindow;

      window.addEventListener("keydown", (e) => {
         app_win.dispatchEvent(new KeyboardEvent('keydown', e));
      });
      window.addEventListener("keyup", (e) => {
         app_win.dispatchEvent(new KeyboardEvent('keyup', e));
      });
   };
}