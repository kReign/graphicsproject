//*******************************************************************************
//* Program: charlesharvin.js
//* Authors: Taylor Harvin
//*          Alex Charles
//* Main project file for 4250 Project Four.
//* FOR CLASS: Since the last project requires audio, here's a page with a way 
//*            to do it that's very easy: 
//*              https://developer.mozilla.org/en-US/docs/Web/API/HTMLAudioElement
//*            which inherits from:/HTMLMediaElement
//*              https://developer.mozilla.org/en-US/docs/Web/API
//*
//* NOTE:     This works best in Chrome. For some reason some camera controls may
//*           be reversed on a mac....I'll fix it later. - Alex 
//*******************************************************************************

var modelViewMatrix=mat4(); // identity
var modelViewMatrixLoc;
var projectionMatrix;
var projectionMatrixLoc;
var modelViewStack=[];

// Variables that control the orthographic projection bounds.
var y_max = 5;
var y_min = -5;
var x_max = 8;
var x_min = -8;
var near = -50;
var far = 50;

var program;

// Camera 
var eye = vec3(0, 0, 0);
const at = vec3(0, 0, 0);
const up = vec3(0, 1, 0);

var points=[];
var colors=[];
var normals=[];
var textureCoordsArray = [];  // textures array

// TODO: Set a single scene light (handled in scene?)
//       and give each object its own material (in scene).
var lightPosition = vec4(-4, 3, 4, 0.0 );
var lightAmbient = vec4(.8, 0.8, 0.8, 1.0 );
var lightDiffuse = vec4( .5, .5, .5, 1.0 );
var lightSpecular = vec4( 1.0, 1.0, 1.0, 1.0 );

var materialAmbient = vec4( 0.1, 0.1, 0.1, 1.0 );
var materialDiffuse = vec4( 0.1, 0.1, 0.1, 1.0);
var materialSpecular = vec4( 1.0, 1.0, 1.0, 1.0 );
var materialShininess = 10.0;

var ambientColor, diffuseColor, specularColor;

var textures = [];
var sounds = [];

//*******************************************************************************
//* Scene namespace. Contains the object which holds all SceneObjects along with
//* its definition. Also contains the function to draw SceneObjects.
//*******************************************************************************
var Scene = {

    // Holds all of the objects in a scene, defined in SceneObject.
    objects : {},

    SceneObject : function (start, length, type, translate, rotate, scale) {
        this.start = start;
        this.length = length;
        this.type = type;
        this.translate = translate || vec3(0, 0, 0);
        this.scale = scale || vec3(1, 1, 1);
        this.rotate = rotate || vec4(0, 1.0, 0, 0);
    },

    // TODO: Add the transformations to each object and add
    //       a way to set them (ex. objects["this"].setTranslate(x, y, z)).
    DrawObject : function (objectName) {
        var obj = Scene.objects[objectName];

        //modelViewStack.push(modelViewMatrix);

        //modelViewMatrix = mult(modelViewMatrix, obj.translate);
        //modelViewMatrix = mult(modelViewMatrix, obj.rotate);
        //modelViewMatrix = mult(modelViewMatrix, obj.scale);
        //gl.uniformMatrix4fv(modelViewMatrixLoc, false, flatten(modelViewMatrix));
		//console.log("DRAWING: "+textureCoordsArray.length+" , "+objectName+" , "+obj.type +" , " +obj.start + " , " + obj.length);
        gl.drawArrays(obj.type, obj.start, obj.length);
        //modelViewMatrix = modelViewStack.pop();
    }
};
//*******************************************************************************
//* End Scene namespace
//*******************************************************************************

//*******************************************************************************
//* PFour namespace - contains information about the current project.
//*******************************************************************************
var PFour = {

    // Target animation control variables.
    animating : true,
    targetDir : 'R',
    currTargetTrans : 0,
    targetStepSize : 0.1,

    currentStep : 0,

    // Gun animation control variables.
    gunAnimating : false,
    gunAnimStep : 0,
    gunAnimStepSize : 15,
    gunGoingUp : true,

    gunPosition : 0,
    score : 0,

    // Camera pan control variables.
    zoomFactor : 2,
    translateX : 0,
    translateY : 0,

    // Camera rotate control variables.
    phi : 1,
    theta : 0.5,
    radius : 1,
    dr : 5.0 * Math.PI/180.0,

    // Mouse control variables - check AttachHandlers() to see how they're used.
    mouseDownRight : false,
    mouseDownLeft : false,

    mousePosOnClickX : 0,
    mousePosOnClickY : 0,

    soundsPaused : true

};


