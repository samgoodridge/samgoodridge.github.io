import { setupDpad, setupButtons } from './gpad_setup.js'

// IDEA could do custom controller layout per game



class Gamepad extends HTMLElement {
   constructor() {
      super();
      this.attachShadow({mode: 'open'});

      // set style
      const styleLink = document.createElement('link');
      styleLink.setAttribute('rel', 'stylesheet');
      styleLink.setAttribute('href', '/comp/gamepad/gamepad.css');
      this.shadowRoot.appendChild(styleLink);

      // static for now
      this.shadowRoot.innerHTML += `
      <div class="gamepad">
         <div class="gamepadLeft">
            
            <div class="dpadAnchor">
               <div id="up"    class="dpad up"></div>
               <div id="down"  class="dpad down"></div>
               <div id="left"  class="dpad left"></div>
               <div id="right" class="dpad right"></div>
            </div>
            <div class="touchpad left"></div>
            <div id="menuLeft" class="menuButton left"></div>
         </div>
         
         <div class="gamepadRight">
            
            <div class="buttonAnchor">
               <div id="north" class="button north"></div>
               <div id="south" class="button south"></div>
               <div id="east"  class="button east"></div>
               <div id="west"  class="button west"></div>
            </div>
            <div class="touchpad right"></div>
            <div id="menuRight" class="menuButton right"></div>
         </div>
      </div>
      `;


      this.setupInput();
   }


   setupInput() {

      const root = this.shadowRoot;

      // dpad
      const touchpadLeft = root.querySelector('.touchpad.left');
      setupDpad(root, touchpadLeft);

      // 4 way buttons
      const touchpadRight = root.querySelector('.touchpad.right');
      setupButtons(root, touchpadRight);


      // the rest are regular buttons
      const btn_pairs = [
         { btn: root.getElementById('menuLeft'),  key: { 'code': 'Space' } },
         { btn: root.getElementById('menuRight'), key: { 'code': 'Enter' } },
      ];

      btn_pairs.forEach((b) => {
         b.btn.addEventListener('touchstart', (e) => {
            window.dispatchEvent(new KeyboardEvent('keydown', b.key));
            b.btn.classList.add("pressed");
         });
         b.btn.addEventListener('touchend', (e) => {
            window.dispatchEvent(new KeyboardEvent('keyup', b.key));
            b.btn.classList.remove("pressed");
         });
      });

   }


}
customElements.define('game-pad', Gamepad);





