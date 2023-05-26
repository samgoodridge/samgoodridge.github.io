function getTouchVector(touchpad, touchEvent) {
   const rect = touchpad.getBoundingClientRect();

   // centre point of touchpad
   const originX = rect.x + rect.width  / 2;
   const originY = rect.y + rect.height / 2;

   let touch = touchEvent.targetTouches[0];

   const touchX = touch.clientX;
   const touchY = touch.clientY;

   // distance of touch from origin
   const dx = touchX - originX;
   const dy = touchY - originY;

   // based on percentage of touchpad radius
   return { x: dx / (rect.width / 2), y: dy / (rect.height / 2) }
}


// bit hacky with keyups but hey
// left side dpad
export function setupDpad(root, touchpad) {

   const threshold = 0.3; // BUT this is too sens on diags - handle sep?

   const up    = { 'code': 'KeyW' };
   const down  = { 'code': 'KeyS' };
   const left  = { 'code': 'KeyA' };
   const right = { 'code': 'KeyD' };

   const iconUp    = root.getElementById('up');
   const iconDown  = root.getElementById('down');
   const iconLeft  = root.getElementById('left');
   const iconRight = root.getElementById('right');

   
   function onTouchDpad(event) {

      const v = getTouchVector(touchpad, event);

      console.log('Touch vector: x ', v.x, ', y ', v.y);

      if (v.x < -threshold) {       // left
         window.dispatchEvent(new KeyboardEvent('keydown', left));
         iconLeft.classList.add('pressed');
      } else if (v.x > threshold) { // right
         window.dispatchEvent(new KeyboardEvent('keydown', right));
         iconRight.classList.add('pressed');
      } else {                // centre
         window.dispatchEvent(new KeyboardEvent('keyup', left));
         window.dispatchEvent(new KeyboardEvent('keyup', right));
         iconLeft.classList.remove('pressed');
         iconRight.classList.remove('pressed');
      }

      if (v.y < -threshold) {       // up
         window.dispatchEvent(new KeyboardEvent('keydown', up));
         iconUp.classList.add('pressed');
      } else if (v.y > threshold) { // down
         window.dispatchEvent(new KeyboardEvent('keydown', down));
         iconDown.classList.add('pressed');
      } else {                // centre
         window.dispatchEvent(new KeyboardEvent('keyup', up));
         window.dispatchEvent(new KeyboardEvent('keyup', down));
         iconUp.classList.remove('pressed');
         iconDown.classList.remove('pressed');
      }
   }

   function onReleaseDpad(event) { // release all
      window.dispatchEvent(new KeyboardEvent('keyup', up));
      window.dispatchEvent(new KeyboardEvent('keyup', down));
      window.dispatchEvent(new KeyboardEvent('keyup', left));
      window.dispatchEvent(new KeyboardEvent('keyup', right));
      iconUp.classList.remove('pressed');
      iconDown.classList.remove('pressed');
      iconLeft.classList.remove('pressed');
      iconRight.classList.remove('pressed');
   }

   touchpad.addEventListener('touchstart', onTouchDpad);
   touchpad.addEventListener('touchmove',  onTouchDpad);
   touchpad.addEventListener('touchend',   onReleaseDpad);
}

// right side 4-way buttons
// atm 8-way enabled
export function setupButtons(root, touchpad) {

   const threshold = 0.3;

   const iconNorth = root.getElementById('north');
   const iconSouth = root.getElementById('south');
   const iconWest  = root.getElementById('west');
   const iconEast  = root.getElementById('east');


   const north = { 'code': 'KeyI' };
   const south = { 'code': 'KeyK' };
   const west =  { 'code': 'KeyJ' };
   const east =  { 'code': 'KeyL' };


   function onTouchButtons(event) {

      const v = getTouchVector(touchpad, event);

      // console.log('Touch vector: x ', v.x, ', y ', v.y);

      if (v.x < -threshold) {       // left
         window.dispatchEvent(new KeyboardEvent('keydown', west));
         iconWest.classList.add("pressed");
      } else if (v.x > threshold) { // right
         window.dispatchEvent(new KeyboardEvent('keydown', east));
         iconEast.classList.add("pressed");
      } else {                     // centre
         window.dispatchEvent(new KeyboardEvent('keyup', west));
         window.dispatchEvent(new KeyboardEvent('keyup', east));
         iconWest.classList.remove("pressed");
         iconEast.classList.remove("pressed");
      }

      if (v.y < -threshold) {       // up
         window.dispatchEvent(new KeyboardEvent('keydown', north));
         iconNorth.classList.add("pressed");
      } else if (v.y > threshold) { // down
         window.dispatchEvent(new KeyboardEvent('keydown', south));
         iconSouth.classList.add("pressed");
      } else {                     // centre
         window.dispatchEvent(new KeyboardEvent('keyup', north));
         window.dispatchEvent(new KeyboardEvent('keyup', south));
         iconNorth.classList.remove("pressed");
         iconSouth.classList.remove("pressed");
      }
   }

   function onReleaseButtons(event) { // release all
      window.dispatchEvent(new KeyboardEvent('keyup', north));
      window.dispatchEvent(new KeyboardEvent('keyup', south));
      window.dispatchEvent(new KeyboardEvent('keyup', west));
      window.dispatchEvent(new KeyboardEvent('keyup', east));
      iconNorth.classList.remove("pressed");
      iconSouth.classList.remove("pressed");
      iconEast.classList.remove("pressed");
      iconWest.classList.remove("pressed");
   }

   touchpad.addEventListener('touchstart', onTouchButtons);
   touchpad.addEventListener('touchmove',  onTouchButtons);
   touchpad.addEventListener('touchend',   onReleaseButtons);
}