// Load a new texture
function loadNewTexture(whichTex){
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);

    gl.activeTexture(gl.TEXTURE0 + whichTex);
    gl.bindTexture(gl.TEXTURE_2D, textures[whichTex]);

    gl.texImage2D( gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, textures[whichTex].image );
    gl.texParameteri( gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST );
    gl.texParameteri( gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST );
}


// Setup the new image object prior to loading to the shaders
function openNewTexture(imageSRC){
    var i = textures.length;
	textures[i] = gl.createTexture();
    textures[i].image = new Image();
	
    textures[i].image.onload = function() {
        loadNewTexture(i); 
    }
    textures[i].image.crossOrigin = "Anonymous"; // Added to prevent the cross-origin issue
    textures[i].image.src=imageSRC;
}

//*******************************************************************************
//* Called when the window is loaded. Sets up WebGL, generates the points
//* (see generatepoints.js), and starts the update loop.
//*******************************************************************************
window.onload = function init() {
    canvas = document.getElementById( "gl-canvas" );

    gl = WebGLUtils.setupWebGL( canvas );
    if ( !gl ) { alert( "WebGL isn't available" ); }

    // See generatepoints.js for function definition.
    GeneratePoints();

    gl.viewport( 0, 0, canvas.width, canvas.height );
    gl.clearColor( 0.0, 0.0, 0.0, 1.0 );

    gl.enable(gl.DEPTH_TEST);

    //*******************************************************************************
    //* Create the shader program and set up the variables in the shaders and 
    //* on the buffers.
    //*******************************************************************************
    program = initShaders( gl, "vertex-shader", "fragment-shader" );
    gl.useProgram( program );

    // Normals
    var nBuffer = gl.createBuffer();
    gl.bindBuffer( gl.ARRAY_BUFFER, nBuffer );
    gl.bufferData( gl.ARRAY_BUFFER, flatten(normals), gl.STATIC_DRAW );
    
    var vNormal = gl.getAttribLocation( program, "vNormal" );
    gl.vertexAttribPointer( vNormal, 3, gl.FLOAT, false, 0, 0 );
    gl.enableVertexAttribArray( vNormal );

    // Colors
    var cBuffer = gl.createBuffer();
    gl.bindBuffer( gl.ARRAY_BUFFER, cBuffer );
    gl.bufferData( gl.ARRAY_BUFFER, flatten(colors), gl.STATIC_DRAW );

    var vColor = gl.getAttribLocation( program, "vColor" );
    gl.vertexAttribPointer( vColor, 4, gl.FLOAT, false, 0, 0 );
    gl.enableVertexAttribArray( vColor );
	
	// Textures
	var textureBuffer = gl.createBuffer();
	gl.bindBuffer(gl.ARRAY_BUFFER, textureBuffer);
	gl.bufferData(gl.ARRAY_BUFFER, flatten(textureCoordsArray), gl.STATIC_DRAW);
	
	var vTextureCoord = gl.getAttribLocation( program, "vTextureCoord" );
    gl.vertexAttribPointer( vTextureCoord, 2, gl.FLOAT, false, 0, 0 );
    gl.enableVertexAttribArray( vTextureCoord );

    // Vertices
    var vBuffer = gl.createBuffer();
    gl.bindBuffer( gl.ARRAY_BUFFER, vBuffer );
    gl.bufferData( gl.ARRAY_BUFFER, flatten(points), gl.STATIC_DRAW );

    var vPosition = gl.getAttribLocation( program, "vPosition" );
    gl.vertexAttribPointer( vPosition, 4, gl.FLOAT, false, 0, 0 );
    gl.enableVertexAttribArray( vPosition );

    modelViewMatrixLoc = gl.getUniformLocation(program, "modelViewMatrix");
    projectionMatrixLoc= gl.getUniformLocation(program, "projectionMatrix");

    ambientProduct = mult(lightAmbient, materialAmbient);
    diffuseProduct = mult(lightDiffuse, materialDiffuse);
    specularProduct = mult(lightSpecular, materialSpecular);

    gl.uniform4fv(gl.getUniformLocation(program, "ambientProduct"),
       flatten(ambientProduct));
    gl.uniform4fv(gl.getUniformLocation(program, "diffuseProduct"),
       flatten(diffuseProduct) );
    gl.uniform4fv(gl.getUniformLocation(program, "specularProduct"), 
       flatten(specularProduct) );  
    gl.uniform4fv(gl.getUniformLocation(program, "lightPosition"), 
       flatten(lightPosition) );
       
    gl.uniform1f(gl.getUniformLocation(program, 
       "shininess"),materialShininess);

    //*******************************************************************************
    //* End shader program setup
    //*******************************************************************************
	
	// Load Textures.
    openNewTexture("textures/white.jpg");
	openNewTexture("textures/bamboo_dark.jpg");
    openNewTexture("textures/metal.png");
    openNewTexture("textures/gold.jpg");
    openNewTexture("textures/wall.png");

    // Load sounds.
    sounds.push(new Audio("sounds/gun1.mp3"));
    sounds.push(new Audio("sounds/gun2.mp3"));
    sounds.push(new Audio("sounds/gun3.mp3"));
    sounds.push(new Audio("sounds/gun4.mp3"));
    sounds.push(new Audio("sounds/gun5.mp3"));
    sounds.push(new Audio("sounds/music.mp3"));
	
    // Attach the handlers to the document/canvas.
    AttachHandlers();

    Update();
}

