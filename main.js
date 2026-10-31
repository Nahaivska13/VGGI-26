'use strict';

let gl;                         // The webgl context.
let surface;                    // A surface model
let shProgram;                  // A shader program
let spaceball;                  // A TrackballRotator object that lets the user rotate the view by mouse.
let nU = 30;   
let nV = 30;   

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


function draw() {
    gl.clearColor(0, 0, 0, 1);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    let projection = m4.perspective(Math.PI/8, 1, 8, 12);
    let modelView = spaceball.getViewMatrix();

    let rotateToPointZero = m4.axisRotation([0.707, 0.707, 0], 0.7);
    let translateToPointZero = m4.translation(0, 0, -10);

    let matAccum0 = m4.multiply(rotateToPointZero, modelView);
    let matAccum1 = m4.multiply(translateToPointZero, matAccum0);   // ModelView
    let modelViewProjection = m4.multiply(projection, matAccum1);

    gl.uniformMatrix4fv(shProgram.iModelViewProjectionMatrix, false, modelViewProjection);
    gl.uniformMatrix4fv(shProgram.iModelViewMatrix, false, matAccum1);

    // у ModelView тільки обертання й зсув, тому normalMatrix = верхня ліва 3x3 частина
    const m = matAccum1;
    gl.uniformMatrix3fv(shProgram.iNormalMatrix, false,
        [m[0], m[1], m[2],  m[4], m[5], m[6],  m[8], m[9], m[10]]);

    // джерело світла рухається по колу, координати множимо на ModelView
    const t = performance.now() * 0.001;
    const lx = 2.5 * Math.cos(t), ly = 2.5 * Math.sin(t), lz = 2.0;
    const lightEye = [
        m[0]*lx + m[4]*ly + m[8]*lz  + m[12],
        m[1]*lx + m[5]*ly + m[9]*lz  + m[13],
        m[2]*lx + m[6]*ly + m[10]*lz + m[14],
    ];
    gl.uniform3fv(shProgram.iLightPos, lightEye);

    surface.Draw();
}

function animate() {
    draw();
    requestAnimationFrame(animate);
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
    const uMax = Math.PI / 2;
    const positions = [], indices = [];

    for (let i = 0; i <= nU; i++) {
        const u = uMax * i / nU;
        for (let j = 0; j <= nV; j++) {
            const v = j / nV;
            positions.push(...conePoint(u, v));
        }
    }

    for (let i = 0; i < nU; i++) {
        for (let j = 0; j < nV; j++) {
            const a = i * (nV + 1) + j;
            const b = a + 1;
            const c = a + (nV + 1);
            const d = c + 1;
            indices.push(a, b, c,  b, d, c);
        }
    }

    const normals = angleWeightedNormals(positions, indices);
    return { positions, normals, indices };
}

function rebuildSurface() {
    const data = CreateSurfaceData();
    surface.BufferData(data.positions, data.normals, data.indices);
}


function initGL() {
    let prog = createProgram(gl, vertexShaderSource, fragmentShaderSource);

    shProgram = new ShaderProgram('Phong', prog);
    shProgram.Use();

    shProgram.iAttribVertex              = gl.getAttribLocation(prog, "vertex");
    shProgram.iAttribNormal              = gl.getAttribLocation(prog, "normal");
    shProgram.iModelViewProjectionMatrix = gl.getUniformLocation(prog, "ModelViewProjectionMatrix");
    shProgram.iModelViewMatrix           = gl.getUniformLocation(prog, "ModelViewMatrix");
    shProgram.iNormalMatrix              = gl.getUniformLocation(prog, "NormalMatrix");
    shProgram.iLightPos                  = gl.getUniformLocation(prog, "lightPos");
    shProgram.iColor                     = gl.getUniformLocation(prog, "color");

    surface = new Model('Surface');
    rebuildSurface();

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

    document.getElementById("sliderU").oninput = e => { nU = +e.target.value; rebuildSurface(); };
    document.getElementById("sliderV").oninput = e => { nV = +e.target.value; rebuildSurface(); };

    animate();
}