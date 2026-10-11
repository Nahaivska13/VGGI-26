'use strict';

let gl;                         // The webgl context.
let surface;                    // A surface model
let shProgram;                  // A shader program
let spaceball;                  // A TrackballRotator object that lets the user rotate the view by mouse.

function deg2rad(angle) {
    return angle * Math.PI / 180;
}


// Constructor
function ShaderProgram(name, program) {

    this.name = name;
    this.prog = program;

    // Location of the attribute variable in the shader program.
    this.iAttribVertex = -1;
    // Location of the uniform specifying a color for the primitive.
    this.iColor = -1;
    // Location of the uniform matrix representing the combined transformation.
    this.iModelViewProjectionMatrix = -1;

    this.Use = function() {
        gl.useProgram(this.prog);
    }
}


/* Draws the surface wireframe. */
function draw() {
    gl.clearColor(0,0,0,1);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    /* Set the values of the projection transformation */
    let projection = m4.perspective(Math.PI/8, 1, 8, 12);

    /* Get the view matrix from the TrackballRotator object.*/
    let modelView = spaceball.getViewMatrix();

    let rotateToPointZero = m4.axisRotation([0.707,0.707,0], 0.7);
    let translateToPointZero = m4.translation(0,0,-10);

    let matAccum0 = m4.multiply(rotateToPointZero, modelView );
    let matAccum1 = m4.multiply(translateToPointZero, matAccum0 );

    /* Multiply the projection matrix times the modelview matrix to give the
       combined transformation matrix, and send that to the shader program. */
    let modelViewProjection = m4.multiply(projection, matAccum1 );

    gl.uniformMatrix4fv(shProgram.iModelViewProjectionMatrix, false, modelViewProjection );

    // Colors of U and V polylines are set inside surface.Draw()
    surface.Draw();
}


// ---------------------------------------------------------------
// Variant 15: conical surface, directrix = Cartesian folium
// ---------------------------------------------------------------

// Cartesian folium x^3 + y^3 = 3axy, loop part: theta in [0, PI/2]
function folium(theta, a = 1) {
    const s = Math.sin(theta), c = Math.cos(theta);
    const r = 3 * a * s * c / (s ** 3 + c ** 3);
    return [r * c, r * s];
}

// Cone: apex V = (0, 0, h), directrix C(u) = (x(u), y(u), 0)
// P(u, v) = V + v * (C(u) - V),  u in [0, PI/2], v in [0, 1]
// The shift (-0.75, -0.75, -1) centers the figure at the origin.
function conePoint(u, v, h = 2) {
    const [x, y] = folium(u);
    return [v * x - 0.75, v * y - 0.75, h * (1 - v) - 1];
}

function CreateSurfaceData() {
    const nU = 40;      // number of U polylines
    const nV = 12;      // number of V polylines
    const steps = 60;   // segments in every polyline
    const uMax = Math.PI / 2;
    const uVertices = [], vVertices = [];

    // U polylines: u = const, v from 0 to 1
    for (let i = 0; i <= nU; i++) {
        const u = uMax * i / nU;
        for (let k = 0; k <= steps; k++) {
            uVertices.push(...conePoint(u, k / steps));
        }
    }

    // V polylines: v = const, u from 0 to PI/2
    for (let j = 0; j <= nV; j++) {
        const v = j / nV;
        for (let k = 0; k <= steps; k++) {
            vVertices.push(...conePoint(uMax * k / steps, v));
        }
    }

    return { uVertices, vVertices, pointsPerLine: steps + 1 };
}


/* Initialize the WebGL context. Called from init() */
function initGL() {
    let prog = createProgram( gl, vertexShaderSource, fragmentShaderSource );

    shProgram = new ShaderProgram('Basic', prog);
    shProgram.Use();

    shProgram.iAttribVertex              = gl.getAttribLocation(prog, "vertex");
    shProgram.iModelViewProjectionMatrix = gl.getUniformLocation(prog, "ModelViewProjectionMatrix");
    shProgram.iColor                     = gl.getUniformLocation(prog, "color");

    surface = new Model('Surface');
    let data = CreateSurfaceData();
    surface.BufferData(data.uVertices, data.vVertices, data.pointsPerLine);

    gl.enable(gl.DEPTH_TEST);
}


/* Creates a program for use in the WebGL context gl, and returns the
 * identifier for that program.  If an error occurs while compiling or
 * linking the program, an exception of type Error is thrown. */
function createProgram(gl, vShader, fShader) {
    let vsh = gl.createShader( gl.VERTEX_SHADER );
    gl.shaderSource(vsh,vShader);
    gl.compileShader(vsh);
    if ( ! gl.getShaderParameter(vsh, gl.COMPILE_STATUS) ) {
        throw new Error("Error in vertex shader:  " + gl.getShaderInfoLog(vsh));
     }
    let fsh = gl.createShader( gl.FRAGMENT_SHADER );
    gl.shaderSource(fsh, fShader);
    gl.compileShader(fsh);
    if ( ! gl.getShaderParameter(fsh, gl.COMPILE_STATUS) ) {
       throw new Error("Error in fragment shader:  " + gl.getShaderInfoLog(fsh));
    }
    let prog = gl.createProgram();
    gl.attachShader(prog,vsh);
    gl.attachShader(prog, fsh);
    gl.linkProgram(prog);
    if ( ! gl.getProgramParameter( prog, gl.LINK_STATUS) ) {
       throw new Error("Link error in program:  " + gl.getProgramInfoLog(prog));
    }
    return prog;
}


/**
 * initialization function that will be called when the page has loaded
 */
function init() {
    let canvas;
    try {
        canvas = document.getElementById("webglcanvas");
        gl = canvas.getContext("webgl");
        if ( ! gl ) {
            throw "Browser does not support WebGL";
        }
    }
    catch (e) {
        document.getElementById("canvas-holder").innerHTML =
            "<p>Sorry, could not get a WebGL graphics context.</p>";
        return;
    }
    try {
        initGL();  // initialize the WebGL graphics context
    }
    catch (e) {
        document.getElementById("canvas-holder").innerHTML =
            "<p>Sorry, could not initialize the WebGL graphics context: " + e + "</p>";
        return;
    }

    spaceball = new TrackballRotator(canvas, draw, 0);

    draw();
}