//*******************************************************************************
//* This is constantly called and 
//*******************************************************************************
function Update() {

    // Animates the target.
    if(PFour.animating) {

        if(PFour.targetDir == 'R'){
            if(PFour.currTargetTrans < 5)
                PFour.currTargetTrans += PFour.targetStepSize;
            else{
                PFour.currTargetTrans -= PFour.targetStepSize;
                PFour.targetDir = 'L';
            }
        }
        else{
            if(PFour.currTargetTrans > -5)
                PFour.currTargetTrans -= PFour.targetStepSize;
            else{
                PFour.currTargetTrans += PFour.targetStepSize;
                PFour.targetDir = 'R';
            }
        }
    }

    if(PFour.gunAnimating) {
        if (PFour.gunGoingUp) {
            PFour.gunAnimStep += PFour.gunAnimStepSize;
            if (PFour.gunAnimStep > 50) {
                PFour.gunGoingUp = false;
            }
        } else {
            PFour.gunAnimStep -= PFour.gunAnimStepSize;
            if (PFour.gunAnimStep == 0) {
                PFour.gunAnimating = false;
                PFour.gunGoingUp = true;
            }
        }
    }

    Render();
    requestAnimFrame(Update);
}

//*******************************************************************************
//* Call the functions we need to draw each object in the scene.
//*******************************************************************************
function Render() {

    gl.clear( gl.COLOR_BUFFER_BIT );

    // Setup the projection matrix.
    projectionMatrix = ortho( x_min*PFour.zoomFactor - PFour.translateX, 
                              x_max*PFour.zoomFactor - PFour.translateX, 
                              y_min*PFour.zoomFactor - PFour.translateY, 
                              y_max*PFour.zoomFactor - PFour.translateY, 
                              near, far);
    gl.uniformMatrix4fv(projectionMatrixLoc, false, flatten(projectionMatrix));

    // Setup the initial model-view matrix.
    eye = vec3( PFour.radius*Math.cos(PFour.phi), 
                PFour.radius*Math.sin(PFour.theta),
                PFour.radius*Math.sin(PFour.phi));
    modelViewMatrix = lookAt(eye, at, up);
    gl.uniformMatrix4fv(modelViewMatrixLoc, false, flatten(modelViewMatrix));

    gl.uniform1i(gl.getUniformLocation(program, "texture"), 1);
    gl.uniform1f(gl.getUniformLocation(program, "shininess"),materialShininess);

    // ROOM
    DrawRoom();

    // GOBLET
    modelViewStack.push(modelViewMatrix);
    modelViewMatrix = mult(modelViewMatrix, translate(7, 4, -8.5));
    modelViewMatrix = mult(modelViewMatrix, rotate(-20, 0, 0, 1.0));
    modelViewMatrix = mult(modelViewMatrix, scale4(1.5, 1.5, 1.5));
    gl.uniformMatrix4fv(modelViewMatrixLoc, false, flatten(modelViewMatrix));

    gl.uniform1i(gl.getUniformLocation(program, "texture"), 3);
    gl.uniform1f(gl.getUniformLocation(program, "shininess"), .5);

    Scene.DrawObject("goblet");
    modelViewMatrix = modelViewStack.pop();

    //GIRAFFE
    modelViewStack.push(modelViewMatrix);
    modelViewMatrix = mult(modelViewMatrix, translate(-7, 4, -8.5));
    modelViewMatrix = mult(modelViewMatrix, rotate(20, 0, 0, 1.0));
    modelViewMatrix = mult(modelViewMatrix, scale4(1.5, 1.5, 1.5));
    gl.uniformMatrix4fv(modelViewMatrixLoc, false, flatten(modelViewMatrix));

    gl.uniform1i(gl.getUniformLocation(program, "texture"), 0);

    Scene.DrawObject("giraffe");
    modelViewMatrix = modelViewStack.pop();

    // GUN
    modelViewStack.push(modelViewMatrix);
    modelViewMatrix = mult(modelViewMatrix, translate(PFour.gunPosition, 2.4, 9));
    modelViewMatrix = mult(modelViewMatrix, rotate(-90, 0, 1.0, 0));
    modelViewMatrix = mult(modelViewMatrix, rotate(-PFour.gunAnimStep, 0, 0, 1.0));
    gl.uniformMatrix4fv(modelViewMatrixLoc, false, flatten(modelViewMatrix));

    gl.uniform1i(gl.getUniformLocation(program, "texture"), 2);
    gl.uniform1f(gl.getUniformLocation(program, "shininess"),5);

    Scene.DrawObject("gun");
    modelViewMatrix = modelViewStack.pop();

    // SMALLER TABLE
    modelViewStack.push(modelViewMatrix);
    modelViewMatrix = mult(modelViewMatrix, translate(0, -1, 7.5));
    gl.uniformMatrix4fv(modelViewMatrixLoc, false, flatten(modelViewMatrix));

    gl.uniform1i(gl.getUniformLocation(program, "texture"), 2);

    DrawTable();
    modelViewMatrix = modelViewStack.pop();

    // LARGER TABLE
    modelViewStack.push(modelViewMatrix);
    modelViewMatrix = mult(modelViewMatrix, translate(0, .4, -3));
    modelViewMatrix = mult(modelViewMatrix, scale4(1.5, 1.5, 1.5));
    gl.uniformMatrix4fv(modelViewMatrixLoc, false, flatten(modelViewMatrix));

    gl.uniform1i(gl.getUniformLocation(program, "texture"), 2);

    DrawTable();
    modelViewMatrix = modelViewStack.pop();

    // SIGN
    modelViewStack.push(modelViewMatrix);
    modelViewMatrix = mult(modelViewMatrix, translate(0, 4.5, -9.5));
    modelViewMatrix = mult(modelViewMatrix, scale4(3, 3, 3));
    modelViewMatrix = mult(modelViewMatrix, rotate(0, 0, 1.0, 0));
    gl.uniformMatrix4fv(modelViewMatrixLoc, false, flatten(modelViewMatrix));

    gl.uniform1i(gl.getUniformLocation(program, "texture"), 0);

    Scene.DrawObject("sign");
    modelViewMatrix = modelViewStack.pop();

    // TARGET
    modelViewStack.push(modelViewMatrix);
    modelViewMatrix = mult(modelViewMatrix, translate(PFour.currTargetTrans, 
                                                      3.5 + Math.sin(PFour.currTargetTrans), 
                                                      -3));
    modelViewMatrix = mult(modelViewMatrix, scale4(1, 1, 1));
    gl.uniformMatrix4fv(modelViewMatrixLoc, false, flatten(modelViewMatrix));

    gl.uniform1f(gl.getUniformLocation(program, "shininess"),100);

    Scene.DrawObject("target");
    modelViewMatrix = modelViewStack.pop();
}

