 (function(){
            // A Slider UI element
            function SickSlider(sliderElementSelector) {
              var that = {
                // A function that will be called when user changes the slider position.
                // The function will be passed the slider position: a number between 0 and 1.
                onSliderChange: null,
                // Store the previous slider value in order to prevent calling onSliderChange function with the same argument
                previousSliderValue: -42,
                didRequestUpdateOnNextFrame: false
              };
          
              // Initializes the slider element
              //
              // Arguments:
              //   sliderElementSelector: A CSS selector of the SickSlider element.
              that.init = function(sliderElementSelector) {
                that.slider = document.querySelector(sliderElementSelector);
                that.sliderHead = that.slider.querySelector(".SickSlider-head");
                var sliding = false;
          
                // Start dragging slider
                // -----------------
          
                that.slider.addEventListener("mousedown", function(e) {
                  sliding = true;
                  that.updateHeadPositionOnTouch(e);
                });
          
                that.slider.addEventListener("touchstart", function(e) {
                  sliding = true;
                  that.updateHeadPositionOnTouch(e);
                });
          
                that.slider.onselectstart = function () { return false; };
          
                // End dragging slider
                // -----------------
          
                document.addEventListener("mouseup", function(){
                  sliding = false;
                });
          
                document.addEventListener("dragend", function(){
                  sliding = false;
                });
          
                document.addEventListener("touchend", function(e) {
                  sliding = false;
                });
          
                // Drag slider
                // -----------------
          
                document.addEventListener("mousemove", function(e) {
                  if (!sliding) { return; }
                  that.updateHeadPositionOnTouch(e);
                });
          
                document.addEventListener("touchmove", function(e) {
                  if (!sliding) { return; }
                  that.updateHeadPositionOnTouch(e);
                });
          
                that.slider.addEventListener("touchmove", function(e) {
                  if (typeof e.preventDefault !== 'undefined' && e.preventDefault !== null) {
                    e.preventDefault(); // Prevent screen from sliding on touch devices when the element is dragged.
                  }
                });
              };
          
              // Returns the slider value (a number form 0 to 1) from the cursor position
              //
              // Arguments:
              //
              //   e: a touch event.
              //
              that.sliderValueFromCursor = function(e) {
                var pointerX = e.pageX;
          
                if (e.touches && e.touches.length > 0) {
                  pointerX = e.touches[0].pageX;
                }
          
                pointerX = pointerX - that.slider.offsetLeft;
                var headLeft = (pointerX - 16);
                if (headLeft < 0) { headLeft = 0; }
          
                if ((headLeft + that.sliderHead.offsetWidth) > that.slider.offsetWidth) {
                  headLeft = that.slider.offsetWidth - that.sliderHead.offsetWidth;
                }
          
                // Calculate slider value from head position
                var sliderWidthWithoutHead = that.slider.offsetWidth - that.sliderHead.offsetWidth;
                var sliderValue = 1;
          
                if (sliderWidthWithoutHead !== 0) {
                  sliderValue = headLeft / sliderWidthWithoutHead;
                }
          
                return sliderValue;
              };
          
          
              // Changes the position of the slider
              //
              // Arguments:
              //
              //   sliderValue: a value between 0 and 1.
              //
              that.changePosition = function(sliderValue) {
                var headLeft = (that.slider.offsetWidth - that.sliderHead.offsetWidth) * sliderValue;
                that.sliderHead.style.left = headLeft + "px";
              };
          
              // Update the slider position and call the callback function
              //
              // Arguments:
              //
              //   e: a touch event.
              //
              that.updateHeadPositionOnTouch = function(e) {
                var sliderValue = that.sliderValueFromCursor(e);
          
                // Handle the head change only if it changed significantly (more than 0.1%)
                if (Math.round(that.previousSliderValue * 1000) === Math.round(sliderValue * 1000)) { return; }
                that.previousSliderValue = sliderValue;
          
                if (!that.didRequestUpdateOnNextFrame) {
                  // Update the slider on next redraw, to improve performance
                  that.didRequestUpdateOnNextFrame = true;
                  window.requestAnimationFrame(that.updateOnFrame);
                }
              };
          
              that.updateOnFrame = function() {
                that.changePosition(that.previousSliderValue);
          
                if (that.onSliderChange) {
                  that.onSliderChange(that.previousSliderValue);
                }
          
                that.didRequestUpdateOnNextFrame = false;
              };
          
              that.init(sliderElementSelector);
          
              return that;
            }
          
            // Show debug messages on screen
            var debug = (function(){
              var debugOutput = document.querySelector(".EarthOrbitSimulation-debugOutput");
          
              function print(text) {
                var date = new Date();
                debugOutput.innerHTML = text + " " + date.getMilliseconds();
              }
          
              return {
                  print: print,
                };
            })();
          
            // Calculates the position of the Earth
            var physics = (function() {
              var constants = {
                gravitationalConstant: 6.67408 * Math.pow(10, -11),
                earthSunDistanceMeters: 1.496 * Math.pow(10, 11),
                earthAngularVelocityMetersPerSecond: 1.990986 *  Math.pow(10, -7),
                massOfTheSunKg: 1.98855 * Math.pow(10, 30)
              };
          
              // The length of one AU (Earth-Sun distance) in pixels.
              var pixelsInOneEarthSunDistancePerPixel = 150;
          
              // A factor by which we scale the distance between the Sun and the Earth
              // in order to show it on screen
              var scaleFactor = constants.earthSunDistanceMeters / pixelsInOneEarthSunDistancePerPixel;
          
              // The number of calculations of orbital path done in one 16 millisecond frame.
              // The higher the number, the more precise are the calculations and the slower the simulation.
              var numberOfCalculationsPerFrame = 1000;
          
              // The length of the time increment, in seconds.
              var deltaT = 3600 * 24 / numberOfCalculationsPerFrame;
          
              // Initial condition of the model
              var initialConditions = {
                distance: {
                  value: constants.earthSunDistanceMeters,
                  speed: 0.00
                },
                angle: {
                  value: Math.PI / 6,
                  speed: constants.earthAngularVelocityMetersPerSecond
                }
              };
          
              // Current state of the system
              var state = {
                distance: {
                  value: 0,
                  speed: 0
                },
                angle: {
                  value: 0,
                  speed: 0
                },
                massOfTheSunKg: constants.massOfTheSunKg,
                paused: false
              };
          
              function calculateDistanceAcceleration(state) {
                // [acceleration of distance] = [distance][angular velocity]^2 - G * M / [distance]^2
                return state.distance.value * Math.pow(state.angle.speed, 2) -
                  (constants.gravitationalConstant * state.massOfTheSunKg) / Math.pow(state.distance.value, 2);
              }
          
              function calculateAngleAcceleration(state) {
                // [acceleration of angle] = - 2[speed][angular velocity] / [distance]
                return -2.0 * state.distance.speed * state.angle.speed / state.distance.value;
              }
          
              // Calculates a new value based on the time change and its derivative
              // For example, it calculates the new distance based on the distance derivative (velocity)
              // and the elapsed time interval.
              function newValue(currentValue, deltaT, derivative) {
                return currentValue + deltaT * derivative;
              }
          
              function resetStateToInitialConditions() {
                state.distance.value = initialConditions.distance.value;
                state.distance.speed = initialConditions.distance.speed;
          
                state.angle.value = initialConditions.angle.value;
                state.angle.speed = initialConditions.angle.speed;
              }
          
              // The distance that is used for drawing on screen
              function scaledDistance() {
                return state.distance.value / scaleFactor;
              }
          
              // The main function that is called on every animation frame.
              // It calculates and updates the current positions of the bodies
              function updatePosition() {
                if (physics.state.paused) { return; }
                for (var i = 0; i < numberOfCalculationsPerFrame; i++) {
                  calculateNewPosition();
                }
          
              }
          
              // Calculates position of the Earth
              function calculateNewPosition() {
                // Calculate new distance
                var distanceAcceleration = calculateDistanceAcceleration(state);
                state.distance.speed = newValue(state.distance.speed, deltaT, distanceAcceleration);
                state.distance.value = newValue(state.distance.value, deltaT, state.distance.speed);
          
                // Calculate new angle
                var angleAcceleration = calculateAngleAcceleration(state);
                state.angle.speed = newValue(state.angle.speed, deltaT, angleAcceleration);
                state.angle.value = newValue(state.angle.value, deltaT, state.angle.speed);
          
                if (state.angle.value > 2 * Math.PI) {
                  state.angle.value = state.angle.value % (2 * Math.PI);
                }
              }
          
              // Updates the mass of the Sun
              function updateFromUserInput(solarMassMultiplier) {
                state.massOfTheSunKg = constants.massOfTheSunKg * solarMassMultiplier;
              }
          
              return {
                scaledDistance: scaledDistance,
                resetStateToInitialConditions: resetStateToInitialConditions,
                updatePosition: updatePosition,
                initialConditions: initialConditions,
                updateFromUserInput: updateFromUserInput,
                state: state
              };
            })();
          
            // Draw the scene
            var graphics = (function() {
              var canvas = null, // Canvas DOM element.
                context = null, // Canvas context for drawing.
                canvasHeight = 400,
                earthSize = 25,
                sunsSize = 60,
                colors = {
                  orbitalPath: "#777777"
                },
                previousEarthPosition = null,
                earthElement,
                sunElement,
                earthEndElement,
                currentSunsSize = sunsSize,
                middleX = 1,
                middleY = 1;
          
              function showHideEarthEndMessage(show) {
                earthEndElement.style.display = show ? 'block' : 'none';
              }
          
              function drawTheEarth(earthPosition) {
                var left = (earthPosition.x - earthSize/2) + "px";
                var top = (earthPosition.y - earthSize/2) + "px";
                earthElement.style.left = left;
                earthElement.style.top = top;
              }
          
              function calculateEarthPosition(distance, angle) {
                middleX = Math.floor(canvas.width / 2);
                middleY = Math.floor(canvas.height / 2);
                var centerX = Math.cos(angle) * distance + middleX;
                var centerY = Math.sin(-angle) * distance + middleY;
          
                return {
                  x: centerX,
                  y: centerY
                };
              }
          
              // Updates the size of the Sun based on its mass. The sunMass argument is a fraction of the real Sun's mass.
              function updateSunSize(sunMass) {
                sunElement.setAttribute("style","filter:brightness(" + sunMass + "); " +
                  "-webkit-filter:brightness(" + sunMass + "); ");
                var sunsDefaultWidth = sunsSize;
                currentSunsSize = sunsDefaultWidth * Math.pow(sunMass, 1/3);
                sunElement.style.width = currentSunsSize + "px";
                sunElement.style.marginLeft = -(currentSunsSize / 2.0) + "px";
                sunElement.style.marginTop = -(currentSunsSize / 2.0) + "px";
              }
          
              function drawOrbitalLine(newEarthPosition) {
                if (previousEarthPosition === null) {
                  previousEarthPosition = newEarthPosition;
                  return;
                }
          
                context.beginPath();
                context.strokeStyle = colors.orbitalPath;
                context.moveTo(previousEarthPosition.x, previousEarthPosition.y);
                context.lineTo(newEarthPosition.x, newEarthPosition.y);
                context.stroke();
          
                previousEarthPosition = newEarthPosition;
              }
          
              // Return true if Earth has collided with the Sun
              function isEarthCollidedWithTheSun(earthPosition) {
                var correctedSunsSize = currentSunsSize - 20;
                var sunHalf = correctedSunsSize / 2;
                var sunLeft = middleX - sunHalf;
                var sunRight = middleX + sunHalf;
                var sunTop = middleY - sunHalf;
                var sunBottom = middleY + sunHalf;
          
                return (earthPosition.x >= sunLeft && earthPosition.x <= sunRight &&
                  earthPosition.y >= sunTop && earthPosition.y <= sunBottom);
              }
          
              // Draws the scene
              function drawScene(distance, angle) {
                var earthPosition = calculateEarthPosition(distance, angle);
                drawTheEarth(earthPosition);
                drawOrbitalLine(earthPosition);
          
                if (isEarthCollidedWithTheSun(earthPosition)) {
                  physics.state.paused = true;
                  showHideEarthEndMessage(true);
                }
              }
          
              function hideCanvasNotSupportedMessage() {
                document.getElementById("EarthOrbitSimulation-notSupportedMessage").style.display ='none';
              }
          
              // Resize canvas to will the width of container
              function fitToContainer(){
                canvas.style.width='100%';
                canvas.style.height= canvasHeight + 'px';
                canvas.width  = canvas.offsetWidth;
                canvas.height = canvas.offsetHeight;
              }
          
              // Create canvas for drawing and call success argument
              function init(success) {
                // Find the canvas HTML element
                canvas = document.querySelector(".EarthOrbitSimulation-canvas");
          
                // Check if the browser supports canvas drawing
                if (!(window.requestAnimationFrame && canvas && canvas.getContext)) { return; }
          
                // Get canvas context for drawing
                context = canvas.getContext("2d");
                if (!context) { return; } // Error, browser does not support canvas
          
                // If we got to this point it means the browser can draw
                // Hide the old browser message
                hideCanvasNotSupportedMessage();
          
                // Update the size of the canvas
                fitToContainer();
          
                earthElement = document.querySelector(".EarthOrbitSimulation-earth");
                sunElement = document.querySelector(".EarthOrbitSimulation-sun");
                earthEndElement = document.querySelector(".EarthOrbitSimulation-earthEnd");
          
                // Execute success callback function
                success();
              }
          
              function clearScene() {
                context.clearRect(0, 0, canvas.width, canvas.height);
                previousEarthPosition = null;
              }
          
              return {
                fitToContainer: fitToContainer,
                drawScene: drawScene,
                updateSunSize: updateSunSize,
                showHideEarthEndMessage: showHideEarthEndMessage,
                clearScene: clearScene,
                init: init
              };
            })();
          
            // Start the simulation
            var simulation = (function() {
              // The method is called 60 times per second
              function animate() {
                physics.updatePosition();
                graphics.drawScene(physics.scaledDistance(), physics.state.angle.value);
                window.requestAnimationFrame(animate);
              }
          
              function start() {
                graphics.init(function() {
                  // Use the initial conditions for the simulation
                  physics.resetStateToInitialConditions();
          
                  // Redraw the scene if page is resized
                  window.addEventListener('resize', function(event){
                    graphics.fitToContainer();
                    graphics.clearScene();
                    graphics.drawScene(physics.scaledDistance(), physics.state.angle.value);
                  });
          
                  animate();
                });
              }
          
              return {
                start: start
              };
            })();
          
            // React to user input
            var userInput = (function(){
              var sunsMassElement = document.querySelector(".EarthOrbitSimulation-sunsMass");
              var restartButton = document.querySelector(".EarthOrbitSimulation-reload");
              var massSlider;
          
              function updateSunsMass(sliderValue) {
                var sunsMassValue = sliderValue * 2;
          
                if (sunsMassValue > 1) {
                  sunsMassValue = Math.pow(5, sunsMassValue - 1);
                }
          
                var formattedMass = parseFloat(Math.round(sunsMassValue * 100) / 100).toFixed(2);
                sunsMassElement.innerHTML = formattedMass;
                physics.updateFromUserInput(sunsMassValue);
                graphics.updateSunSize(sunsMassValue);
              }
          
              function didClickRestart() {
                graphics.showHideEarthEndMessage(false);
                physics.resetStateToInitialConditions();
                graphics.clearScene();
                updateSunsMass(0.5);
                massSlider.changePosition(0.5);
                physics.state.paused = false;
                return false; // Prevent default
              }
          
              function init() {
                massSlider = SickSlider(".EarthOrbitSimulation-massSlider");
                massSlider.onSliderChange = updateSunsMass;
                massSlider.changePosition(0.5);
                restartButton.onclick = didClickRestart;
              }
          
              return {
                init: init
              };
            })();
          
            userInput.init();
          
            simulation.start();
          })();
          