'use strict';

// ---------- векторні допоміжні функції ----------
const vsub   = (a, b) => [a[0]-b[0], a[1]-b[1], a[2]-b[2]];
const vcross = (a, b) => [a[1]*b[2]-a[2]*b[1], a[2]*b[0]-a[0]*b[2], a[0]*b[1]-a[1]*b[0]];
const vdot   = (a, b) => a[0]*b[0] + a[1]*b[1] + a[2]*b[2];
const vlen   = a => Math.hypot(a[0], a[1], a[2]);

// кут при вершині P у трикутнику PQR
function angleAt(P, Q, R) {
    const a = vsub(Q, P), b = vsub(R, P);
    const la = vlen(a), lb = vlen(b);
    if (la < 1e-12 || lb < 1e-12) return 0;
    const c = Math.min(1, Math.max(-1, vdot(a, b) / (la * lb)));
    return Math.acos(c);
}

// Facet Angle Weighted average (варіант 15)
function angleWeightedNormals(positions, indices) {
    const normals = new Array(positions.length).fill(0);
    const P = k => [positions[3*k], positions[3*k+1], positions[3*k+2]];

    for (let t = 0; t < indices.length; t += 3) {
        const ia = indices[t], ib = indices[t+1], ic = indices[t+2];
        const A = P(ia), B = P(ib), C = P(ic);

        const n = vcross(vsub(B, A), vsub(C, A));
        const l = vlen(n);
        if (l < 1e-12) continue;                 // вироджений трикутник
        const nn = [n[0]/l, n[1]/l, n[2]/l];

        const w = [
            [ia, angleAt(A, B, C)],
            [ib, angleAt(B, C, A)],
            [ic, angleAt(C, A, B)],
        ];
        for (const [idx, ang] of w) {
            normals[3*idx]   += nn[0] * ang;
            normals[3*idx+1] += nn[1] * ang;
            normals[3*idx+2] += nn[2] * ang;
        }
    }

    for (let k = 0; k < normals.length; k += 3) {
        const l = Math.hypot(normals[k], normals[k+1], normals[k+2]) || 1;
        normals[k] /= l; normals[k+1] /= l; normals[k+2] /= l;
    }
    return normals;
}

// ---------- модель ----------
function Model(name) {
    this.name = name;
    this.iVertexBuffer = gl.createBuffer();
    this.iNormalBuffer = gl.createBuffer();
    this.iIndexBuffer  = gl.createBuffer();
    this.count = 0;

    this.BufferData = function (positions, normals, indices) {
        gl.bindBuffer(gl.ARRAY_BUFFER, this.iVertexBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(positions), gl.STATIC_DRAW);

        gl.bindBuffer(gl.ARRAY_BUFFER, this.iNormalBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(normals), gl.STATIC_DRAW);

        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.iIndexBuffer);
        gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(indices), gl.STATIC_DRAW);

        this.count = indices.length;
    }

    this.Draw = function () {
        gl.uniform4fv(shProgram.iColor, [0.3, 0.7, 1.0, 1]);

        gl.bindBuffer(gl.ARRAY_BUFFER, this.iVertexBuffer);
        gl.vertexAttribPointer(shProgram.iAttribVertex, 3, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(shProgram.iAttribVertex);

        gl.bindBuffer(gl.ARRAY_BUFFER, this.iNormalBuffer);
        gl.vertexAttribPointer(shProgram.iAttribNormal, 3, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(shProgram.iAttribNormal);

        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.iIndexBuffer);
        gl.drawElements(gl.TRIANGLES, this.count, gl.UNSIGNED_SHORT, 0);
    }
}