//*******************************************************************************
//* Sets all of the event handlers onto the document/canvas.
//*******************************************************************************
function AttachHandlers() {

    // These four just set the handlers for the buttons.
    document.getElementById("thetaup").addEventListener("click", function(e) {
        PFour.theta += PFour.dr;
    });
    document.getElementById("thetadown").addEventListener("click", function(e) {
        PFour.theta -= PFour.dr;
    });
    document.getElementById("phiup").addEventListener("click", function(e) {
        PFour.phi += PFour.dr;
    });
    document.getElementById("phidown").addEventListener("click", function(e) {
        PFour.phi -= PFour.dr;
    });

    // Set the scroll wheel to change the zoom factor.
    document.getElementById("gl-canvas").addEventListener("wheel", function(e) {
        if (e.wheelDelta > 0) {
            PFour.zoomFactor = Math.max(0.1, PFour.zoomFactor - 0.3);
        } else {
            PFour.zoomFactor += 0.3;
        }
    });

    //************************************************************************************
    //* When you click a mouse button, set it so that only that button is seen as
    //* pressed in PFour. Then set the position. The idea behind this and the mousemove
    //* event handler's functionality is that each update we see how much the mouse moved
    //* and adjust the camera value by that amount.
    //************************************************************************************
    document.getElementById("gl-canvas").addEventListener("mousedown", function(e) {
        if (e.which == 1) {
            PFour.mouseDownLeft = true;
            PFour.mouseDownRight = false;
            PFour.mousePosOnClickY = e.y;
            PFour.mousePosOnClickX = e.x;
        } else if (e.which == 3) {
            PFour.mouseDownRight = true;
            PFour.mouseDownLeft = false;
            PFour.mousePosOnClickY = e.y;
            PFour.mousePosOnClickX = e.x;
        }
    });

    document.addEventListener("mouseup", function(e) {
        PFour.mouseDownLeft = false;
        PFour.mouseDownRight = false;
    });

    document.addEventListener("mousemove", function(e) {
        if (PFour.mouseDownRight) {
            PFour.translateX += (e.x - PFour.mousePosOnClickX)/30;
            PFour.mousePosOnClickX = e.x;

            PFour.translateY -= (e.y - PFour.mousePosOnClickY)/30;
            PFour.mousePosOnClickY = e.y;
        } else if (PFour.mouseDownLeft) {
            PFour.phi += (e.x - PFour.mousePosOnClickX)/100;
            PFour.mousePosOnClickX = e.x;

            PFour.theta += (e.y - PFour.mousePosOnClickY)/100;
            PFour.mousePosOnClickY = e.y;
        }
    });

    // If you press 'a', start or end animation.
    document.addEventListener("keypress", function(e) {
        console.log(e.keyCode);
        if (e.keyCode == 97) {
            PFour.animating = !PFour.animating;
        } else if (e.keyCode == 115) {

            if(!PFour.soundsPaused) {
                var noise = Math.floor(Math.random() * (5));
                for (var i = 0; i < 5; ++i) {
                    sounds[i].pause();
                    sounds[i].currentTime = 0;
                }
                sounds[noise].play();

                PFour.gunAnimating = true;
                PFour.gunAnimStep = 0;
                PFour.gunGoingUp = true;

                // Check to see if target is in-line with gun when shot.
                if (PFour.currTargetTrans < PFour.gunPosition + 1 &&
                    PFour.currTargetTrans > PFour.gunPosition - 1) {
                    PFour.score += 100;
                    document.getElementById("score").innerText = PFour.score.toString();
                }

            }

        } else if (e.keyCode == 112) {
            if (!PFour.soundsPaused) {
                for (var i = 0; i < sounds.length; ++i) {
                    sounds[i].pause();
                    sounds[i].currentTime = 0;
                }
                PFour.soundsPaused = true;
            } else {
                sounds[5].play();
                PFour.soundsPaused = false;
            }
        } else if (e.keyCode == 98) {
            PFour.gunPosition = 0;
            PFour.gunAnimating = false;
            PFour.gunGoingUp = true;
            for (var i = 0; i < 5; ++i) {
                sounds[i].pause();
                sounds[i].currentTime = 0;
            }
            PFour.score = 0;
            document.getElementById("score").innerText = PFour.score.toString();
            PFour.animating = true;
        }
    });

    document.addEventListener("keydown", function(e) {
        switch(e.which) {
            case 37:
            PFour.gunPosition = -3.5;
            break;

            case 39:
            PFour.gunPosition = 3.5;
            break;
        }
    });

    document.addEventListener("keyup", function(e) {
        switch(e.which) {
            case 37:
            case 39:
            PFour.gunPosition = 0;
            break;
        }
    });
}

function scale4(a, b, c) {
    var result = mat4();
    result[0][0] = a;
    result[1][1] = b;
    result[2][2] = c;
    return result;
}

function DrawTable() {
    modelViewStack.push(modelViewMatrix);
    modelViewMatrix = mult(modelViewMatrix, scale4(10, .25, 3));
    gl.uniformMatrix4fv(modelViewMatrixLoc, false, flatten(modelViewMatrix));
    Scene.DrawObject("cube");
    modelViewMatrix = modelViewStack.pop();

    modelViewStack.push(modelViewMatrix);
    modelViewMatrix = mult(modelViewMatrix, translate(-4.875, -1.6, 1.375));
    modelViewMatrix = mult(modelViewMatrix, scale4(.25, 3, .25));
    gl.uniformMatrix4fv(modelViewMatrixLoc, false, flatten(modelViewMatrix));
    Scene.DrawObject("cube");
    modelViewMatrix = modelViewStack.pop();

    modelViewStack.push(modelViewMatrix);
    modelViewMatrix = mult(modelViewMatrix, translate(4.875, -1.5, 1.375));
    modelViewMatrix = mult(modelViewMatrix, scale4(.25, 3, .25));
    gl.uniformMatrix4fv(modelViewMatrixLoc, false, flatten(modelViewMatrix));
    Scene.DrawObject("cube");
    modelViewMatrix = modelViewStack.pop();

    modelViewStack.push(modelViewMatrix);
    modelViewMatrix = mult(modelViewMatrix, translate(4.875, -1.5, -1.375));
    modelViewMatrix = mult(modelViewMatrix, scale4(.25, 3, .25));
    gl.uniformMatrix4fv(modelViewMatrixLoc, false, flatten(modelViewMatrix));
    Scene.DrawObject("cube");
    modelViewMatrix = modelViewStack.pop();

    modelViewStack.push(modelViewMatrix);
    modelViewMatrix = mult(modelViewMatrix, translate(-4.875, -1.5, -1.375));
    modelViewMatrix = mult(modelViewMatrix, scale4(.25, 3, .25));
    gl.uniformMatrix4fv(modelViewMatrixLoc, false, flatten(modelViewMatrix));
    Scene.DrawObject("cube");
    modelViewMatrix = modelViewStack.pop();
}

function DrawRoom() {
    modelViewStack.push(modelViewMatrix);
    modelViewMatrix = mult(modelViewMatrix, translate(0, -4, 0));
    modelViewMatrix = mult(modelViewMatrix, scale4(20, .25, 20));
    gl.uniformMatrix4fv(modelViewMatrixLoc, false, flatten(modelViewMatrix));

    gl.uniform1i(gl.getUniformLocation(program, "texture"), 1);

    Scene.DrawObject("darkcube");
    modelViewMatrix = modelViewStack.pop();

    modelViewStack.push(modelViewMatrix);
    modelViewMatrix = mult(modelViewMatrix, translate(-9.875, 1, 0));
    modelViewMatrix = mult(modelViewMatrix, scale4(.25, 10, 20));
    gl.uniformMatrix4fv(modelViewMatrixLoc, false, flatten(modelViewMatrix));

    gl.uniform1i(gl.getUniformLocation(program, "texture"), 4);

    Scene.DrawObject("darkcube");
    modelViewMatrix = modelViewStack.pop();

    modelViewStack.push(modelViewMatrix);
    modelViewMatrix = mult(modelViewMatrix, translate(0, 1, -9.875));
    modelViewMatrix = mult(modelViewMatrix, scale4(20, 10, .25));
    gl.uniformMatrix4fv(modelViewMatrixLoc, false, flatten(modelViewMatrix));

    gl.uniform1i(gl.getUniformLocation(program, "texture"), 4);

    Scene.DrawObject("darkcube");
    modelViewMatrix = modelViewStack.pop();
}